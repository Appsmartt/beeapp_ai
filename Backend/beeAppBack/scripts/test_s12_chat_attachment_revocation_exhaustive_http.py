#!/usr/bin/env python3
import getpass
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ENV = ROOT / "Fronted/apps/mobile/.env"
REPORT_DIRECTORY = ROOT / ".beeapp-work"
PROJECT_REF = "elwnmmznlqihruveqlye"
BACKEND_URL = os.environ.get(
    "BEEAPP_BASE_URL",
    "http://127.0.0.1:8000",
).rstrip("/")
REQUEST_TIMEOUT_SECONDS = 40
CYCLE_COUNT = 3


def request(method, url, token=None, api_key=None, body=None, headers=None):
    request_headers = {"Accept": "application/json"}

    if api_key:
        request_headers["apikey"] = api_key

    if token:
        request_headers["Authorization"] = "Bearer " + token

    if headers:
        request_headers.update(headers)

    request_body = None
    if body is not None:
        if isinstance(body, bytes):
            request_body = body
        else:
            request_headers.setdefault("Content-Type", "application/json")
            request_body = json.dumps(body).encode("utf-8")

    request_object = urllib.request.Request(
        url,
        data=request_body,
        headers=request_headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(
            request_object,
            timeout=REQUEST_TIMEOUT_SECONDS,
        ) as response:
            return response.status, response.read(262144)
    except urllib.error.HTTPError as error:
        return error.code, error.read(262144)


def parse_json(raw):
    if not raw:
        return None
    return json.loads(raw.decode("utf-8"))


def json_request(method, path, token, body=None):
    status, raw = request(
        method,
        BACKEND_URL + path,
        token=token,
        body=body,
    )
    try:
        payload = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = None
    return status, payload


def load_frontend_config():
    if not FRONTEND_ENV.is_file():
        raise RuntimeError("FRONTEND_ENV_NOT_FOUND")

    values = {}
    pattern = re.compile(
        r"^\s*(?:export\s+)?"
        r"(EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_ANON_KEY)"
        r"\s*=\s*(.*?)\s*$"
    )

    for line in FRONTEND_ENV.read_text(
        encoding="utf-8"
    ).splitlines():
        match = pattern.match(line)
        if not match:
            continue
        value = match.group(2).strip()
        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in ("'", '"')
        ):
            value = value[1:-1]
        values[match.group(1)] = value

    supabase_url = values.get(
        "EXPO_PUBLIC_SUPABASE_URL",
        "",
    ).rstrip("/")
    public_key = values.get(
        "EXPO_PUBLIC_SUPABASE_ANON_KEY",
        "",
    )

    if (
        not supabase_url
        or not public_key
        or PROJECT_REF not in supabase_url
    ):
        raise RuntimeError("FRONTEND_ENV_CONFIGURATION_INVALID")

    return supabase_url, public_key


def login(email, password):
    status, payload = json_request(
        "POST",
        "/api/accounts/login/",
        None,
        {"email": email, "password": password},
    )

    if status != 200 or not isinstance(payload, dict):
        raise RuntimeError("LOGIN_FAILED_HTTP_" + str(status))

    session = payload.get("session")
    user = payload.get("user")

    if not isinstance(session, dict) or not isinstance(user, dict):
        raise RuntimeError("LOGIN_RESPONSE_INVALID")

    token = str(session.get("access_token") or "").strip()
    user_id = str(user.get("id") or "").strip()

    if not token or not user_id:
        raise RuntimeError("LOGIN_TOKEN_OR_USER_MISSING")

    return token, user_id


def get_profile_identity(token):
    status, payload = json_request(
        "GET",
        "/api/chat/identities/?active_only=true",
        token,
    )

    if status != 200 or not isinstance(payload, dict):
        raise RuntimeError(
            "CHAT_IDENTITIES_FAILED_HTTP_" + str(status)
        )

    identities = payload.get("identities")
    if not isinstance(identities, list):
        raise RuntimeError("CHAT_IDENTITIES_RESPONSE_INVALID")

    for identity in identities:
        if (
            isinstance(identity, dict)
            and identity.get("identity_type") == "profile"
            and identity.get("is_active") is True
            and identity.get("id")
        ):
            return str(identity["id"])

    raise RuntimeError("ACTIVE_PROFILE_IDENTITY_NOT_FOUND")


def assert_status(status, expected, label):
    if status not in expected:
        raise RuntimeError(
            label
            + "_HTTP_"
            + str(status)
            + "_EXPECTED_"
            + "_".join(str(value) for value in expected)
        )


def create_group(owner_token, owner_identity_id, label):
    status, payload = json_request(
        "POST",
        "/api/chat/groups/",
        owner_token,
        {
            "creator_identity_id": owner_identity_id,
            "name": "S12 " + label + " " + uuid.uuid4().hex[:12],
            "posting_policy": "all_members",
            "description": "Temporary S12 exhaustive security test.",
        },
    )

    assert_status(status, (201,), "GROUP_CREATE_FAILED")

    conversation = payload.get("conversation") if isinstance(
        payload,
        dict,
    ) else None

    if not isinstance(conversation, dict) or not conversation.get("id"):
        raise RuntimeError("GROUP_CREATE_RESPONSE_INVALID")

    return str(conversation["id"])


def invite_and_accept(
    owner_token,
    member_token,
    conversation_id,
    owner_identity_id,
    member_identity_id,
):
    status, payload = json_request(
        "POST",
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/invites/",
        owner_token,
        {
            "actor_identity_id": owner_identity_id,
            "invited_identity_id": member_identity_id,
        },
    )

    assert_status(status, (201,), "GROUP_INVITE_FAILED")

    invite = payload.get("invite") if isinstance(payload, dict) else None
    if not isinstance(invite, dict) or not invite.get("id"):
        raise RuntimeError("GROUP_INVITE_RESPONSE_INVALID")

    status, payload = json_request(
        "POST",
        "/api/chat/group-invites/"
        + quote(str(invite["id"]), safe="")
        + "/response/",
        member_token,
        {"accept": True},
    )

    if (
        status != 200
        or not isinstance(payload, dict)
        or payload.get("accepted") is not True
    ):
        raise RuntimeError(
            "GROUP_INVITE_ACCEPT_FAILED_HTTP_" + str(status)
        )


def upload_chat_attachment(
    owner_token,
    conversation_id,
    owner_identity_id,
    label,
):
    marker = uuid.uuid4().hex
    boundary = "beeapp-s12-" + marker
    filename = "s12-" + label + "-" + marker + ".txt"
    content = (
        "BeeApp S12 exhaustive security test "
        + marker
        + "\n"
    ).encode("utf-8")

    fields = [
        ("sender_identity_id", owner_identity_id),
        ("message_type", "document"),
        ("body", "S12 " + label + " attachment"),
        (
            "metadata",
            json.dumps(
                {
                    "s12_test": True,
                    "scenario": label,
                    "marker": marker,
                },
                separators=(",", ":"),
            ),
        ),
    ]

    parts = []
    for name, value in fields:
        parts.extend(
            [
                ("--" + boundary + "\r\n").encode("utf-8"),
                (
                    'Content-Disposition: form-data; name="'
                    + name
                    + '"\r\n\r\n'
                ).encode("utf-8"),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )

    parts.extend(
        [
            ("--" + boundary + "\r\n").encode("utf-8"),
            (
                'Content-Disposition: form-data; name="file"; '
                'filename="'
                + filename
                + '"\r\n'
            ).encode("utf-8"),
            b"Content-Type: text/plain\r\n\r\n",
            content,
            b"\r\n",
            ("--" + boundary + "--\r\n").encode("utf-8"),
        ]
    )

    status, raw = request(
        "POST",
        BACKEND_URL
        + "/api/chat/conversations/"
        + quote(conversation_id, safe="")
        + "/attachments/",
        token=owner_token,
        headers={
            "Content-Type": (
                "multipart/form-data; boundary=" + boundary
            )
        },
        body=b"".join(parts),
    )

    try:
        payload = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        payload = None

    assert_status(status, (201,), "ATTACHMENT_UPLOAD_FAILED")

    message = payload.get("message") if isinstance(payload, dict) else None
    file_record = payload.get("file") if isinstance(payload, dict) else None

    if not isinstance(message, dict) or not isinstance(
        file_record,
        dict,
    ):
        raise RuntimeError("ATTACHMENT_UPLOAD_RESPONSE_INVALID")

    message_id = str(message.get("id") or "").strip()
    file_id = str(file_record.get("id") or "").strip()

    if not message_id or not file_id:
        raise RuntimeError("ATTACHMENT_IDENTIFIERS_MISSING")

    return message_id, file_id


def get_share_rows(
    supabase_url,
    public_key,
    token,
    file_id,
    recipient_user_id,
):
    endpoint = (
        supabase_url
        + "/rest/v1/file_shares?select="
        + quote(
            (
                "id,file_id,shared_by_user_id,shared_with_user_id,"
                "revoked_at,share_source,source_conversation_id,"
                "source_message_id"
            ),
            safe=",",
        )
        + "&file_id=eq."
        + quote(file_id, safe="")
        + "&shared_with_user_id=eq."
        + quote(recipient_user_id, safe="")
    )

    status, raw = request(
        "GET",
        endpoint,
        token=token,
        api_key=public_key,
    )

    try:
        rows = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        rows = None

    if status != 200 or not isinstance(rows, list):
        raise RuntimeError(
            "FILE_SHARE_QUERY_FAILED_HTTP_" + str(status)
        )

    return rows


def assert_chat_share(
    rows,
    conversation_id,
    message_id,
    expected_revoked,
):
    matches = [
        row
        for row in rows
        if (
            isinstance(row, dict)
            and row.get("share_source") == "chat_attachment"
            and str(row.get("source_conversation_id") or "")
            == conversation_id
            and str(row.get("source_message_id") or "")
            == message_id
        )
    ]

    if len(matches) != 1:
        raise RuntimeError("CHAT_SHARE_NOT_UNIQUELY_IDENTIFIED")

    revoked_at = matches[0].get("revoked_at")
    if expected_revoked and not revoked_at:
        raise RuntimeError("CHAT_SHARE_NOT_REVOKED")
    if not expected_revoked and revoked_at:
        raise RuntimeError("CHAT_SHARE_UNEXPECTEDLY_REVOKED")


def assert_file_rest_access(
    supabase_url,
    public_key,
    token,
    file_id,
    expected_access,
):
    endpoint = (
        supabase_url
        + "/rest/v1/files?select=id&id=eq."
        + quote(file_id, safe="")
    )

    status, raw = request(
        "GET",
        endpoint,
        token=token,
        api_key=public_key,
    )

    try:
        rows = parse_json(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        rows = None

    if status != 200 or not isinstance(rows, list):
        raise RuntimeError(
            "FILES_REST_QUERY_FAILED_HTTP_" + str(status)
        )

    has_access = len(rows) == 1
    if has_access != expected_access:
        raise RuntimeError(
            "FILES_REST_ACCESS_EXPECTATION_FAILED_"
            + ("EXPECTED_ACCESS" if expected_access else "EXPECTED_DENIAL")
        )


def assert_storage_access(
    token,
    file_id,
    expected_access,
):
    status, _ = json_request(
        "GET",
        "/api/storage/files/"
        + quote(file_id, safe="")
        + "/access/?download=false",
        token,
    )

    if expected_access:
        assert_status(status, (200,), "STORAGE_ACCESS_FAILED")
    else:
        assert_status(
            status,
            (400, 404),
            "STORAGE_ACCESS_NOT_DENIED",
        )


def assert_chat_attachment_access(
    token,
    message_id,
    identity_id,
    expected_access,
):
    status, _ = json_request(
        "GET",
        "/api/chat/messages/"
        + quote(message_id, safe="")
        + "/attachment/access/?identity_id="
        + quote(identity_id, safe="")
        + "&download=false",
        token,
    )

    if expected_access:
        assert_status(status, (200,), "CHAT_ACCESS_FAILED")
    else:
        assert_status(
            status,
            (403, 404),
            "CHAT_ACCESS_NOT_DENIED",
        )


def leave_group(member_token, conversation_id, member_identity_id):
    status, _ = json_request(
        "POST",
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/leave/",
        member_token,
        {"identity_id": member_identity_id},
    )
    assert_status(status, (204,), "GROUP_LEAVE_FAILED")


def remove_member(
    owner_token,
    conversation_id,
    owner_identity_id,
    member_identity_id,
):
    status, _ = json_request(
        "DELETE",
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/participants/"
        + quote(member_identity_id, safe="")
        + "/",
        owner_token,
        {"actor_identity_id": owner_identity_id},
    )
    assert_status(status, (204,), "GROUP_REMOVAL_FAILED")


def deactivate_group(
    owner_token,
    conversation_id,
    owner_identity_id,
):
    status, _ = json_request(
        "DELETE",
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
        + "/",
        owner_token,
        {"owner_identity_id": owner_identity_id},
    )
    assert_status(status, (204, 400, 404), "GROUP_CLEANUP_FAILED")


def append_result(results, scenario, assertion):
    results.append(
        "PASS | " + scenario + " | " + assertion
    )


def run_departure_cycle(
    departure_kind,
    cycle_number,
    supabase_url,
    public_key,
    owner_token,
    owner_user_id,
    owner_identity_id,
    member_token,
    member_user_id,
    member_identity_id,
    results,
    created_groups,
):
    scenario = departure_kind + "_cycle_" + str(cycle_number)

    conversation_id = create_group(
        owner_token,
        owner_identity_id,
        scenario,
    )
    created_groups.append(conversation_id)

    invite_and_accept(
        owner_token,
        member_token,
        conversation_id,
        owner_identity_id,
        member_identity_id,
    )

    message_id, file_id = upload_chat_attachment(
        owner_token,
        conversation_id,
        owner_identity_id,
        scenario,
    )

    rows = get_share_rows(
        supabase_url,
        public_key,
        member_token,
        file_id,
        member_user_id,
    )
    assert_chat_share(
        rows,
        conversation_id,
        message_id,
        expected_revoked=False,
    )
    append_result(results, scenario, "active chat share exists")

    assert_chat_attachment_access(
        member_token,
        message_id,
        member_identity_id,
        expected_access=True,
    )
    assert_storage_access(
        member_token,
        file_id,
        expected_access=True,
    )
    assert_file_rest_access(
        supabase_url,
        public_key,
        member_token,
        file_id,
        expected_access=True,
    )
    append_result(
        results,
        scenario,
        "active participant passes chat storage and RLS access",
    )

    if departure_kind == "leave":
        leave_group(
            member_token,
            conversation_id,
            member_identity_id,
        )
    else:
        remove_member(
            owner_token,
            conversation_id,
            owner_identity_id,
            member_identity_id,
        )

    time.sleep(1)

    rows = get_share_rows(
        supabase_url,
        public_key,
        member_token,
        file_id,
        member_user_id,
    )
    assert_chat_share(
        rows,
        conversation_id,
        message_id,
        expected_revoked=True,
    )
    append_result(
        results,
        scenario,
        "chat attachment share is revoked",
    )

    assert_chat_attachment_access(
        member_token,
        message_id,
        member_identity_id,
        expected_access=False,
    )
    assert_storage_access(
        member_token,
        file_id,
        expected_access=False,
    )
    assert_file_rest_access(
        supabase_url,
        public_key,
        member_token,
        file_id,
        expected_access=False,
    )
    append_result(
        results,
        scenario,
        "departed participant is denied by chat storage and RLS",
    )

    owner_rows = get_share_rows(
        supabase_url,
        public_key,
        owner_token,
        file_id,
        owner_user_id,
    )
    if owner_rows:
        raise RuntimeError("OWNER_UNEXPECTEDLY_HAS_FILE_SHARE")

    assert_storage_access(
        owner_token,
        file_id,
        expected_access=True,
    )
    append_result(
        results,
        scenario,
        "owner retains access without recipient share",
    )


def write_report(results):
    REPORT_DIRECTORY.mkdir(exist_ok=True)

    report_path = REPORT_DIRECTORY / (
        "s12_chat_attachment_revocation_exhaustive_"
        + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        + ".txt"
    )

    ignored = subprocess.run(
        [
            "git",
            "-C",
            str(ROOT),
            "check-ignore",
            "-q",
            str(report_path),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )

    if ignored.returncode != 0:
        raise RuntimeError("REPORT_DIRECTORY_NOT_IGNORED")

    descriptor = os.open(
        report_path,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL,
        0o600,
    )

    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        output.write(
            "S12 exhaustive chat attachment revocation report\n"
        )
        output.write(
            "Generated UTC: "
            + datetime.now(timezone.utc).isoformat()
            + "\n"
        )
        output.write(
            "Cycles per departure mode: "
            + str(CYCLE_COUNT)
            + "\n\n"
        )
        output.write("\n".join(results) + "\n")

    if report_path.stat().st_size <= 0:
        raise RuntimeError("REPORT_EMPTY")

    return report_path


def main():
    results = []
    created_groups = []
    owner_token = None
    owner_identity_id = None

    try:
        supabase_url, public_key = load_frontend_config()

        health_status, health_payload = json_request(
            "GET",
            "/api/health/",
            None,
        )
        if (
            health_status != 200
            or not isinstance(health_payload, dict)
            or health_payload.get("status") != "ok"
        ):
            raise RuntimeError("BACKEND_NOT_HEALTHY")

        append_result(results, "precondition", "backend health")

        owner_email = input("Owner account email: ").strip()
        owner_password = getpass.getpass(
            "Owner account password: "
        )
        owner_token, owner_user_id = login(
            owner_email,
            owner_password,
        )
        del owner_email, owner_password

        member_email = input("Member account email: ").strip()
        member_password = getpass.getpass(
            "Member account password: "
        )
        member_token, member_user_id = login(
            member_email,
            member_password,
        )
        del member_email, member_password

        if owner_user_id == member_user_id:
            raise RuntimeError("DISTINCT_TEST_ACCOUNTS_REQUIRED")

        owner_identity_id = get_profile_identity(owner_token)
        member_identity_id = get_profile_identity(member_token)

        append_result(
            results,
            "precondition",
            "two distinct active profile identities",
        )

        for departure_kind in ("leave", "removal"):
            for cycle_number in range(1, CYCLE_COUNT + 1):
                run_departure_cycle(
                    departure_kind,
                    cycle_number,
                    supabase_url,
                    public_key,
                    owner_token,
                    owner_user_id,
                    owner_identity_id,
                    member_token,
                    member_user_id,
                    member_identity_id,
                    results,
                    created_groups,
                )

    except (
        RuntimeError,
        ValueError,
        KeyError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        urllib.error.URLError,
        TimeoutError,
    ) as error:
        results.append(
            "FAIL | execution | "
            + type(error).__name__
            + " | "
            + str(error)
        )

    finally:
        if owner_token and owner_identity_id:
            for conversation_id in reversed(created_groups):
                try:
                    deactivate_group(
                        owner_token,
                        conversation_id,
                        owner_identity_id,
                    )
                except Exception:
                    results.append(
                        "FAIL | cleanup | group deactivation failed"
                    )

    report_path = write_report(results)
    failures = sum(
        1 for result in results
        if not result.startswith("PASS |")
    )

    print(
        "S12 exhaustive result: "
        + str(len(results) - failures)
        + " passed; "
        + str(failures)
        + " failed. Report: "
        + str(report_path)
    )

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
