import json
from datetime import datetime, timezone
from pathlib import Path
from secrets import token_urlsafe
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = ROOT / "Fronted" / ".env"
REPORT = ROOT / ".beeapp-work" / "auth_qr_live_smoke_report.txt"

def api_url():
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("EXPO_PUBLIC_API_BASE_URL="):
            return line.split("=", 1)[1].strip().strip(chr(34)).strip(chr(39)).rstrip("/")
    raise RuntimeError("EXPO_PUBLIC_API_BASE_URL was not found.")

def request(method, url, payload=None):
    data = json.dumps(payload).encode() if payload else None
    headers = {"Accept": "application/json"}
    if data:
        headers["Content-Type"] = "application/json"
    try:
        with urlopen(Request(url, data=data, headers=headers, method=method), timeout=20) as response:
            raw = response.read(4096).decode("utf-8", "replace")
            return response.status, json.loads(raw) if raw else {}
    except HTTPError as error:
        raw = error.read(4096).decode("utf-8", "replace")
        return error.code, json.loads(raw) if raw else {}
    except URLError as error:
        raise RuntimeError("Network error: " + str(error.reason)) from error

lines = ["BEEAPP AUTH QR LIVE SMOKE REPORT", "Timestamp UTC: " + datetime.now(timezone.utc).isoformat(), "Sensitive values are intentionally excluded.", ""]
try:
    base = api_url()
    health_url = base.rsplit("/api", 1)[0] + "/api/health/"
    health_status, _ = request("GET", health_url)
    lines.append("Health HTTP " + str(health_status))
    create_status, created = request("POST", base + "/accounts/qr-login/challenges/", {"browser_nonce": token_urlsafe(32)})
    lines.append("QR challenge creation HTTP " + str(create_status))
    token = created.get("challenge_token", "") if isinstance(created, dict) else ""
    if create_status != 201 or not token:
        raise RuntimeError("QR challenge creation failed.")
    detail_status, detail = request("GET", base + "/accounts/qr-login/challenges/" + token + "/")
    lines.append("QR challenge status HTTP " + str(detail_status))
    lines.append("QR challenge state " + str(detail.get("status", "")))
    passed = health_status == 200 and detail_status == 200 and detail.get("status") == "PENDING"
    lines.append("")
    lines.append("RESULT: " + ("PASS" if passed else "FAIL"))
except Exception as error:
    lines.append("")
    lines.append("RESULT: FAIL")
    lines.append("ERROR: " + type(error).__name__ + ": " + str(error))
REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
