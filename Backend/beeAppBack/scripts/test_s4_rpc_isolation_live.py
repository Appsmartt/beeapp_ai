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
    global failures
    failures += 1
    results.append(f"FAIL | precondición {label} | {reason}")

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
    key_status, _ = request(
        "GET", supabase_url + "/auth/v1/settings",
        {"apikey": anon_key},
    )
    check(
        "clave pública de prueba aceptada",
        key_status == 200,
        f"HTTP {key_status}",
    )
    if key_status != 200:
        return 1
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
        backend_status, backend_data = request(
            "POST", api_base + "/accounts/login/",
            {"Content-Type": "application/json"},
            {"email": email, "password": password},
        )
        password = None
        backend_session = (
            backend_data.get("session", {})
            if isinstance(backend_data, dict) else {}
        )
        backend_user = (
            backend_data.get("user", {})
            if isinstance(backend_data, dict) else {}
        )
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
        backend_token = (
            backend_session.get("access_token")
            if isinstance(backend_session, dict) else None
        )
        check(
            f"sesión backend {label}",
            backend_status == 200 and bool(backend_token)
            and isinstance(backend_user, dict)
            and backend_user.get("id") == user.get("id"),
            f"HTTP {backend_status}; identidad_coincide="
            f"{isinstance(backend_user, dict) and backend_user.get('id') == user.get('id')}",
        )
        if backend_status != 200 or not backend_token or (
            not isinstance(backend_user, dict)
            or backend_user.get("id") != user.get("id")
        ):
            return 1
        accounts.append({
            "token": data["access_token"],
            "backend_token": backend_token,
            "id": user.get("id"),
        })
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

    # S4_HTTP_REGRESSION_CASES: read-only cross-account and backend checks.
    for label, account in zip(("A", "B"), accounts):
        status, note_page = backend(
            api_base, account["backend_token"], "/notes/?limit=10"
        )
        note_rows = items(note_page, "notes")
        check(
            f"backend notas propias {label}",
            status == 200 and isinstance(note_page, dict)
            and isinstance(note_page.get("notes"), list)
            and all(
                isinstance(row, dict)
                and row.get("owner_id") == account["id"]
                for row in note_rows
            ),
            f"HTTP {status}; filas={len(note_rows)}",
        )
        account["backend_notes"] = note_rows

        status, search_page = backend(
            api_base, account["backend_token"], "/notes/?search=s4&limit=10"
        )
        search_rows = items(search_page, "notes")
        check(
            f"backend búsqueda propia {label}",
            status == 200 and isinstance(search_page, dict)
            and isinstance(search_page.get("notes"), list)
            and all(
                isinstance(row, dict)
                and row.get("owner_id") == account["id"]
                for row in search_rows
            ),
            f"HTTP {status}; filas={len(search_rows)}",
        )

        status, notification_page = backend(
            api_base, account["backend_token"],
            "/notifications/?module=chat&limit=10",
        )
        notification_rows = items(notification_page, "notifications")
        notification_ids = [
            row.get("id") for row in notification_rows
            if isinstance(row, dict) and row.get("id")
        ]
        if status == 200 and len(notification_ids) == len(notification_rows):
            owner_filter = ",".join(notification_ids)
            owner_url = (
                supabase_url
                + "/rest/v1/notifications?select=id,recipient_id&id=in.("
                + urllib.parse.quote(owner_filter, safe=",")
                + ")"
            )
            owner_status, owned_notifications = request(
                "GET", owner_url,
                {"apikey": anon_key,
                 "Authorization": f"Bearer {account['token']}"},
            )
        else:
            owner_status, owned_notifications = 0, None
        check(
            f"backend notificaciones propias {label}",
            status == 200 and isinstance(notification_page, dict)
            and isinstance(notification_page.get("notifications"), list)
            and len(notification_ids) == len(notification_rows)
            and owner_status == 200
            and isinstance(owned_notifications, list)
            and {row.get("id") for row in owned_notifications}
                == set(notification_ids)
            and all(
                row.get("recipient_id") == account["id"]
                for row in owned_notifications
            ),
            f"backend HTTP {status}; RLS HTTP {owner_status}; "
            f"filas={len(notification_rows)}",
        )

        status, bootstrap = request(
            "POST", api_base + "/chat/bootstrap/",
            {"Authorization": f"Bearer {account['backend_token']}",
             "Content-Type": "application/json"},
            {},
        )
        check(
            f"backend bootstrap chat {label}",
            status == 200 and isinstance(bootstrap, dict)
            and isinstance(bootstrap.get("identities"), list)
            and len(bootstrap["identities"]) > 0,
            f"HTTP {status}; identidades="
            f"{len(items(bootstrap, 'identities'))}",
        )

    # S4_TEMPORARY_NOTE_FIXTURE: always use a new owned note.
    import uuid
    temporary_note_id = None
    try:
        test_title = "s4-isolation-" + uuid.uuid4().hex
        create_status, created = request(
            "POST", api_base + "/notes/",
            {"Authorization": f"Bearer {b['backend_token']}",
             "Content-Type": "application/json"},
            {"title": test_title},
        )
        note = created.get("note") if isinstance(created, dict) else None
        temporary_note_id = (
            note.get("id") if isinstance(note, dict)
            and note.get("owner_id") == b["id"] else None
        )
        check(
            "crear nota temporal propia B",
            create_status == 201 and bool(temporary_note_id),
            f"HTTP {create_status}; id_presente={bool(temporary_note_id)}",
        )
        if temporary_note_id:
            search_status, search_result = backend(
                api_base, b["backend_token"],
                "/notes/?search=" + urllib.parse.quote(test_title)
                + "&limit=10",
            )
            check(
                "búsqueda real nota temporal B",
                search_status == 200 and any(
                    isinstance(row, dict)
                    and row.get("id") == temporary_note_id
                    and row.get("owner_id") == b["id"]
                    for row in items(search_result, "notes")
                ),
                f"HTTP {search_status}",
            )
        foreign_note = temporary_note_id
        check(
            "precondición nota real B",
            foreign_note is not None,
            "B tiene nota propia" if foreign_note else
            "B no tiene nota: acceso cruzado no verificable",
        )
        if foreign_note:
            status, own_detail = backend(
                api_base, b["backend_token"], f"/notes/{foreign_note}/"
            )
            check(
                "backend lectura nota propia B",
                status == 200 and isinstance(own_detail, dict)
                and isinstance(own_detail.get("note"), dict)
                and own_detail["note"].get("owner_id") == b["id"],
                f"HTTP {status}",
            )
            status, _ = backend(
                api_base, a["backend_token"], f"/notes/{foreign_note}/"
            )
            check("backend nota ajena A", status == 404, f"HTTP {status}")
            status, _ = backend(
                api_base, a["backend_token"],
                f"/notes/{foreign_note}/attachments/",
            )
            check(
                "backend adjuntos nota ajena A",
                status == 404,
                f"HTTP {status}",
            )

    finally:
        if temporary_note_id:
            own_note_url = api_base + f"/notes/{temporary_note_id}/"
            own_headers = {
                "Authorization": f"Bearer {b['backend_token']}",
            }
            trash_status, _ = request(
                "POST", own_note_url + "trash/",
                own_headers, {},
            )
            check(
                "enviar solo nota temporal B a papelera",
                trash_status == 200,
                f"HTTP {trash_status}",
            )
            if trash_status == 200:
                delete_status, _ = request(
                    "DELETE", own_note_url, own_headers,
                )
                check(
                    "eliminar solo nota temporal B",
                    delete_status == 204,
                    f"HTTP {delete_status}",
                )
                if delete_status == 204:
                    verify_status, _ = backend(
                        api_base, b["backend_token"],
                        f"/notes/{temporary_note_id}/",
                    )
                    check(
                        "verificar ausencia nota temporal B",
                        verify_status == 404,
                        f"HTTP {verify_status}",
                    )

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
