#!/usr/bin/env python3
import getpass
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import requests
from supabase import ClientOptions, create_client

ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = ROOT / ".tmp" / "calendar_attendee_insert_rls_report.txt"


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


for env_path in (
    ROOT / "Fronted" / ".env",
    ROOT / "Fronted" / ".env.local",
    ROOT / "Backend" / "beeAppBack" / ".env",
):
    load_env_file(env_path)

SUPABASE_URL = (
    os.getenv("EXPO_PUBLIC_SUPABASE_URL")
    or os.getenv("SUPABASE_URL")
    or ""
).rstrip("/")
SUPABASE_ANON_KEY = (
    os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or ""
)

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise SystemExit(
        "Supabase URL or publishable key was not found in existing environment files."
    )

API_BASE_URL = (
    os.getenv("EXPO_PUBLIC_API_BASE_URL")
    or os.getenv("API_BASE_URL")
    or os.getenv("BACKEND_API_URL")
    or "https://beeappai-production.up.railway.app/api"
).rstrip("/")

organizer_email = input("Organizer email: ").strip()
organizer_password = getpass.getpass("Organizer password: ")
attacker_email = input("Attacker email: ").strip()
attacker_password = getpass.getpass("Attacker password: ")

if not all((organizer_email, organizer_password, attacker_email, attacker_password)):
    raise SystemExit("Both test accounts require email and password.")

results = []
created_event_id = None
created_calendar_id = None


def record(name: str, passed: bool, detail: str) -> None:
    results.append({"name": name, "passed": passed, "detail": detail})
    print(f"[{'PASS' if passed else 'FAIL'}] {name}: {detail}")


def api_request(method: str, path: str, token: str = "", payload=None, params=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.request(
        method=method,
        url=f"{API_BASE_URL}{path}",
        headers=headers,
        json=payload,
        params=params,
        timeout=45,
    )


def authenticate(email: str, password: str) -> tuple[str, str]:
    response = api_request(
        "POST",
        "/accounts/login/",
        payload={"email": email, "password": password},
    )
    if response.status_code != 200:
        raise RuntimeError(
            f"Authentication failed for {email}: "
            f"HTTP {response.status_code}: {response.text[:500]}"
        )

    body = response.json()
    session = body.get("session") or body.get("data", {}).get("session") or {}
    user = body.get("user") or body.get("data", {}).get("user") or {}
    token = session.get("access_token") or body.get("access_token")
    user_id = user.get("id")

    if not token or not user_id:
        raise RuntimeError(
            "Login response does not contain user id and access token."
        )

    return str(token), str(user_id)


def create_supabase_client(access_token: str):
    return create_client(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        options=ClientOptions(
            headers={
                "Authorization": f"Bearer {access_token}",
            }
        ),
    )


def direct_attendee_insert(access_token: str, event_id: str, attendee_user_id: str):
    client = create_supabase_client(access_token)
    return (
        client.table("calendar_event_attendees")
        .insert(
            {
                "event_id": event_id,
                "attendee_kind": "beeapp_user",
                "attendee_user_id": attendee_user_id,
                "is_organizer": False,
                "response_status": "pending",
                "metadata": {},
            }
        )
        .execute()
    )


def direct_attendee_rows(access_token: str, event_id: str, attendee_user_id: str):
    client = create_supabase_client(access_token)
    return (
        client.table("calendar_event_attendees")
        .select("id,event_id,attendee_user_id")
        .eq("event_id", event_id)
        .eq("attendee_user_id", attendee_user_id)
        .execute()
    )


def create_test_calendar(token: str) -> str:
    response = api_request(
        "POST",
        "/calendar/calendars/",
        token,
        payload={
            "name": f"RLS security test {uuid4()}",
            "description": "Temporary automated security validation.",
            "color": "#6025D2",
            "timezone": "America/Bogota",
        },
    )
    if response.status_code != 201:
        raise RuntimeError(
            f"Could not create test calendar: "
            f"HTTP {response.status_code}: {response.text[:500]}"
        )

    body = response.json()
    calendar = body.get("calendar") or body.get("data") or body
    if not isinstance(calendar, dict) or not calendar.get("id"):
        raise RuntimeError(
            f"Calendar id was not found in response: {body}"
        )

    return str(calendar["id"])


def extract_event_id(body: dict) -> str:
    event = body.get("event") or body.get("data") or body
    if not isinstance(event, dict) or not event.get("id"):
        raise RuntimeError(f"Event id was not found in response: {body}")
    return str(event["id"])


def cleanup(token: str) -> None:
    if created_event_id:
        response = api_request(
            "DELETE",
            f"/calendar/events/{created_event_id}/",
            token,
        )
        record(
            "cleanup_test_event",
            response.status_code in (200, 204),
            f"HTTP {response.status_code}: {response.text[:300]}",
        )

    if created_calendar_id:
        response = api_request(
            "DELETE",
            f"/calendar/calendars/{created_calendar_id}/",
            token,
        )
        record(
            "cleanup_test_calendar",
            response.status_code in (200, 204),
            f"HTTP {response.status_code}: {response.text[:300]}",
        )


try:
    organizer_token, organizer_id = authenticate(
        organizer_email,
        organizer_password,
    )
    attacker_token, attacker_id = authenticate(
        attacker_email,
        attacker_password,
    )
    record("authenticate_organizer", True, organizer_id)
    record("authenticate_attacker", True, attacker_id)

    created_calendar_id = create_test_calendar(organizer_token)
    organizer_calendar_id = created_calendar_id
    record("create_test_calendar", True, organizer_calendar_id)

    starts_at = (
        datetime.now(timezone.utc) + timedelta(days=7)
    ).replace(microsecond=0)
    ends_at = starts_at + timedelta(hours=1)

    response = api_request(
        "POST",
        "/calendar/events/",
        organizer_token,
        payload={
            "calendar_id": organizer_calendar_id,
            "title": f"RLS attendee security test {uuid4()}",
            "description": "Temporary automated security validation.",
            "event_kind": "virtual",
            "is_all_day": False,
            "starts_at": starts_at.isoformat().replace("+00:00", "Z"),
            "ends_at": ends_at.isoformat().replace("+00:00", "Z"),
            "timezone": "America/Bogota",
            "is_private": False,
            "notifications_enabled": False,
            "attendee_ids": [],
        },
    )
    if response.status_code != 201:
        raise RuntimeError(
            f"Could not create test event: "
            f"HTTP {response.status_code}: {response.text[:500]}"
        )

    created_event_id = extract_event_id(response.json())
    record("create_test_event", True, created_event_id)

    try:
        direct_attendee_insert(
            attacker_token,
            created_event_id,
            attacker_id,
        )
        record(
            "direct_rls_blocks_attacker_self_enrollment",
            False,
            "Direct INSERT unexpectedly succeeded.",
        )
    except Exception as error:
        record(
            "direct_rls_blocks_attacker_self_enrollment",
            True,
            str(error)[:500],
        )

    try:
        direct_rows_response = direct_attendee_rows(
            organizer_token,
            created_event_id,
            attacker_id,
        )
        direct_rows = getattr(direct_rows_response, "data", None) or []
        record(
            "direct_rls_creates_no_attacker_row",
            len(direct_rows) == 0,
            f"rows={len(direct_rows)}",
        )
    except Exception as error:
        record(
            "direct_rls_creates_no_attacker_row",
            False,
            str(error)[:500],
        )

    response = api_request(
        "GET",
        f"/calendar/events/{created_event_id}/attendees/",
        attacker_token,
    )
    record(
        "attacker_cannot_read_uninvited_event_attendees",
        response.status_code in (400, 403, 404),
        f"HTTP {response.status_code}: {response.text[:500]}",
    )

    response = api_request(
        "POST",
        f"/calendar/events/{created_event_id}/rsvp/",
        attacker_token,
        payload={"response_status": "accepted"},
    )
    record(
        "attacker_cannot_self_enroll_by_rsvp",
        response.status_code in (400, 403, 404),
        f"HTTP {response.status_code}: {response.text[:500]}",
    )

    response = api_request(
        "POST",
        f"/calendar/events/{created_event_id}/invitee-requests/",
        attacker_token,
        payload={
            "requested_user_id": organizer_id,
            "note": "Unauthorized access validation.",
        },
    )
    record(
        "attacker_cannot_submit_invitee_request",
        response.status_code in (400, 403, 404),
        f"HTTP {response.status_code}: {response.text[:500]}",
    )

    response = api_request(
        "PATCH",
        f"/calendar/events/{created_event_id}/",
        organizer_token,
        payload={"attendee_ids": [attacker_id]},
    )
    record(
        "organizer_can_invite_attacker",
        response.status_code == 200,
        f"HTTP {response.status_code}: {response.text[:500]}",
    )

    response = api_request(
        "POST",
        f"/calendar/events/{created_event_id}/rsvp/",
        attacker_token,
        payload={"response_status": "accepted"},
    )
    record(
        "invited_attacker_can_rsvp",
        response.status_code == 200,
        f"HTTP {response.status_code}: {response.text[:500]}",
    )

except Exception as error:
    record("test_execution", False, str(error))

finally:
    if "organizer_token" in locals():
        cleanup(organizer_token)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target": "calendar_event_attendees INSERT RLS",
        "api_base_url": API_BASE_URL,
        "results": results,
        "passed": bool(results) and all(
            result["passed"] for result in results
        ),
    }
    REPORT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Report written to {REPORT_PATH}")

    if not report["passed"]:
        sys.exit(1)
