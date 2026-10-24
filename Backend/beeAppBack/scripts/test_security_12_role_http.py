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

    def check(name, passed, detail):
        results.append(
            ("PASS" if passed else "FAIL") + " | " + name + " | " + detail
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

        def own_profile(token, user_id):
            endpoint = (
                base + "/rest/v1/profile?select=id,role&id=eq."
                + quote(str(user_id), safe="")
            )
            status, raw = request("GET", endpoint, key=key, token=token)
            rows = json.loads(raw) if status == 200 else None
            return status, rows

        status_a, before_a = own_profile(token_a, user_a)
        status_b, before_b = own_profile(token_b, user_b)
        ready = (
            user_a != user_b
            and status_a == status_b == 200
            and isinstance(before_a, list) and len(before_a) == 1
            and isinstance(before_b, list) and len(before_b) == 1
            and before_a[0].get("id") == user_a
            and before_b[0].get("id") == user_b
            and before_a[0].get("role") == "USER"
            and before_b[0].get("role") == "USER"
        )
        check(
            "precondiciones: dos perfiles USER distintos",
            ready,
            f"HTTP A={status_a}, B={status_b}",
        )

        if ready:
            endpoint = (
                base + "/rest/v1/profile?id=eq."
                + quote(str(user_a), safe="")
            )
            patch_status, _ = request(
                "PATCH",
                endpoint,
                key=key,
                token=token_a,
                body={"role": "SUPERADMIN"},
            )
            after_status, after_a = own_profile(token_a, user_a)
            denied = patch_status in (401, 403)
            unchanged = (
                after_status == 200
                and isinstance(after_a, list)
                and len(after_a) == 1
                and after_a[0].get("id") == user_a
                and after_a[0].get("role") == "USER"
            )
            check("S1: escalada denegada", denied, f"HTTP {patch_status}")
            check(
                "S1: rol permanece USER",
                unchanged,
                f"HTTP {after_status}",
            )
    except Exception as error:
        check("ejecución completa", False, type(error).__name__)
    finally:
        REPORT_DIR.mkdir(exist_ok=True)
        report = REPORT_DIR / (
            "beeapp_security_12_role_http_"
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
            report,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL,
            0o600,
        )
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write("\n".join(results) + "\n")
        print(f"Reporte generado: {report}")
    return 0 if results and all(row.startswith("PASS") for row in results) else 1


if __name__ == "__main__":
    sys.exit(main())
