#!/usr/bin/env python3
from __future__ import annotations

import getpass
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from threading import Barrier
from pathlib import Path
from secrets import token_urlsafe

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ENV = PROJECT_ROOT / "Fronted" / ".env"
REPORT_DIRECTORY = PROJECT_ROOT / ".beeapp-work" / "explorations"
REPORT_PATH = REPORT_DIRECTORY / "v4_qr_csrf_live_report.txt"
REQUEST_TIMEOUT_SECONDS = 20
CSRF_CYCLES = 20


def load_env_value(path: Path, key: str) -> str:
    if not path.is_file():
        raise RuntimeError("Frontend environment file was not found.")

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        name, value = line.split("=", 1)

        if name.strip() != key:
            continue

        normalized = value.strip().strip("\"").strip("'")

        if normalized:
            return normalized

    raise RuntimeError(f"{key} was not found in the frontend environment.")


def write_report(lines: list[str]) -> None:
    REPORT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines) + "\n")


def record(
    lines: list[str],
    *,
    name: str,
    passed: bool,
    detail: str,
) -> None:
    status = "PASS" if passed else "FAIL"
    lines.append(f"[{status}] {name}: {detail}")


def request_json(
    session: requests.Session,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    payload: dict | None = None,
) -> requests.Response:
    return session.request(
        method=method,
        url=url,
        headers=headers,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )


def activate_race_request(
    api_base_url: str,
    headers: dict[str, str],
    challenge_token: str,
    browser_nonce: str,
    barrier: Barrier,
) -> tuple[int, bool, requests.Session]:
    session = requests.Session()
    barrier.wait(timeout=REQUEST_TIMEOUT_SECONDS)
    response = request_json(
        session,
        "POST",
        f"{api_base_url}/accounts/web-session/activate/",
        headers=headers,
        payload={
            "challenge_token": challenge_token,
            "browser_nonce": browser_nonce,
        },
    )
    return (
        response.status_code,
        "beeapp_web_session" in session.cookies,
        session,
    )


def main() -> int:
    report_lines = [
        "BeeApp V4 QR Login CSRF live test",
        f"Executed at: {datetime.now(timezone.utc).isoformat()}",
        f"CSRF cycles: {CSRF_CYCLES}",
        "Sensitive values are intentionally excluded.",
        "",
    ]

    try:
        api_base_url = load_env_value(
            FRONTEND_ENV,
            "EXPO_PUBLIC_API_BASE_URL",
        ).rstrip("/")
    except Exception as error:
        record(
            report_lines,
            name="environment",
            passed=False,
            detail=str(error),
        )
        write_report(report_lines)
        return 1

    email = input("Correo de la cuenta de prueba: ").strip()
    password = getpass.getpass("Contraseña de la cuenta de prueba: ")

    if not email or not password:
        record(
            report_lines,
            name="credentials",
            passed=False,
            detail="Email and password are required.",
        )
        write_report(report_lines)
        return 1

    client = requests.Session()
    csrf_client = requests.Session()
    headers = {"Accept": "application/json"}

    try:
        login_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/login/",
            headers=headers,
            payload={
                "email": email,
                "password": password,
            },
        )
        login_ok = login_response.status_code == 200
        record(
            report_lines,
            name="mobile login",
            passed=login_ok,
            detail=f"HTTP {login_response.status_code}",
        )

        if not login_ok:
            write_report(report_lines)
            return 1

        access_token = (
            login_response.json()
            .get("session", {})
            .get("access_token", "")
        )

        if not access_token:
            record(
                report_lines,
                name="mobile access token",
                passed=False,
                detail="Login response did not include access token.",
            )
            write_report(report_lines)
            return 1

        valid_nonce = token_urlsafe(32)
        wrong_nonce = token_urlsafe(32)

        create_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/qr-login/challenges/",
            headers=headers,
            payload={"browser_nonce": valid_nonce},
        )
        create_ok = create_response.status_code == 201
        record(
            report_lines,
            name="create QR challenge",
            passed=create_ok,
            detail=f"HTTP {create_response.status_code}",
        )

        if not create_ok:
            write_report(report_lines)
            return 1

        challenge_token = create_response.json().get(
            "challenge_token",
            "",
        )

        if not challenge_token:
            record(
                report_lines,
                name="challenge token",
                passed=False,
                detail="Challenge response did not include token.",
            )
            write_report(report_lines)
            return 1

        csrf_response = request_json(
            csrf_client,
            "POST",
            f"{api_base_url}/accounts/web-session/activate/",
            headers={
                **headers,
                "Origin": "https://attacker.example",
            },
            payload={"challenge_token": challenge_token},
        )
        csrf_ok = (
            csrf_response.status_code == 400
            and "beeapp_web_session" not in csrf_client.cookies
        )
        record(
            report_lines,
            name="cross-site request without nonce",
            passed=csrf_ok,
            detail=f"HTTP {csrf_response.status_code}; cookie absent",
        )

        wrong_nonce_response = request_json(
            csrf_client,
            "POST",
            f"{api_base_url}/accounts/web-session/activate/",
            headers={
                **headers,
                "Origin": "https://attacker.example",
            },
            payload={
                "challenge_token": challenge_token,
                "browser_nonce": wrong_nonce,
            },
        )
        wrong_nonce_ok = (
            wrong_nonce_response.status_code == 401
            and "beeapp_web_session" not in csrf_client.cookies
        )
        record(
            report_lines,
            name="cross-site request with wrong nonce",
            passed=wrong_nonce_ok,
            detail=(
                f"HTTP {wrong_nonce_response.status_code}; "
                "cookie absent"
            ),
        )

        csrf_cycles_ok = True

        for _ in range(CSRF_CYCLES):
            response = request_json(
                csrf_client,
                "POST",
                f"{api_base_url}/accounts/web-session/activate/",
                headers={
                    **headers,
                    "Origin": "https://attacker.example",
                },
                payload={"challenge_token": challenge_token},
            )

            if (
                response.status_code != 400
                or "beeapp_web_session" in csrf_client.cookies
            ):
                csrf_cycles_ok = False
                break

        record(
            report_lines,
            name="repeated cross-site requests without nonce",
            passed=csrf_cycles_ok,
            detail=f"{CSRF_CYCLES} cycles; cookie absent",
        )

        approve_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/qr-login/scan/",
            headers={
                **headers,
                "Authorization": f"Bearer {access_token}",
            },
            payload={"challenge_token": challenge_token},
        )
        approve_ok = approve_response.status_code == 200
        record(
            report_lines,
            name="mobile QR approval",
            passed=approve_ok,
            detail=f"HTTP {approve_response.status_code}",
        )

        if not approve_ok:
            write_report(report_lines)
            return 1

        activate_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/web-session/activate/",
            headers=headers,
            payload={
                "challenge_token": challenge_token,
                "browser_nonce": valid_nonce,
            },
        )
        web_session_cookie = client.cookies.get(
            "beeapp_web_session",
            "",
        )
        activation_ok = (
            activate_response.status_code == 204
            and bool(web_session_cookie)
            and web_session_cookie != challenge_token
        )
        record(
            report_lines,
            name="valid browser activation",
            passed=activation_ok,
            detail=(
                f"HTTP {activate_response.status_code}; "
                "independent cookie present"
            ),
        )

        profile_response = request_json(
            client,
            "GET",
            f"{api_base_url}/accounts/web-session/me/",
            headers=headers,
        )
        profile_ok = profile_response.status_code == 200
        record(
            report_lines,
            name="web session profile",
            passed=profile_ok,
            detail=f"HTTP {profile_response.status_code}",
        )

        replay_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/web-session/activate/",
            headers=headers,
            payload={
                "challenge_token": challenge_token,
                "browser_nonce": valid_nonce,
            },
        )
        replay_ok = replay_response.status_code == 401
        record(
            report_lines,
            name="activation replay",
            passed=replay_ok,
            detail=f"HTTP {replay_response.status_code}",
        )

        logout_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/web-session/logout/",
            headers=headers,
        )
        logout_ok = logout_response.status_code == 204
        record(
            report_lines,
            name="web session cleanup",
            passed=logout_ok,
            detail=f"HTTP {logout_response.status_code}",
        )

        race_nonce = token_urlsafe(32)
        race_create_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/qr-login/challenges/",
            headers=headers,
            payload={"browser_nonce": race_nonce},
        )
        race_create_ok = race_create_response.status_code == 201
        race_challenge_token = (
            race_create_response.json().get("challenge_token", "")
            if race_create_ok
            else ""
        )

        race_approve_response = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/qr-login/scan/",
            headers={
                **headers,
                "Authorization": f"Bearer {access_token}",
            },
            payload={"challenge_token": race_challenge_token},
        ) if race_challenge_token else None
        race_approve_ok = (
            race_approve_response is not None
            and race_approve_response.status_code == 200
        )

        race_results = []
        if race_create_ok and race_challenge_token and race_approve_ok:
            barrier = Barrier(2)
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [
                    executor.submit(
                        activate_race_request,
                        api_base_url,
                        headers,
                        race_challenge_token,
                        race_nonce,
                        barrier,
                    )
                    for _ in range(2)
                ]
                race_results = [future.result() for future in futures]

        race_statuses = sorted(result[0] for result in race_results)
        race_successes = sum(
            status == 204 and cookie_present
            for status, cookie_present, _ in race_results
        )
        race_failures = sum(
            status == 401 and not cookie_present
            for status, cookie_present, _ in race_results
        )
        race_ok = (
            race_create_ok
            and race_approve_ok
            and race_statuses == [204, 401]
            and race_successes == 1
            and race_failures == 1
        )
        record(
            report_lines,
            name="concurrent activation single-use",
            passed=race_ok,
            detail=(
                f"create HTTP {race_create_response.status_code}; "
                f"approve HTTP "
                f"{race_approve_response.status_code if race_approve_response else 'N/A'}; "
                f"activation statuses {race_statuses}"
            ),
        )

        for _, cookie_present, session in race_results:
            if cookie_present:
                request_json(
                    session,
                    "POST",
                    f"{api_base_url}/accounts/web-session/logout/",
                    headers=headers,
                )

        all_passed = all(
            line.startswith("[PASS]")
            for line in report_lines
            if line.startswith("[")
        )
        report_lines.append("")
        report_lines.append(
            "FINAL RESULT: PASS"
            if all_passed
            else "FINAL RESULT: FAIL"
        )
        write_report(report_lines)

        return 0 if all_passed else 1
    except requests.RequestException as error:
        record(
            report_lines,
            name="network request",
            passed=False,
            detail=type(error).__name__,
        )
        write_report(report_lines)
        return 1
    except Exception as error:
        record(
            report_lines,
            name="unexpected error",
            passed=False,
            detail=type(error).__name__,
        )
        write_report(report_lines)
        return 1
    finally:
        password = ""
        if "access_token" in locals():
            access_token = ""


if __name__ == "__main__":
    sys.exit(main())
