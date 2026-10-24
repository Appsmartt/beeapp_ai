#!/usr/bin/env python3
import getpass
import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
FRONTEND_ENV = ROOT / "Fronted" / ".env"
REPORT = ROOT / ".beeapp-work" / "s10_http_report.txt"

FORBIDDEN_FIELDS = {
    "email", "phone", "normalized_phone", "phone_number", "owner_id",
    "address", "location_reference", "role", "is_staff", "is_superuser",
    "password", "access_token", "refresh_token",
}

ATTACKS = [
    "name,email.ilike.%private%",
    "name)",
    "(email.ilike.%private%",
    '"email"',
    r"name\value",
    "name;select",
    "name:email",
    "name\nemail",
]

ENDPOINTS = [
    ("/api/chat/recipients/search/", "q"),
    ("/api/commercial/public/profiles/", "search"),
    ("/api/commercial/public/offers/feed/", "search"),
]


def load_env_value(path, name):
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError(f"{name} is missing from frontend environment")


def request(base_url, method, path, token=None, params=None, payload=None):
    normalized_base_url = base_url.rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"

    if normalized_base_url.endswith("/api") and normalized_path.startswith("/api/"):
        normalized_path = normalized_path[4:]

    url = normalized_base_url + normalized_path
    if params:
        url += "?" + urlencode(params)

    headers = {"Accept": "application/json"}
    data = None

    if token:
        headers["Authorization"] = f"Bearer {token}"

    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode()

    try:
        with urlopen(
            Request(url, data=data, headers=headers, method=method),
            timeout=20,
        ) as response:
            return response.status, json.loads(response.read().decode() or "{}")
    except HTTPError as error:
        body = error.read().decode(errors="replace")
        try:
            return error.code, json.loads(body or "{}")
        except json.JSONDecodeError:
            return error.code, {"raw_body": body[:500]}
    except URLError as error:
        raise RuntimeError(f"Network error: {error.reason}") from error


def contains_forbidden(value):
    if isinstance(value, dict):
        return any(
            str(key).lower() in FORBIDDEN_FIELDS or contains_forbidden(item)
            for key, item in value.items()
        )
    if isinstance(value, list):
        return any(contains_forbidden(item) for item in value)
    return False


def main():
    base_url = load_env_value(FRONTEND_ENV, "EXPO_PUBLIC_API_BASE_URL")
    email = input("Email de prueba: ").strip()
    password = getpass.getpass("Contraseña de prueba: ")

    lines = ["S10 HTTP TEST REPORT", ""]
    status, login = request(
        base_url,
        "POST",
        "/api/accounts/login/",
        payload={"email": email, "password": password},
    )

    session = login.get("session") if isinstance(login, dict) else None
    token = session.get("access_token") if isinstance(session, dict) else None

    if status != 200 or not token:
        raise RuntimeError(f"Login failed with HTTP {status}")

    lines.append("LOGIN=PASS")

    for path, parameter in ENDPOINTS:
        status, body = request(
            base_url,
            "GET",
            path,
            token=token,
            params={parameter: "zz_s10_no_match_"},
        )

        if status != 200 or contains_forbidden(body):
            raise RuntimeError(f"Valid contract failed for {path}")

        lines.append(f"VALID {path} HTTP_{status} PASS")

        for attack in ATTACKS:
            status, body = request(
                base_url,
                "GET",
                path,
                token=token,
                params={parameter: attack},
            )

            if status != 400 or contains_forbidden(body):
                raise RuntimeError(
                    f"S10 rejection failed for {path} with HTTP {status}"
                )

            lines.append(f"ATTACK {path} HTTP_{status} PASS")

    lines.append("RESULT=PASS")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        REPORT.write_text(
            f"S10 HTTP TEST REPORT\nRESULT=FAIL\nERROR={error}\n",
            encoding="utf-8",
        )
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
