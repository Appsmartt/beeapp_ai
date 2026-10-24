#!/usr/bin/env python3
import getpass
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from test_security_12_http import frontend_config, login, request

ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = ROOT / ".beeapp-work"
ZERO_UUID = "00000000-0000-0000-0000-000000000000"


def main():
    results = []

    def check(name, passed, status):
        results.append(
            ("PASS" if passed else "FAIL")
            + " | " + name + " | HTTP " + str(status)
        )

    try:
        supabase, _ = frontend_config()
        key = os.environ.get("BEEAPP_SECURITY_12_PUBLIC_KEY", "")
        if not key.startswith("sb_publishable_"):
            raise RuntimeError("ACTIVE_PUBLIC_KEY_REQUIRED")
        backend = os.environ.get(
            "BEEAPP_BASE_URL", "http://127.0.0.1:8000"
        ).rstrip("/")

        status, _ = request(
            "GET", supabase + "/auth/v1/settings", key=key
        )
        check("clave pública activa", status == 200, status)
        if status != 200:
            raise RuntimeError("PUBLIC_KEY_REJECTED")

        status, raw = request("GET", backend + "/api/health/")
        healthy = status == 200 and json.loads(raw).get("status") == "ok"
        check("backend disponible", healthy, status)
        if not healthy:
            raise RuntimeError("BACKEND_NOT_HEALTHY")

        email_a = input("Correo cuenta A de prueba: ").strip()
        password_a = getpass.getpass("Contraseña A: ")
        token_a, user_a = login(backend, email_a, password_a)
        del email_a, password_a

        email_b = input("Correo cuenta B de prueba: ").strip()
        password_b = getpass.getpass("Contraseña B: ")
        token_b, user_b = login(backend, email_b, password_b)
        del email_b, password_b

        if user_a == user_b:
            raise RuntimeError("DISTINCT_USERS_REQUIRED")

        def profile(token, user_id):
            endpoint = (
                supabase + "/rest/v1/profile?select=id,role&id=eq."
                + quote(str(user_id), safe="")
            )
            code, body = request(
                "GET", endpoint, key=key, token=token
            )
            return code, json.loads(body) if code == 200 else None

        code_a, before_a = profile(token_a, user_a)
        code_b, before_b = profile(token_b, user_b)
        ready = (
            code_a == code_b == 200
            and isinstance(before_a, list) and len(before_a) == 1
            and isinstance(before_b, list) and len(before_b) == 1
            and before_a[0].get("id") == user_a
            and before_b[0].get("id") == user_b
            and before_a[0].get("role") == "USER"
            and before_b[0].get("role") == "USER"
        )
        check("dos perfiles USER propios", ready, code_a)
        if not ready:
            raise RuntimeError("PROFILE_PRECONDITION_FAILED")

        for label, token, other_id in (
            ("A no lee perfil B", token_a, user_b),
            ("B no lee perfil A", token_b, user_a),
        ):
            code, rows = profile(token, other_id)
            isolated = code == 200 and rows == []
            check(label, isolated, code)
            if not isolated:
                raise RuntimeError("PROFILE_ISOLATION_FAILED")

        endpoint = (
            supabase + "/rest/v1/profile?id=eq."
            + quote(str(user_a), safe="")
        )
        code, _ = request(
            "PATCH", endpoint, key=key, token=token_a,
            body={"role": "SUPERADMIN"},
        )
        denied = code in (401, 403)
        check("S1: escalada denegada", denied, code)
        after_code, after_a = profile(token_a, user_a)
        role_unchanged = (
            after_code == 200
            and isinstance(after_a, list)
            and len(after_a) == 1
            and after_a[0].get("role") == "USER"
        )
        check("S1: rol continúa USER", role_unchanged, after_code)
        if not denied or not role_unchanged:
            raise RuntimeError("ROLE_ESCALATION_SAFETY_STOP")

        for label, token, other_id in (
            ("A no suplanta admin B", token_a, user_b),
            ("B no suplanta admin A", token_b, user_a),
        ):
            code, body = request(
                "POST",
                supabase
                + "/rest/v1/rpc/commerce_current_user_is_admin",
                key=key,
                token=token,
                body={"p_user_id": other_id},
            )
            value = json.loads(body) if code == 200 else None
            safe_admin_result = code == 200 and value is False
            check(label, safe_admin_result, code)
            if not safe_admin_result:
                raise RuntimeError("ADMIN_ORACLE_SAFETY_STOP")

        code, _ = request(
            "POST",
            supabase
            + "/rest/v1/rpc/commerce_current_user_is_admin",
            key=key,
            body={"p_user_id": user_a},
        )
        check("S3: helper admin vedado a anon", code in (401, 403), code)

        cases = {
            "status_list_feed": {
                "p_viewer_profile_id": user_a, "p_limit": 1
            },
            "status_list_author_stories": {
                "p_viewer_profile_id": user_a,
                "p_actor_type": "profile",
                "p_actor_id": user_a,
                "p_include_archived": False,
            },
            "status_list_author_stories_by_scope": {
                "p_viewer_profile_id": user_a,
                "p_actor_type": "profile",
                "p_actor_id": user_a,
                "p_scope": "active",
            },
            "status_get_story": {
                "p_viewer_profile_id": user_a,
                "p_story_id": ZERO_UUID,
                "p_include_archived": False,
            },
            "status_list_story_viewers": {
                "p_owner_profile_id": user_a,
                "p_story_id": ZERO_UUID,
            },
            "status_archive_story": {
                "p_owner_profile_id": user_a,
                "p_story_id": ZERO_UUID,
            },
            "status_register_story_view": {
                "p_viewer_profile_id": user_a,
                "p_story_id": ZERO_UUID,
            },
            "prepare_storage_upload": {
                "p_user_id": None,
                "p_original_name": "security-check.txt",
                "p_mime_type": "text/plain",
                "p_size_bytes": 1,
                "p_folder_id": None,
                "p_bucket_id": "beeappfiles",
            },
            "replace_mobile_device_session_with_revocation": {
                "p_user_id": None,
                "p_auth_session_id": None,
                "p_session_token_hash": "security-check",
                "p_device_name": "BeeApp Mobile",
                "p_platform": None,
                "p_browser": None,
                "p_ip_address": None,
                "p_user_agent": None,
                "p_expires_at": "2099-01-01T00:00:00Z",
            },
        }
        for label, token in (
            ("anon", None),
            ("authenticated A", token_a),
            ("authenticated B", token_b),
        ):
            for name, payload in cases.items():
                code, _ = request(
                    "POST",
                    supabase + "/rest/v1/rpc/" + name,
                    key=key,
                    token=token,
                    body=payload,
                )
                denied_rpc = code in (401, 403)
                check(label + " RPC " + name, denied_rpc, code)
                if not denied_rpc:
                    raise RuntimeError("SENSITIVE_RPC_SAFETY_STOP")

        for label, token in (("A", token_a), ("B", token_b)):
            for name, method, path, body in (
                ("perfil", "GET", "/api/accounts/me/", None),
                ("feed", "GET", "/api/statuses/feed/", None),
                ("bootstrap chat", "POST", "/api/chat/bootstrap/", {}),
            ):
                code, _ = request(
                    method, backend + path, token=token, body=body
                )
                check(label + " backend " + name, code == 200, code)

        code, _ = request("GET", backend + "/api/statuses/feed/")
        check("feed backend sin sesión", code in (401, 403), code)
    except Exception as error:
        results.append(
            "FAIL | ejecución interrumpida | " + type(error).__name__
        )
    finally:
        REPORT_DIR.mkdir(exist_ok=True)
        report = REPORT_DIR / (
            "beeapp_security_12_complete_http_"
            + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            + ".txt"
        )
        ignored = subprocess.run(
            ["git", "-C", str(ROOT), "check-ignore", "-q", str(report)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if ignored.returncode != 0:
            raise RuntimeError("REPORT_NOT_IGNORED")
        descriptor = os.open(
            report, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
        )
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write("\n".join(results) + "\n")
        if not results or report.stat().st_size == 0:
            raise RuntimeError("REPORT_EMPTY_AFTER_WRITE")
        print(f"Reporte generado: {report}")

    return 0 if results and all(
        row.startswith("PASS") for row in results
    ) else 1


if __name__ == "__main__":
    sys.exit(main())
