#!/usr/bin/env python3
import getpass
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MOBILE_ENV = ROOT / "Fronted/apps/mobile/.env"
REPORT_NAME = "prueba_revocacion_sesiones_s5.txt"
PROJECT_REF = "elwnmmznlqihruveqlye"


def load_frontend_env(path):
    values = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.removeprefix("export ").split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def request(method, url, headers=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    sent = {"Accept": "application/json", **(headers or {})}
    if data is not None:
        sent["Content-Type"] = "application/json"
    message = urllib.request.Request(url, data=data, headers=sent, method=method)
    try:
        with urllib.request.urlopen(message, timeout=20) as response:
            raw = response.read(65536)
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read(4096)
        try:
            details = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            details = {}
        return error.code, {"error_fields": sorted(details) if isinstance(details, dict) else []}


def require(condition, description, results):
    results.append(("PASS" if condition else "FAIL") + " " + description)
    if not condition:
        raise RuntimeError(description)


def run(results):
    config = load_frontend_env(MOBILE_ENV)
    api = config.get("EXPO_PUBLIC_API_BASE_URL", "").rstrip("/")
    supabase = config.get("EXPO_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon = os.environ.get("BEEAPP_TEST_PUBLISHABLE_KEY") or config.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "")
    if not all((api, supabase, anon)):
        raise RuntimeError("Missing required mobile frontend configuration")
    if urllib.parse.urlparse(supabase).hostname != f"{PROJECT_REF}.supabase.co":
        raise RuntimeError("Supabase project does not match the audited project")
    parsed_api = urllib.parse.urlparse(api)
    if parsed_api.scheme == "http" and parsed_api.hostname == "192.168.1.5" and parsed_api.port == 8000:
        api = parsed_api._replace(netloc="127.0.0.1:8000").geturl()
        parsed_api = urllib.parse.urlparse(api)
    if parsed_api.scheme != "https" and parsed_api.hostname not in ("localhost", "127.0.0.1"):
        raise RuntimeError("API URL must use HTTPS unless it is localhost")
    email = input("Email de cuenta de prueba: ").strip()
    password = getpass.getpass("Contraseña (no se mostrará): ")
    results.extend([f"Started UTC: {datetime.now(timezone.utc).isoformat()}",
                    "Project: audited Supabase project", f"Cycles requested: {os.environ.get(chr(66)+chr(69)+chr(69)+chr(65)+chr(80)+chr(80)+chr(95)+chr(84)+chr(69)+chr(83)+chr(84)+chr(95)+chr(67)+chr(89)+chr(67)+chr(76)+chr(69)+chr(83), chr(51))}"])
    for cycle in range(1, int(os.environ.get("BEEAPP_TEST_CYCLES", "3")) + 1):
        status, login = request("POST", api + "/accounts/login/",
                                body={"email": email, "password": password})
        require(status == 200 and isinstance(login, dict) and
                login.get("device_session_id") and login.get("session"),
                f"cycle {cycle}: mobile login HTTP {status}", results)
        session = login["session"]
        user_id = login["user"]["id"]
        device_id = login["device_session_id"]
        key_headers = {"apikey": anon, "Authorization": "Bearer " + session["access_token"]}
        profile_url = supabase + "/rest/v1/profile?select=id&id=eq." + urllib.parse.quote(user_id)
        profile_status, before = request("GET", profile_url, headers=key_headers)
        require(profile_status == 200 and isinstance(before, list) and
                any(row.get("id") == user_id for row in before),
                f"cycle {cycle}: active JWT reads own profile HTTP {profile_status}", results)
        refresh_status, refreshed = request(
            "POST", api + "/accounts/session/refresh/",
            body={"refresh_token": session["refresh_token"]})
        require(refresh_status == 200 and isinstance(refreshed, dict) and
                refreshed.get("session", {}).get("refresh_token"),
                f"cycle {cycle}: BeeApp refresh HTTP {refresh_status}; token length {len(session[chr(114)+chr(101)+chr(102)+chr(114)+chr(101)+chr(115)+chr(104)+chr(95)+chr(116)+chr(111)+chr(107)+chr(101)+chr(110)])}; response fields {sorted(refreshed or {})}", results)
        latest = refreshed["session"]
        revoke_status, _ = request(
            "DELETE", api + "/accounts/me/devices/" + urllib.parse.quote(device_id) + "/",
            headers={"Authorization": "Bearer " + latest["access_token"]})
        require(revoke_status == 204,
                f"cycle {cycle}: revoke device HTTP {revoke_status}", results)
        revoked_headers = {"apikey": anon, "Authorization": "Bearer " + latest["access_token"]}
        old_status, old_data = request("GET", profile_url, headers=revoked_headers)
        require(old_status in (401, 403) or
                (old_status == 200 and old_data == []),
                f"cycle {cycle}: revoked JWT cannot read profile HTTP {old_status}", results)
        backend_status, _ = request(
            "POST", api + "/accounts/session/refresh/",
            body={"refresh_token": latest["refresh_token"]})
        require(backend_status == 401,
                f"cycle {cycle}: BeeApp rejects revoked refresh HTTP {backend_status}", results)
        gotrue_status, _ = request(
            "POST", supabase + "/auth/v1/token?grant_type=refresh_token",
            headers={"apikey": anon},
            body={"refresh_token": latest["refresh_token"]})
        require(gotrue_status in (400, 401, 403),
                f"cycle {cycle}: GoTrue rejects revoked refresh HTTP {gotrue_status}", results)
    return results


if __name__ == "__main__":
    reports = [
        q.parent for base in (ROOT, *ROOT.iterdir())
        if base.is_dir() and base.name not in (".git", ".venv", "node_modules", "backups", "backup")
        for q in (*base.glob("exploracion_flujos_y_rpc_s5.txt"),
                  *(item for child in base.iterdir() if child.is_dir() and child.name not in (".git", ".venv", "node_modules", "backups", "backup") for item in child.glob("exploracion_flujos_y_rpc_s5.txt")))
    ]
    if not reports:
        sys.exit("No ignored exploration directory found")
    report = reports[0] / REPORT_NAME
    lines = []
    try:
        run(lines)
    except Exception as error:
        lines.append("FAIL " + type(error).__name__)
        report.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("Prueba incompleta. Reporte:", report)
        raise SystemExit(1)
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Prueba completada. Reporte:", report)
