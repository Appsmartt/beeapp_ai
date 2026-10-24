#!/usr/bin/env python3
import base64
import getpass
import json
import os
import subprocess
import sys
import time
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, quote, urljoin, urlparse

from test_security_12_http import frontend_config, login, request

ROOT = Path(__file__).resolve().parents[3]
CYCLES = 20


def parse(raw):
    try:
        return json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        return None



def cleanup_isolated_fixture(*, file_id, owner_id, share_id):
    backend_root = ROOT / "Backend/beeAppBack"
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")
    import django
    django.setup()
    from beeAppBack.core.supabase_client import get_supabase_admin_client

    client = get_supabase_admin_client()
    rows = (
        client.table("files")
        .select("id,owner_id,bucket_id,storage_path,original_name,status,size_bytes")
        .eq("id", file_id)
        .execute()
        .data or []
    )
    if len(rows) != 1:
        raise RuntimeError("Fixture file was not found uniquely; cleanup stopped.")
    file = rows[0]
    shares = (
        client.table("file_shares")
        .select("id,revoked_at")
        .eq("file_id", file_id)
        .execute()
        .data or []
    )
    if not (
        file["owner_id"] == str(owner_id)
        and file["id"] == str(file_id)
        and file["bucket_id"] == "beeapp-files"
        and file["status"] == "ready"
        and file["size_bytes"] == 44
        and file["original_name"].startswith("s7-expired-share-")
        and len(shares) == 1
        and str(shares[0]["id"]) == str(share_id)
        and shares[0]["revoked_at"] is not None
    ):
        raise RuntimeError("Fixture safety checks failed; cleanup stopped.")

    quota_rows = (
        client.table("storage_quotas")
        .select("used_bytes")
        .eq("user_id", owner_id)
        .execute()
        .data or []
    )
    if len(quota_rows) != 1 or quota_rows[0]["used_bytes"] < file["size_bytes"]:
        raise RuntimeError("Fixture quota check failed; cleanup stopped.")
    quota_before = quota_rows[0]["used_bytes"]
    folder, name = file["storage_path"].rsplit("/", 1)
    bucket = client.storage.from_(file["bucket_id"])
    bucket.remove([file["storage_path"]])
    objects = bucket.list(folder, {"limit": 100, "offset": 0})
    if any(
        (item.get("name") if isinstance(item, dict) else getattr(item, "name", None)) == name
        for item in (objects or [])
    ):
        raise RuntimeError("Fixture object remains in Storage; metadata retained.")

    client.table("files").delete().eq("id", file_id).eq("owner_id", owner_id).execute()
    remaining = client.table("files").select("id").eq("id", file_id).execute().data or []
    if remaining:
        raise RuntimeError("Fixture file row remains; quota retained.")

    updated = (
        client.table("storage_quotas")
        .update({"used_bytes": quota_before - file["size_bytes"]})
        .eq("user_id", owner_id)
        .eq("used_bytes", quota_before)
        .execute()
        .data or []
    )
    if len(updated) != 1:
        raise RuntimeError("Fixture removed but quota update needs review.")
    return True


def main():
    report_dir = ROOT / "tmp"
    if not report_dir.is_dir():
        raise RuntimeError("No existe la carpeta tmp para reportes ignorados.")
    ignored = subprocess.run(
        ["git", "check-ignore", "-q", str(report_dir.relative_to(ROOT))],
        cwd=ROOT, check=False,
    )
    if ignored.returncode != 0:
        raise RuntimeError("La carpeta tmp no está ignorada por Git.")
    report = report_dir / "s7_resultado_http.txt"
    lines = []
    failures = 0
    share_id = None
    fixture_file_id = None
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
        status, _ = request("GET", supabase + "/auth/v1/settings", key=key)
        if status != 200:
            raise RuntimeError(
                f"Clave pública de Supabase rechazada antes del login: HTTP {status}; "
                f"tipo={key_type}. No se alteraron sesiones."
            )
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

        fixture_name = "s7-expired-share-" + uuid.uuid4().hex + ".txt"
        boundary = "beeapp-s7-" + uuid.uuid4().hex
        file_content = b"BeeApp S7 isolated expiration test fixture\\n"
        multipart = (
            ("--" + boundary + "\r\n"
             + 'Content-Disposition: form-data; name="file"; filename="' + fixture_name + '"\r\n'
             + "Content-Type: text/plain\r\n\r\n").encode("ascii")
            + file_content
            + ("\r\n--" + boundary + "--\r\n").encode("ascii")
        )
        upload_call = urllib.request.Request(
            backend + "/api/storage/uploads/",
            data=multipart,
            headers={
                "Accept": "application/json",
                "Authorization": "Bearer " + token_a,
                "Content-Type": "multipart/form-data; boundary=" + boundary,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(upload_call, timeout=40) as upload_response:
                upload_status = upload_response.status
                upload_raw = upload_response.read(262144)
        except urllib.error.HTTPError as error:
            upload_status = error.code
            upload_raw = error.read(262144)
        upload_result = parse(upload_raw)
        uploaded = upload_result.get("files") if isinstance(upload_result, dict) else None
        if upload_status != 201 or not isinstance(uploaded, list) or len(uploaded) != 1:
            raise RuntimeError(f"No se creó el archivo aislado: HTTP {upload_status}")
        created_file = uploaded[0]
        if (
            created_file.get("owner_id") != str(user_a)
            or created_file.get("status") != "ready"
            or created_file.get("original_name") != fixture_name
            or not created_file.get("id")
        ):
            raise RuntimeError("Respuesta de upload no acredita un archivo de prueba propio y ready.")
        fixture_file_id = str(created_file["id"])
        chosen = fixture_file_id
        lines.append("PASS | archivo de prueba aislado creado | identificador omitido")
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
        status, raw = request("GET", endpoint + "access/", token=token_b)
        check("share vigente permite acceso", status == 200, status)
        access = parse(raw)
        signed = access.get("url") if isinstance(access, dict) else None
        if status != 200 or not isinstance(signed, str):
            raise RuntimeError("No se obtuvo una URL firmada vigente.")
        ttl = access.get("expires_in_seconds")
        check(
            "TTL de share próximo a vencer limitado",
            isinstance(ttl, int) and 1 <= ttl <= 42, status,
        )
        if not isinstance(ttl, int) or not 1 <= ttl <= 42:
            raise RuntimeError("El backend no devolvió el TTL acotado esperado.")
        signed = urljoin(supabase + "/", signed)
        destination = urlparse(signed)
        project_origin = urlparse(supabase)
        if (
            destination.scheme != "https"
            or destination.netloc != project_origin.netloc
            or not destination.path.startswith("/storage/v1/object/sign/")
        ):
            raise RuntimeError("URL firmada fuera del Storage del proyecto esperado.")
        status, _ = request("GET", signed)
        check("URL preemitida funciona durante el share", status == 200, status)
        if status != 200:
            raise RuntimeError("URL preemitida no funcionó durante el share.")
        while datetime.now(timezone.utc) <= datetime.fromisoformat(future) + timedelta(seconds=2):
            time.sleep(1)

        status, expired_response = request("GET", signed)
        response_data = parse(expired_response)
        fields = (
            sorted(response_data.keys())[:12]
            if isinstance(response_data, dict) else []
        )
        token_values = parse_qs(urlparse(signed).query).get("token", [])
        jwt_expired = False
        if len(token_values) == 1:
            try:
                segments = token_values[0].split(".")
                encoded = segments[1]
                payload = json.loads(base64.urlsafe_b64decode(
                    encoded + "=" * (-len(encoded) % 4)
                ))
                expiry = payload.get("exp")
                jwt_expired = (
                    isinstance(expiry, (int, float))
                    and time.time() > expiry
                )
            except (IndexError, ValueError, TypeError):
                pass
        expiration_confirmed = (
            status == 400
            and jwt_expired
            and isinstance(response_data, dict)
            and "code" in response_data
            and "message" in response_data
        )
        lines.append(
            "DIAGNOSTICO | respuesta_400_bytes="
            + str(len(expired_response))
            + " | campos_json=" + ",".join(fields)
            + " | jwt_expirado=" + str(jwt_expired)
        )
        check(
            "URL preemitida expira con el share",
            expiration_confirmed, status,
        )

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
        if fixture_file_id and share_id and token_a:
            try:
                cleanup_isolated_fixture(
                    file_id=fixture_file_id,
                    owner_id=user_a,
                    share_id=share_id,
                )
                lines.append("PASS | objeto, fila y cuota del fixture limpiados")
            except Exception as error:
                failures += 1
                lines.append(
                    "FAIL | limpieza del fixture | " + type(error).__name__
                    + " | verificar estado antes de reintentar"
                )
        if "report" in locals():
            lines.append(f"RESULTADO | fallos={failures} | ciclos previstos={CYCLES}")
            report.write_text("\n".join(lines) + "\n")
            print(f"Reporte S7 generado; fallos={failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
