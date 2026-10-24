#!/usr/bin/env python3
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = PROJECT_ROOT / ".beeapp-work"
ENDPOINT = "/api/accounts/password-reset/request/"
TEST_PHONE = "+573000000000"


def request_json(api_base_url, forwarded_for):
    request = Request(
        api_base_url + ENDPOINT,
        data=json.dumps({"phone": TEST_PHONE}).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Forwarded-For": forwarded_for,
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")
    except URLError as error:
        raise RuntimeError(f"Network error: {error.reason}") from error


def main():
    api_base_url = os.environ.get("BEEAPP_API_BASE_URL")
    if not api_base_url:
        raise RuntimeError("Missing BEEAPP_API_BASE_URL.")

    api_base_url = api_base_url.rstrip("/")
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    results = []

    for sequence in range(1, 5):
        status_code, body = request_json(
            api_base_url,
            f"198.51.100.{sequence}, 192.0.2.{sequence}",
        )
        results.append((sequence, status_code, body[:500]))
        time.sleep(1)

    expected_statuses = [200, 200, 200, 429]
    actual_statuses = [status_code for _, status_code, _ in results]
    passed = actual_statuses == expected_statuses
    report_lines = [
        "OTP THROTTLE LIVE TEST REPORT",
        f"Timestamp UTC: {datetime.now(timezone.utc).isoformat()}",
        f"Endpoint: {ENDPOINT}",
        f"Expected statuses: {expected_statuses}",
        f"Actual statuses: {actual_statuses}",
        f"Result: {'PASS' if passed else 'FAIL'}",
        "",
    ]
    for sequence, status_code, body in results:
        report_lines.extend([
            f"Request {sequence}: HTTP {status_code}",
            f"Response: {body}",
            "",
        ])

    (REPORT_DIR / "otp_throttle_live_report.txt").write_text(
        "\n".join(report_lines),
        encoding="utf-8",
    )
    return 0 if passed else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"Live test setup failed: {error}", file=sys.stderr)
        sys.exit(2)
