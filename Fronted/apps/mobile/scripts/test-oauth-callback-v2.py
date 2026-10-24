#!/usr/bin/env python3
import getpass
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MOBILE_ENV = ROOT / "Fronted/apps/mobile/.env"
REPORT_DIRECTORY = ROOT / ".beeapp-work"
REPORT_PATH = REPORT_DIRECTORY / "oauth_callback_v2_real_backend_report.txt"


def load_env(path):
    values = {}

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.removeprefix("export ").split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


class NoRedirectHandler(
    urllib.request.HTTPRedirectHandler,
):
    def redirect_request(
        self,
        request,
        fp,
        code,
        message,
        headers,
        new_url,
    ):
        return None


def request(
    method,
    url,
    headers=None,
    body=None,
    follow_redirects=True,
):
    encoded_body = (
        json.dumps(body).encode("utf-8")
        if body is not None
        else None
    )

    request_headers = {
        "Accept": "application/json",
        **(headers or {}),
    }

    if encoded_body is not None:
        request_headers["Content-Type"] = "application/json"

    http_request = urllib.request.Request(
        url,
        data=encoded_body,
        headers=request_headers,
        method=method,
    )

    try:
        opener = (
            urllib.request.build_opener()
            if follow_redirects
            else urllib.request.build_opener(NoRedirectHandler())
        )

        with opener.open(
            http_request,
            timeout=20,
        ) as response:
            raw_body = response.read(65536)
            parsed_body = (
                json.loads(raw_body)
                if raw_body
                else None
            )
            return response.status, parsed_body, dict(response.headers)
    except urllib.error.HTTPError as error:
        raw_body = error.read(4096)

        try:
            parsed_body = json.loads(raw_body)
        except (ValueError, UnicodeDecodeError):
            parsed_body = None

        return error.code, parsed_body, dict(error.headers)


def require(condition, message, results):
    results.append(
        ("PASS " if condition else "FAIL ") + message
    )

    if not condition:
        raise RuntimeError(message)


def normalize_local_api_url(api_url):
    parsed = urllib.parse.urlparse(api_url)

    if (
        parsed.scheme == "http"
        and parsed.hostname == "192.168.1.5"
        and parsed.port == 8000
    ):
        parsed = parsed._replace(netloc="127.0.0.1:8000")

    return parsed.geturl().rstrip("/")


def main():
    results = [
        "OAuth Callback V2 real backend validation",
        "Started UTC: "
        + datetime.now(timezone.utc).isoformat(),
    ]

    try:
        config = load_env(MOBILE_ENV)
        api_url = normalize_local_api_url(
            config.get("EXPO_PUBLIC_API_BASE_URL", "")
        )

        require(
            api_url.endswith("/api"),
            "mobile environment exposes an API base path",
            results,
        )

        health_status, health_body, _ = request(
            "GET",
            api_url + "/health/",
        )

        require(
            health_status == 200
            and isinstance(health_body, dict)
            and health_body.get("status") == "ok",
            "local backend health endpoint is available",
            results,
        )

        email = input("Email de cuenta de prueba: ").strip()
        password = getpass.getpass(
            "Contraseña (no se mostrará): "
        )

        login_status, login_body, _ = request(
            "POST",
            api_url + "/accounts/login/",
            body={
                "email": email,
                "password": password,
            },
        )

        require(
            login_status == 200
            and isinstance(login_body, dict)
            and isinstance(login_body.get("session"), dict)
            and bool(
                login_body["session"].get("access_token")
            ),
            "mobile login against local backend succeeds",
            results,
        )

        access_token = login_body["session"]["access_token"]
        headers = {
            "Authorization": "Bearer " + access_token,
        }

        catalog_status, catalog_body, _ = request(
            "GET",
            api_url + "/integrations/catalog/",
            headers=headers,
        )

        require(
            catalog_status == 200
            and isinstance(catalog_body, dict)
            and isinstance(catalog_body.get("providers"), list),
            "authenticated integration catalog is available",
            results,
        )

        start_status, start_body, _ = request(
            "POST",
            api_url
            + "/integrations/connections/google/authorize/",
            headers=headers,
            body={
                "capabilities": ["calendar", "mail"],
                "client_channel": "mobile",
            },
        )

        required_start_fields = {
            "request_id",
            "authorization_url",
            "browser_start_path",
            "expires_at",
        }

        start_keys = (
            sorted(str(key) for key in start_body.keys())
            if isinstance(start_body, dict)
            else []
        )
        results.append(
            "INFO authorize_status="
            + str(start_status)
            + " body_type="
            + type(start_body).__name__
            + " keys="
            + ",".join(start_keys)
        )

        require(
            start_status == 201
            and isinstance(start_body, dict)
            and required_start_fields.issubset(start_body),
            "OAuth V2 start response includes required fields",
            results,
        )

        browser_start_path = str(
            start_body["browser_start_path"]
        )

        require(
            browser_start_path.startswith(
                "/api/integrations/oauth/browser-start/"
            )
            and "token=" in browser_start_path,
            "OAuth V2 start path targets secure browser endpoint",
            results,
        )

        false_confirm_status, _, _ = request(
            "POST",
            api_url + "/integrations/oauth/confirm/",
            headers=headers,
            body={
                "request_id": start_body["request_id"],
                "confirmation_token": "invalid-confirmation-token",
            },
        )

        require(
            false_confirm_status == 400,
            "invalid confirmation token is rejected",
            results,
        )

        browser_start_url = (
            api_url.removesuffix("/api")
            + browser_start_path
        )

        browser_start_status, _, browser_start_headers = request(
            "GET",
            browser_start_url,
            follow_redirects=False,
        )

        require(
            browser_start_status in (301, 302)
            and "Set-Cookie" in browser_start_headers,
            "browser start issues redirect and binding cookie",
            results,
        )

        replay_status, _, replay_headers = request(
            "GET",
            browser_start_url,
            follow_redirects=False,
        )

        replay_location = str(
            replay_headers.get("Location", "")
        )

        require(
            replay_status in (301, 302)
            and replay_location.startswith("beeapp://")
            and "accounts.google.com" not in replay_location
            and "login.microsoftonline.com" not in replay_location,
            "browser start token replay is rejected safely",
            results,
        )

        results.append(
            "INFO Provider authorization was not completed "
            + "by this automated local validation."
        )
    except Exception as error:
        results.append(
            "FAIL " + type(error).__name__ + ": " + str(error)
        )
        REPORT_DIRECTORY.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(
            "\n".join(results) + "\n",
            encoding="utf-8",
        )
        print("Prueba incompleta. Reporte:", REPORT_PATH)
        raise SystemExit(1)

    REPORT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        "\n".join(results) + "\n",
        encoding="utf-8",
    )
    print("Prueba completada. Reporte:", REPORT_PATH)


if __name__ == "__main__":
    main()
