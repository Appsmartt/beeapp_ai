#!/usr/bin/env python3
from __future__ import annotations

import getpass
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from secrets import token_urlsafe
from threading import Barrier

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ENV = PROJECT_ROOT / "Fronted" / ".env"
REPORT_DIRECTORY = PROJECT_ROOT / ".beeapp-work" / "explorations"
REPORT_PATH = REPORT_DIRECTORY / "qr_token_separation_live_report.txt"
REQUEST_TIMEOUT_SECONDS = 20
TEST_CYCLES = 10


def load_env_value(path: Path, key: str) -> str:
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() == key:
            return value.strip().strip('"').strip("'")
    raise RuntimeError(f"{key} was not found.")


def record(lines: list[str], name: str, passed: bool, detail: str) -> None:
    lines.append(
        f"[{'PASS' if passed else 'FAIL'}] {name}: {detail}"
    )


def request_json(
    session: requests.Session,
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    payload: dict | None = None,
) -> requests.Response:
    return session.request(
        method,
        url,
        headers=headers,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )


def activate(
    api_base_url: str,
    challenge_token: str,
    browser_nonce: str,
    barrier: Barrier,
) -> tuple[int, bool]:
    session = requests.Session()
    barrier.wait(timeout=REQUEST_TIMEOUT_SECONDS)
    response = request_json(
        session,
        "POST",
        f"{api_base_url}/accounts/web-session/activate/",
        headers={"Accept": "application/json"},
        payload={
            "challenge_token": challenge_token,
            "browser_nonce": browser_nonce,
        },
    )
    return (
        response.status_code,
        bool(session.cookies.get("beeapp_web_session", "")),
    )


def main() -> int:
    lines = [
        "BeeApp QR token separation live test",
        f"Executed at: {datetime.now(timezone.utc).isoformat()}",
        f"Cycles: {TEST_CYCLES}",
        "Secrets are excluded.",
        "",
    ]
    REPORT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    try:
        api_base_url = load_env_value(
            FRONTEND_ENV,
            "EXPO_PUBLIC_API_BASE_URL",
        ).rstrip("/")
        email = input("Correo de la cuenta de prueba: ").strip()
        password = getpass.getpass("Contraseña de la cuenta de prueba: ")

        if not email or not password:
            raise RuntimeError("Credentials are required.")

        client = requests.Session()
        headers = {"Accept": "application/json"}

        login = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/login/",
            headers=headers,
            payload={"email": email, "password": password},
        )
        access_token = (
            login.json().get("session", {}).get("access_token", "")
            if login.status_code == 200
            else ""
        )
        record(
            lines,
            "mobile login",
            bool(access_token),
            f"HTTP {login.status_code}",
        )

        if not access_token:
            REPORT_PATH.write_text("\n".join(lines) + "\n")
            return 1

        passed_cycles = 0

        for cycle in range(1, TEST_CYCLES + 1):
            nonce = token_urlsafe(32)
            invalid_nonce = token_urlsafe(32)

            created = request_json(
                client,
                "POST",
                f"{api_base_url}/accounts/qr-login/challenges/",
                headers=headers,
                payload={"browser_nonce": nonce},
            )
            challenge_token = (
                created.json().get("challenge_token", "")
                if created.status_code == 201
                else ""
            )

            if not challenge_token:
                record(
                    lines,
                    f"cycle {cycle}",
                    False,
                    f"challenge HTTP {created.status_code}",
                )
                continue

            csrf = requests.Session()
            csrf_response = request_json(
                csrf,
                "POST",
                f"{api_base_url}/accounts/web-session/activate/",
                headers={
                    **headers,
                    "Origin": "https://attacker.example",
                },
                payload={"challenge_token": challenge_token},
            )

            invalid = request_json(
                csrf,
                "POST",
                f"{api_base_url}/accounts/web-session/activate/",
                headers=headers,
                payload={
                    "challenge_token": challenge_token,
                    "browser_nonce": invalid_nonce,
                },
            )

            approved = request_json(
                client,
                "POST",
                f"{api_base_url}/accounts/qr-login/scan/",
                headers={
                    **headers,
                    "Authorization": f"Bearer {access_token}",
                },
                payload={"challenge_token": challenge_token},
            )

            browser = requests.Session()
            activated = request_json(
                browser,
                "POST",
                f"{api_base_url}/accounts/web-session/activate/",
                headers=headers,
                payload={
                    "challenge_token": challenge_token,
                    "browser_nonce": nonce,
                },
            )

            web_session_token = browser.cookies.get(
                "beeapp_web_session",
                "",
            )

            profile = request_json(
                browser,
                "GET",
                f"{api_base_url}/accounts/web-session/me/",
                headers=headers,
            )

            replay = request_json(
                browser,
                "POST",
                f"{api_base_url}/accounts/web-session/activate/",
                headers=headers,
                payload={
                    "challenge_token": challenge_token,
                    "browser_nonce": nonce,
                },
            )

            logout = request_json(
                browser,
                "POST",
                f"{api_base_url}/accounts/web-session/logout/",
                headers=headers,
            )

            cycle_ok = (
                csrf_response.status_code == 400
                and not csrf.cookies.get("beeapp_web_session", "")
                and invalid.status_code == 401
                and approved.status_code == 200
                and activated.status_code == 204
                and bool(web_session_token)
                and web_session_token != challenge_token
                and profile.status_code == 200
                and replay.status_code == 401
                and logout.status_code == 204
            )

            record(
                lines,
                f"cycle {cycle}",
                cycle_ok,
                (
                    f"csrf={csrf_response.status_code}; "
                    f"invalid_nonce={invalid.status_code}; "
                    f"approve={approved.status_code}; "
                    f"activate={activated.status_code}; "
                    f"profile={profile.status_code}; "
                    f"replay={replay.status_code}; "
                    f"logout={logout.status_code}; "
                    f"separate_token={bool(web_session_token) and web_session_token != challenge_token}"
                ),
            )

            if cycle_ok:
                passed_cycles += 1

            if cycle < TEST_CYCLES:
                time.sleep(7)

        race_nonce = token_urlsafe(32)
        race_created = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/qr-login/challenges/",
            headers=headers,
            payload={"browser_nonce": race_nonce},
        )
        race_token = (
            race_created.json().get("challenge_token", "")
            if race_created.status_code == 201
            else ""
        )

        race_approved = request_json(
            client,
            "POST",
            f"{api_base_url}/accounts/qr-login/scan/",
            headers={
                **headers,
                "Authorization": f"Bearer {access_token}",
            },
            payload={"challenge_token": race_token},
        ) if race_token else None

        race_results: list[tuple[int, bool]] = []
        if (
            race_token
            and race_approved
            and race_approved.status_code == 200
        ):
            barrier = Barrier(2)
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [
                    executor.submit(
                        activate,
                        api_base_url,
                        race_token,
                        race_nonce,
                        barrier,
                    )
                    for _ in range(2)
                ]
                race_results = [future.result() for future in futures]

        race_statuses = sorted(status for status, _ in race_results)
        race_ok = race_statuses == [204, 401]
        record(
            lines,
            "concurrent single-use activation",
            race_ok,
            f"statuses={race_statuses}",
        )

        passed = passed_cycles == TEST_CYCLES and race_ok
        lines.extend(
            [
                "",
                f"Passed cycles: {passed_cycles}/{TEST_CYCLES}",
                f"FINAL RESULT: {'PASS' if passed else 'FAIL'}",
            ]
        )
        REPORT_PATH.write_text("\n".join(lines) + "\n")
        return 0 if passed else 1
    except Exception as error:
        record(lines, "unexpected error", False, type(error).__name__)
        REPORT_PATH.write_text("\n".join(lines) + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
