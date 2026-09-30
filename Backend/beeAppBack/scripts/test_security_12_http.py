#!/usr/bin/env python3
import base64
import getpass
import json
import os
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import urlsplit
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FRONT_ENV = ROOT / "Fronted/apps/mobile/.env"
REPORT_DIR = ROOT / ".beeapp-work"
PROJECT_REF = "elwnmmznlqihruveqlye"
TIMEOUT = 12


def frontend_config():
    if not FRONT_ENV.is_file():
        raise RuntimeError("No existe el .env esperado del frontend; no se creó ni modificó.")
    values = {}
    for raw in FRONT_ENV.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\s*(?:export\s+)?(EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$", raw)
        if match:
            value = match.group(2).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            values[match.group(1)] = value
    url = values.get("EXPO_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = values.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "")
    if not url or not key or PROJECT_REF not in url:
        raise RuntimeError("Falta configuración pública o el proyecto no coincide; no se enviaron peticiones.")
    return url, key


def request(method, url, key=None, token=None, body=None):
    headers = {"Accept": "application/json"}
    if key:
        headers["apikey"] = key
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None:
        headers["Content-Type"] = "application/json"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    call = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(call, timeout=TIMEOUT) as response:
            return response.status, response.read(262144)
    except urllib.error.HTTPError as error:
        return error.code, error.read(262144)


def login(base, email, password):
    code, raw = request("POST", base + "/api/accounts/login/", body={
        "email": email, "password": password
    })
    if code != 200:
        raise RuntimeError("Falló el login de una cuenta de prueba; HTTP " + str(code))
    payload = json.loads(raw)
    return payload["session"]["access_token"], payload["user"]["id"]


def main():
    supabase, key = frontend_config()
    key = os.environ.get("BEEAPP_SECURITY_12_PUBLIC_KEY", key)
    backend = os.environ.get("BEEAPP_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    report = []
    failures = 0

    def check(name, code, expected):
        nonlocal failures
        result = "INCONCLUSIVE" if code == 404 and 404 in expected else (
            "PASS" if code in expected else "FAIL"
        )
        failures += result != "PASS"
        report.append(f"{result} | {name} | HTTP {code} | esperado {','.join(map(str, sorted(expected)))}")

    try:
        code, _ = request("GET", supabase + "/auth/v1/settings", key=key)
        check("clave pública aceptada por Supabase", code, {200})
        if code != 200:
            raise RuntimeError("Supabase rechazó la clave pública de prueba.")
        code, raw = request("GET", backend + "/api/health/")
        check("backend health", code, {200})
        if code != 200 or json.loads(raw).get("status") != "ok":
            raise RuntimeError("Backend no disponible o health inválido.")
        email_a = input("Correo cuenta A de prueba: ").strip()
        password_a = getpass.getpass("Contraseña A: ")
        token_a, user_a = login(backend, email_a, password_a)
        del password_a, email_a
        email_b = input("Correo cuenta B de prueba: ").strip()
        password_b = getpass.getpass("Contraseña B: ")
        token_b, user_b = login(backend, email_b, password_b)
        del password_b, email_b
        if user_a == user_b:
            raise RuntimeError("Se requieren dos cuentas diferentes.")
        for label, token, user_id in (("A", token_a, user_a), ("B", token_b, user_b)):
            code, raw = request("GET", supabase + "/auth/v1/user", key=key, token=token)
            check("token aceptado por Supabase " + label, code, {200})
            if code != 200:
                try:
                    part = token.split(".")[1]
                    claims = json.loads(base64.urlsafe_b64decode(
                        part + "=" * (-len(part) % 4)
                    ))
                    issuer_host = urlsplit(str(claims.get("iss", ""))).hostname or "no_disponible"
                    role = str(claims.get("role", "no_disponible"))
                    error_code = str(json.loads(raw).get("code", "no_disponible"))
                except (IndexError, ValueError, KeyError, TypeError):
                    issuer_host, role, error_code = ("no_disponible",) * 3
                key_type = ("sb_publishable" if key.startswith("sb_publishable_")
                            else "jwt" if key.count(".") == 2 else "otro")
                report.append("DIAGNOSTICO | emisor_host=" + issuer_host +
                              " | rol=" + role + " | tipo_clave=" + key_type +
                              " | error_codigo=" + error_code)
                raise RuntimeError("Supabase rechazó el token de " + label)
            if str(json.loads(raw).get("id")) != str(user_id):
                raise RuntimeError("Identidad no coincide con Supabase " + label)
        for label, token in (("A", token_a), ("B", token_b)):
            code, _ = request("GET", backend + "/api/accounts/me/", token=token)
            check("perfil backend " + label, code, {200})
            code, _ = request("GET", backend + "/api/statuses/feed/", token=token)
            check("feed backend " + label, code, {200})
        check("feed backend sin sesión",
              request("GET", backend + "/api/statuses/feed/")[0], {401, 403})

        story = "00000000-0000-0000-0000-000000000000"
        cases = {
            "status_list_feed": {"p_viewer_profile_id": user_a, "p_limit": 1},
            "status_list_author_stories": {"p_viewer_profile_id": user_a, "p_actor_type": "profile", "p_actor_id": user_a, "p_include_archived": False},
            "status_list_author_stories_by_scope": {"p_viewer_profile_id": user_a, "p_actor_type": "profile", "p_actor_id": user_a, "p_scope": "active"},
            "status_get_story": {"p_viewer_profile_id": user_a, "p_story_id": story, "p_include_archived": False},
            "status_list_story_viewers": {"p_owner_profile_id": user_a, "p_story_id": story},
            "status_archive_story": {"p_owner_profile_id": user_a, "p_story_id": story},
            "status_register_story_view": {"p_viewer_profile_id": user_a, "p_story_id": story},
            "sync_chat_identities_for_user": {"p_user_id": user_b},
            "sync_chat_identity_for_commercial_profile": {"p_commercial_profile_id": story},
            "prepare_storage_upload": {
                "p_user_id": story, "p_original_name": "security-check.txt",
                "p_mime_type": "text/plain", "p_size_bytes": 0,
                "p_folder_id": None, "p_bucket_id": "security-check"
            },
            "replace_mobile_device_session_with_revocation": {
                "p_user_id": story, "p_auth_session_id": story,
                "p_session_token_hash": "security-check",
                "p_device_name": "security-check", "p_platform": "security-check",
                "p_browser": "security-check", "p_ip_address": None,
                "p_user_agent": "security-check", "p_expires_at": "2000-01-01T00:00:00Z"
            },
        }
        for role, token in (("anon", None), ("authenticated A", token_a)):
            for name, payload in cases.items():
                if role == "authenticated A" and name.startswith("sync_"):
                    continue
                code, _ = request("POST", supabase + "/rest/v1/rpc/" + name,
                                  key=key, token=token, body=payload)
                check(role + " RPC " + name, code, {401, 403, 404})
        for name in ("sync_chat_identities_for_user",
                     "sync_chat_identity_for_commercial_profile"):
            code, _ = request("POST", supabase + "/rest/v1/rpc/" + name,
                              key=key, token=token_a, body=cases[name])
            check("authenticated A no puede invocar " + name, code, {401, 403, 404})
        for label, token in (("A", token_a), ("B", token_b)):
            code, _ = request("POST", backend + "/api/chat/bootstrap/",
                              token=token, body={})
            check("bootstrap chat backend " + label, code, {200})
    except (RuntimeError, ValueError, KeyError, json.JSONDecodeError,
            urllib.error.URLError, TimeoutError) as error:
        failures += 1
        report.append("FAIL | ejecución interrumpida | " + type(error).__name__)
        print("Prueba interrumpida:", type(error).__name__, file=sys.stderr)
    finally:
        REPORT_DIR.mkdir(exist_ok=True)
        destination = REPORT_DIR / ("beeapp_security_12_http_" +
                                    datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S") + ".txt")
        destination.write_text("\n".join(report) + "\n", encoding="utf-8")
        destination.chmod(0o600)
        print("Resultado: " + str(len(report) - failures) + " aprobadas; " +
              str(failures) + " fallidas. Traza: " + str(destination))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
