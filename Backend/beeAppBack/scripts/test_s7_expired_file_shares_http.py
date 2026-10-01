#!/usr/bin/env python3
import getpass
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

from test_security_12_http import frontend_config, login, request

ROOT = Path(__file__).resolve().parents[3]
CYCLES = 20


def parse(raw):
    try:
        return json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        return None


def main():
    ignored = subprocess.run(
        ["git", "ls-files", "--others", "--ignored", "--exclude-standard"],
        cwd=ROOT, check=True, capture_output=True, text=True,
    ).stdout.splitlines()
    folders = sorted({
        (ROOT / name).parent for name in ignored
        if name.endswith(".txt") and (ROOT / name).is_file()
    })
    if not folders:
        raise RuntimeError("No existe la carpeta de .txt ignorados.")
    report = folders[0] / "s7_resultado_http.txt"
    lines = []
    failures = 0
    share_id = None
    token_a = None
    backend = os.environ.get("BEEAPP_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

    def check(label, passed, status):
        nonlocal failures
        lines.append(f"{'PASS' if passed else 'FAIL'} | {label} | HTTP {status}")
        failures += not passed

    try:
        supabase, key = frontend_config()
        key = os.environ.get("BEEAPP_S7_PUBLIC_KEY", key)
        key_type = "publishable" if key.startswith("sb_publishable_") else "legacy_or_other"
        status, _ = request("GET", backend + "/api/health/")
        if status != 200:
            raise RuntimeError(f"Backend no disponible: HTTP {status}")
        email_a = input("Correo cuenta A (dueña del archivo): ").strip()
        password_a = getpass.getpass("Contraseña A: ")
        token_a, user_a = login(backend, email_a, password_a)
        del email_a, password_a
        email_b = input("Correo cuenta B (destinataria): ").strip()
        password_b = getpass.getpass("Contraseña B: ")
        token_b, user_b = login(backend, email_b, password_b)
        del email_b, password_b
        if str(user_a) == str(user_b):
            raise RuntimeError("Se requieren dos cuentas distintas.")
        for label, token, user in (("A", token_a, user_a), ("B", token_b, user_b)):
            status, raw = request("GET", supabase + "/auth/v1/user", key=key, token=token)
            if status != 200 or str((parse(raw) or {}).get("id")) != str(user):
                response = parse(raw)
                error_code = response.get("code", "unavailable") if isinstance(response, dict) else "unavailable"
                raise RuntimeError(
                    f"Identidad de {label} no verificada: HTTP {status}; "
                    f"codigo={str(error_code)[:80]}; clave={key_type}"
                )

        status, raw = request("GET", backend + "/api/storage/files/?limit=100", token=token_a)
        payload = parse(raw)
        if status != 200 or not isinstance(payload, dict):
            raise RuntimeError(f"No se pudo consultar archivos de A: HTTP {status}")
        files = payload.get("files")
        if not isinstance(files, list):
            raise RuntimeError("Respuesta de archivos sin lista 'files'.")
        chosen = None
        for file in files:
            if file.get("status") != "ready" or file.get("trashed_at"):
                continue
            file_id = file.get("id")
            url = (supabase + "/rest/v1/file_shares?select=id"
                   + "&file_id=eq." + quote(str(file_id), safe="")
                   + "&shared_with_user_id=eq." + quote(str(user_b), safe=""))
            code, body = request("GET", url, key=key, token=token_a)
            rows = parse(body)
            if code != 200 or not isinstance(rows, list):
                raise RuntimeError(f"No se verificó relación previa: HTTP {code}")
            if not rows:
                chosen = file_id
                break
        if chosen is None:
            raise RuntimeError("No hay archivo ready de A sin share previo hacia B; no se alteró ninguno.")
        endpoint = backend + "/api/storage/files/" + quote(str(chosen), safe="") + "/"
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        status, _ = request(
            "POST", endpoint + "shares/", token=token_a,
            body={"recipient_id": user_b, "expires_at": past},
        )
        check("rechazo de expiración pasada", status == 400, status)
        if status != 400:
            raise RuntimeError("Expiración pasada no rechazada; se interrumpe para evitar cambios adicionales.")

        future = (datetime.now(timezone.utc) + timedelta(seconds=45)).isoformat()
        status, raw = request(
            "POST", endpoint + "shares/", token=token_a,
            body={"recipient_id": user_b, "expires_at": future},
        )
        share = (parse(raw) or {}).get("share") if status == 201 else None
        if not isinstance(share, dict) or not share.get("id"):
            raise RuntimeError(f"No se creó fixture temporal: HTTP {status}")
        share_id = share["id"]
        lines.append("PASS | fixture temporal creada | identificador omitido")
        status, _ = request("GET", endpoint + "access/", token=token_b)
        check("share vigente permite acceso", status == 200, status)
        while datetime.now(timezone.utc) <= datetime.fromisoformat(future) + timedelta(seconds=2):
            time.sleep(1)

        for cycle in range(1, CYCLES + 1):
            status, _ = request("GET", endpoint + "access/", token=token_b)
            check(f"ciclo {cycle}: vencido sin URL firmada", status == 404, status)
            status, raw = request(
                "GET", backend + "/api/storage/shares/received/?limit=100",
                token=token_b,
            )
            received = parse(raw)
            visible = (
                status == 200 and isinstance(received, dict)
                and isinstance(received.get("shares"), list)
                and all(str(row.get("id")) != str(share_id) for row in received["shares"])
            )
            check(f"ciclo {cycle}: vencido fuera del listado", visible, status)
            if failures:
                break

        patch_url = (supabase + "/rest/v1/file_shares?id=eq."
                     + quote(str(share_id), safe=""))
        status, _ = request(
            "PATCH", patch_url, key=key, token=token_b, body={"expires_at": None},
        )
        check("destinatario no puede borrar expires_at", status in (401, 403), status)
        status, raw = request(
            "GET", supabase + "/rest/v1/file_shares?select=expires_at&id=eq."
            + quote(str(share_id), safe=""), key=key, token=token_a,
        )
        row = parse(raw)
        check(
            "expires_at permanece intacto",
            status == 200 and isinstance(row, list) and len(row) == 1
            and row[0].get("expires_at") is not None,
            status,
        )

        hidden_time = datetime.now(timezone.utc).isoformat()
        status, _ = request(
            "PATCH", patch_url, key=key, token=token_b,
            body={"hidden_at": hidden_time},
        )
        check("destinatario conserva UPDATE de hidden_at", status in (200, 204), status)
        status, raw = request(
            "GET", supabase + "/rest/v1/file_shares?select=hidden_at&id=eq."
            + quote(str(share_id), safe=""), key=key, token=token_a,
        )
        hidden_row = parse(raw)
        check(
            "hidden_at persistió sin cambiar expires_at",
            status == 200 and isinstance(hidden_row, list)
            and len(hidden_row) == 1
            and hidden_row[0].get("hidden_at") is not None,
            status,
        )
    except Exception as error:
        failures += 1
        lines.append("FAIL | ejecución incompleta | " + str(error))
    finally:
        if share_id and token_a:
            try:
                code, _ = request(
                    "POST", backend + "/api/storage/shares/"
                    + quote(str(share_id), safe="") + "/revoke/",
                    token=token_a,
                )
                check("revocación del fixture", code == 200, code)
            except Exception as error:
                failures += 1
                lines.append("FAIL | revocación del fixture | " + str(error))
        if "report" in locals():
            lines.append(f"RESULTADO | fallos={failures} | ciclos previstos={CYCLES}")
            report.write_text("\n".join(lines) + "\n")
            print(f"Reporte S7 generado; fallos={failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
