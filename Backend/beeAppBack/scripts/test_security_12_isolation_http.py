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


def main():
    results = []

    def check(name, passed, status):
        results.append(
            ("PASS" if passed else "FAIL")
            + " | " + name + " | HTTP " + str(status)
        )

    try:
        base, _ = frontend_config()
        key = os.environ.get("BEEAPP_SECURITY_12_PUBLIC_KEY", "")
        if not key.startswith("sb_publishable_"):
            raise RuntimeError("PUBLIC_KEY_REQUIRED")
        backend = os.environ.get(
            "BEEAPP_BASE_URL", "http://127.0.0.1:8000"
        ).rstrip("/")

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

        def read_profile(token, user_id):
            endpoint = (
                base + "/rest/v1/profile?select=id,role&id=eq."
                + quote(str(user_id), safe="")
            )
            status, raw = request(
                "GET", endpoint, key=key, token=token
            )
            return status, json.loads(raw) if status == 200 else None

        status_a, own_a = read_profile(token_a, user_a)
        status_b, own_b = read_profile(token_b, user_b)
        ready = (
            status_a == status_b == 200
            and isinstance(own_a, list) and len(own_a) == 1
            and isinstance(own_b, list) and len(own_b) == 1
            and own_a[0].get("id") == user_a
            and own_b[0].get("id") == user_b
            and own_a[0].get("role") == "USER"
            and own_b[0].get("role") == "USER"
        )
        check("precondiciones: perfiles USER propios", ready, status_a)
        if ready:
            for label, token, other_id in (
                ("A no lee B", token_a, user_b),
                ("B no lee A", token_b, user_a),
            ):
                status, rows = read_profile(token, other_id)
                check(label, status == 200 and rows == [], status)

            for label, token, other_id in (
                ("A no es admin por ID de B", token_a, user_b),
                ("B no es admin por ID de A", token_b, user_a),
            ):
                status, raw = request(
                    "POST",
                    base + "/rest/v1/rpc/commerce_current_user_is_admin",
                    key=key,
                    token=token,
                    body={"p_user_id": other_id},
                )
                result = json.loads(raw) if status == 200 else None
                check(label, status == 200 and result is False, status)

            status, _ = request(
                "POST",
                base + "/rest/v1/rpc/commerce_current_user_is_admin",
                key=key,
                body={"p_user_id": user_a},
            )
            check("anon no ejecuta helper admin", status in (401, 403), status)
    except Exception as error:
        results.append(
            "FAIL | ejecución completa | " + type(error).__name__
        )
    finally:
        REPORT_DIR.mkdir(exist_ok=True)
        report = REPORT_DIR / (
            "beeapp_security_12_isolation_http_"
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
        print(f"Reporte generado: {report}")

    return 0 if results and all(
        row.startswith("PASS") for row in results
    ) else 1


if __name__ == "__main__":
    sys.exit(main())
