#!/usr/bin/env python3
import getpass
import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path.home() / "Git" / "beeapp_ai"
ENV_FILE = ROOT / "Fronted" / ".env"
results = []
failures = 0

def env_values(path):
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"").strip("\x27")
    return values

def request(method, url, headers=None, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers=headers or {}, method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read(262144)
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read(4096)
        try:
            data = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            data = None
        return error.code, data

def check(label, condition, detail):
    global failures
    state = "PASS" if condition else "FAIL"
    failures += not condition
    results.append(f"{state} | {label} | {detail}")

def skipped(label, reason):
    results.append(f"SKIP | {label} | {reason}")

def items(value, key):
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        found = value.get(key)
        return found if isinstance(found, list) else []
    return []

def rpc(supabase_url, anon_key, token, name, payload):
    return request(
        "POST", f"{supabase_url}/rest/v1/rpc/{name}",
        {
            "apikey": anon_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        payload,
    )

def backend(base_url, token, path):
    return request(
        "GET", base_url + path,
        {"Authorization": f"Bearer {token}"},
    )

def main():
    config = env_values(ENV_FILE)
    required = (
        "EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY",
        "EXPO_PUBLIC_API_BASE_URL",
    )
    missing = [name for name in required if not config.get(name)]
    if missing:
        results.append("FAIL | configuración | faltan: " + ", ".join(missing))
        return 1
    supabase_url = config[required[0]].rstrip("/")
    configured_key = config[required[1]]
    active_key_sha256 = "517ea5490c17c69abb982af86eb88f7bd968cd7c0d0335b468703cb754b3e72c"
    if not supabase_url.endswith("elwnmmznlqihruveqlye.supabase.co"):
        results.append("FAIL | configuración | proyecto Supabase inesperado")
        return 1
    if hashlib.sha256(configured_key.encode()).hexdigest() == active_key_sha256:
        anon_key = configured_key
        results.append("PASS | clave pública | coincide con clave activa")
    else:
        anon_key = "sb_publishable_ekMgCZZJ9QLPmpCYViHGRw_O2dNnG2O"
        results.append(
            "WARN | clave pública | la de Fronted/.env no coincide; "
            "el test usa la publishable activa sin modificar .env"
        )
    api_base = config[required[2]].rstrip("/")
    if not api_base.endswith("/api"):
        api_base += "/api"

    accounts = []
    for label in ("A", "B"):
        print(f"Correo de cuenta {label}: ", end="", file=sys.stderr, flush=True)
        email = sys.stdin.readline().strip()
        if (email.count('@') != 1 or any(c.isspace() for c in email)
                or any(c in email for c in '[]()<>')
                or '.' not in email.rsplit('@', 1)[-1]):
            results.append(f'FAIL | correo {label} | formato inválido; Auth no fue llamado')
            return 1
        password = getpass.getpass(f"Contraseña de cuenta {label}: ")
        if not email or not password:
            results.append(f"FAIL | autenticación {label} | credenciales vacías")
            return 1
        status, data = request(
            "POST", supabase_url + "/auth/v1/token?grant_type=password",
            {"apikey": anon_key, "Content-Type": "application/json"},
            {"email": email, "password": password},
        )
        password = None
        if status != 200 or not isinstance(data, dict) or not data.get("access_token"):
            error_code = data.get("error_code") if isinstance(data, dict) else None
            safe_codes = {
                "invalid_credentials", "email_not_confirmed",
                "over_email_send_rate_limit", "user_not_found",
                "validation_failed", "unexpected_failure",
            }
            alternatives = [data.get("error"), data.get("msg")] if isinstance(data, dict) else []
            alternatives = [str(value).lower() for value in alternatives if value]
            if error_code in safe_codes:
                reason = error_code
            elif "invalid_grant" in alternatives or "invalid login credentials" in alternatives:
                reason = "invalid_credentials"
            elif "email not confirmed" in alternatives:
                reason = "email_not_confirmed"
            else:
                reason = "no_disponible"
            results.append(
                f"FAIL | autenticación {label} | HTTP {status}; código={reason}"
            )
            return 1
        user = data.get("user") or {}
        accounts.append({"token": data["access_token"], "id": user.get("id")})
        results.append(f"PASS | autenticación {label} | HTTP {status}")
    if not accounts[0]["id"] or not accounts[1]["id"] or accounts[0]["id"] == accounts[1]["id"]:
        results.append("FAIL | cuentas | se requieren dos usuarios distintos")
        return 1

    for label, account in zip(("A", "B"), accounts):
        for name, payload in (
            ("search_notes", {"p_user_id": accounts[0]["id"], "p_search": "s4"}),
            ("attach_file_to_note", {
                "p_user_id": accounts[0]["id"],
                "p_note_id": "00000000-0000-0000-0000-000000000000",
                "p_file_id": "00000000-0000-0000-0000-000000000000",
            }),
            ("create_chat_in_app_notification", {
                "p_message_id": "00000000-0000-0000-0000-000000000000",
                "p_conversation_id": "00000000-0000-0000-0000-000000000000",
                "p_recipient_identity_id": "00000000-0000-0000-0000-000000000000",
                "p_recipient_user_id": accounts[0]["id"],
            }),
            ("chat_identity_owner_id", {
                "p_identity_id": "00000000-0000-0000-0000-000000000000",
            }),
        ):
            status, _ = rpc(supabase_url, anon_key, account["token"], name, payload)
            check(f"RPC bloqueada {label}: {name}", status in (401, 403, 404),
                  f"HTTP {status}")

        headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {account['token']}",
        }
        own_notes = (
            supabase_url + "/rest/v1/notes?select=id&owner_id=eq."
            + urllib.parse.quote(account["id"], safe="")
            + "&limit=1"
        )
        status, notes = request("GET", own_notes, headers)
        check(f"RLS notas propias {label}",
              status == 200 and isinstance(notes, list), f"HTTP {status}")

        own_identities = (
            supabase_url + "/rest/v1/chat_identities?select=id"
            + "&owner_id=eq." + urllib.parse.quote(account["id"], safe="")
            + "&is_active=eq.true&limit=1"
        )
        status, identities = request("GET", own_identities, headers)
        check(f"RLS identidades propias {label}",
              status == 200 and isinstance(identities, list), f"HTTP {status}")
        account["identities"] = identities if isinstance(identities, list) else []
        account["identity_id"] = next(
            (row.get("id") for row in account["identities"]
             if isinstance(row, dict) and row.get("id")),
            None,
        )
        if account["identity_id"]:
            own_participation = (
                supabase_url
                + "/rest/v1/chat_conversation_participants?select=conversation_id"
                + "&identity_id=eq."
                + urllib.parse.quote(account["identity_id"], safe="")
                + "&left_at=is.null&removed_at=is.null&limit=10"
            )
            status, participation = request(
                "GET", own_participation, headers
            )
            check(f"RLS participación propia {label}",
                  status == 200 and isinstance(participation, list),
                  f"HTTP {status}")
            account["conversations"] = (
                participation if isinstance(participation, list) else []
            )
        else:
            account["conversations"] = []
            skipped(f"participación {label}", "cuenta sin identidad activa")

    a, b = accounts
    if b["identity_id"]:
        for name, payload, expected in (
            ("chat_identity_belongs_to_user",
             {"p_identity_id": b["identity_id"], "p_user_id": b["id"]}, False),
            ("chat_identity_can_send_message",
             {"p_conversation_id": "00000000-0000-0000-0000-000000000000",
              "p_identity_id": b["identity_id"], "p_user_id": b["id"]}, False),
        ):
            status, value = rpc(supabase_url, anon_key, a["token"], name, payload)
            check(f"identidad ajena {name}",
                  status == 200 and value is expected, f"HTTP {status}; resultado={value}")
        status, value = rpc(supabase_url, anon_key, b["token"],
                            "chat_identity_belongs_to_user",
                            {"p_identity_id": b["identity_id"], "p_user_id": b["id"]})
        check("identidad propia B", status == 200 and value is True,
              f"HTTP {status}; resultado={value}")
    else:
        skipped("helpers de identidad", "B no tiene identidad de chat")

    conversation = next(
        (row.get("conversation_id") or row.get("id")
         for row in b["conversations"]
         if isinstance(row, dict) and (row.get("conversation_id") or row.get("id"))),
        None,
    )
    if conversation and b["identity_id"]:
        probes = (
            ("chat_user_can_view_conversation",
             {"p_conversation_id": conversation, "p_user_id": b["id"]}),
            ("chat_user_can_act_in_conversation",
             {"p_conversation_id": conversation,
              "p_identity_id": b["identity_id"], "p_user_id": b["id"]}),
            ("chat_user_can_manage_group",
             {"p_conversation_id": conversation, "p_user_id": b["id"]}),
            ("chat_user_can_manage_group_as_identity",
             {"p_conversation_id": conversation,
              "p_identity_id": b["identity_id"], "p_user_id": b["id"]}),
            ("chat_user_is_group_owner",
             {"p_conversation_id": conversation,
              "p_identity_id": b["identity_id"], "p_user_id": b["id"]}),
            ("chat_user_group_role",
             {"p_conversation_id": conversation,
              "p_identity_id": b["identity_id"], "p_user_id": b["id"]}),
        )
        for name, payload in probes:
            status, value = rpc(supabase_url, anon_key, a["token"], name, payload)
            check(f"conversación ajena {name}",
                  status == 200 and value in (False, None),
                  f"HTTP {status}; resultado={value}")
        status, value = rpc(supabase_url, anon_key, b["token"],
                            "chat_user_can_view_conversation",
                            {"p_conversation_id": conversation, "p_user_id": b["id"]})
        check("lectura conversación propia B", status == 200 and value is True,
              f"HTTP {status}; resultado={value}")
    else:
        skipped("helpers de conversación", "B no tiene conversación disponible")

    return 1 if failures else 0

try:
    exit_code = main()
except Exception as error:
    results.append(f"FAIL | ejecución | {type(error).__name__}")
    exit_code = 1
print("\n".join(results))
print(f"TOTAL | fallos={sum(line.startswith(chr(70)+chr(65)+chr(73)+chr(76)) for line in results)}"
      f"; omitidas={sum(line.startswith(chr(83)+chr(75)+chr(73)+chr(80)) for line in results)}")
sys.exit(exit_code)
