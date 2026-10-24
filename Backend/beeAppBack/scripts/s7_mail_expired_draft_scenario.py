"""Isolated expired-share mail draft scenario for the S7 HTTP runner."""

import uuid
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from test_s7_expired_file_shares_http import (
    cleanup_isolated_fixture,
    parse,
)
from test_security_12_http import request


def run_expired_draft_scenario(
    *,
    backend,
    token_a,
    user_a,
    token_b,
    user_b,
    integration,
    lines,
):
    file_id = None
    share_id = None
    draft_id = None
    draft_removed = False
    share_revoked = False
    fixture_name = "s7-expired-share-" + uuid.uuid4().hex + ".txt"
    marker = "S7-DRAFT-" + uuid.uuid4().hex
    content = b"BeeApp S7 isolated expiration test fixture!\n"
    if len(content) != 44:
        raise RuntimeError("Longitud inesperada del fixture.")
    boundary = "beeapp-s7-" + uuid.uuid4().hex
    multipart = (
        ("--" + boundary + "\r\n"
         + 'Content-Disposition: form-data; name="file"; filename="'
         + fixture_name + '"\r\n'
         + "Content-Type: text/plain\r\n\r\n").encode("ascii")
        + content
        + ("\r\n--" + boundary + "--\r\n").encode("ascii")
    )

    try:
        upload = urllib.request.Request(
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
            with urllib.request.urlopen(upload, timeout=40) as response:
                upload_status, raw = response.status, response.read(262144)
        except urllib.error.HTTPError as error:
            upload_status, raw = error.code, error.read(262144)
        payload = parse(raw)
        files = payload.get("files") if isinstance(payload, dict) else None
        lines.append(
            f"DIAGNÓSTICO | upload HTTP {upload_status} | "
            f"JSON objeto={isinstance(payload, dict)} | "
            f"lista files={isinstance(files, list)} | "
            f"cantidad={len(files) if isinstance(files, list) else 0}"
        )
        if upload_status != 201 or not isinstance(files, list) or len(files) != 1:
            raise RuntimeError(f"Upload aislado falló: HTTP {upload_status}")
        record = files[0]
        if (
            record.get("owner_id") != str(user_a)
            or record.get("status") != "ready"
            or record.get("original_name") != fixture_name
            or not record.get("id")
        ):
            raise RuntimeError("Upload no acreditó archivo propio listo.")
        file_id = str(record["id"])
        lines.append(f"PASS | archivo aislado creado | file_id={file_id}")

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=90)
        file_endpoint = (
            backend + "/api/storage/files/" + quote(file_id, safe="") + "/"
        )
        status, raw = request(
            "POST", file_endpoint + "shares/", token=token_a,
            body={
                "recipient_id": str(user_b),
                "expires_at": expires_at.isoformat(),
            },
        )
        share = (parse(raw) or {}).get("share") if status == 201 else None
        if not isinstance(share, dict) or not share.get("id"):
            raise RuntimeError(f"Share temporal falló: HTTP {status}")
        share_id = str(share["id"])
        lines.append(f"PASS | share temporal creado | share_id={share_id}")

        status, raw = request(
            "POST", backend + "/api/mail/drafts/", token=token_b,
            body={
                "integration_id": str(integration["id"]),
                "to": [{"email": str(integration["provider_email"])}],
                "subject": marker,
                "body": "S7 draft expiration check; do not send.",
                "body_content_type": "text",
                "file_ids": [file_id],
            },
        )
        payload = parse(raw)
        message = payload.get("message") if isinstance(payload, dict) else None
        detail = payload.get("detail") if isinstance(payload, dict) else None
        words = str(detail).lower() if isinstance(detail, str) else ""
        categories = [
            label for label, terms in (
                ("oauth", ("oauth", "scope", "consent", "token")),
                ("attachment", ("adjunto", "attachment", "archivo", "file")),
                ("integration", ("integración", "integration", "provider")),
                ("validation", ("invalid", "inválid", "formato", "format")),
            ) if any(term in words for term in terms)
        ]
        lines.append(
            f"DIAGNÓSTICO | creación borrador HTTP {status} | "
            f"JSON objeto={isinstance(payload, dict)} | "
            f"message objeto={isinstance(message, dict)} | "
            f"categorías={','.join(categories) or 'ninguna'}"
        )
        if status != 201 or not isinstance(message, dict) or not message.get("id"):
            raise RuntimeError(f"Creación de borrador falló: HTTP {status}")
        draft_id = str(message["id"])
        attached = message.get("attachments")
        if (
            message.get("status") != "draft"
            or not isinstance(attached, list)
            or not any(
                str(item.get("storage_file_id")) == file_id
                and item.get("source") == "storage"
                for item in attached if isinstance(item, dict)
            )
        ):
            raise RuntimeError("Borrador no acredita adjunto Storage esperado.")
        lines.append(f"PASS | borrador con adjunto vigente | draft_id={draft_id}")

        while datetime.now(timezone.utc) <= expires_at + timedelta(seconds=3):
            time.sleep(0.5)
        lines.append("PASS | vencimiento superado antes del envío")

        endpoint = (
            backend + "/api/mail/messages/"
            + quote(draft_id, safe="") + "/"
        )
        status, raw = request("POST", endpoint + "send/", token=token_b, body={})
        payload = parse(raw)
        detail = payload.get("detail") if isinstance(payload, dict) else None
        if status == 200:
            lines.append(
                "FAIL | proveedor confirmó envío inesperado; "
                "revisar buzón antes de limpiar"
            )
        if (
            status != 400
            or not isinstance(detail, str)
            or "archivos adjuntos ya no está disponible" not in detail
        ):
            raise RuntimeError(
                f"Envío vencido no acreditó rechazo S7: HTTP {status}"
            )
        lines.append("PASS | envío vencido rechazado por S7 | HTTP 400")

        status, raw = request("GET", endpoint, token=token_b)
        payload = parse(raw)
        message = payload.get("message") if isinstance(payload, dict) else None
        if (
            status != 200
            or not isinstance(message, dict)
            or message.get("status") != "draft"
        ):
            raise RuntimeError(
                f"Borrador no permaneció sin enviar: HTTP {status}"
            )
        lines.append("PASS | mensaje permanece en estado draft")
    finally:
        if draft_id:
            endpoint = (
                backend + "/api/mail/messages/"
                + quote(draft_id, safe="") + "/draft/"
            )
            try:
                status, _ = request("DELETE", endpoint, token=token_b)
                draft_removed = status in (200, 204)
                lines.append(
                    ("PASS" if draft_removed else "FAIL")
                    + f" | eliminación de borrador | HTTP {status}"
                )
            except Exception:
                lines.append("FAIL | eliminación de borrador | error reservado")
        if share_id:
            try:
                status, _ = request(
                    "POST", backend + "/api/storage/shares/"
                    + quote(share_id, safe="") + "/revoke/",
                    token=token_a,
                )
                share_revoked = status == 200
                lines.append(
                    ("PASS" if share_revoked else "FAIL")
                    + f" | revocación de share | HTTP {status}"
                )
            except Exception:
                lines.append("FAIL | revocación de share | error reservado")
        if file_id and share_id and draft_removed and share_revoked:
            try:
                cleanup_isolated_fixture(
                    file_id=file_id, owner_id=user_a, share_id=share_id
                )
                lines.append("PASS | objeto, metadata y cuota limpiados")
            except Exception:
                lines.append(
                    "FAIL | limpieza de fixture | revisar IDs antes de reintentar"
                )
                raise
        elif file_id:
            lines.append(
                "PENDIENTE | archivo conservado por seguridad; revisar "
                "referencias del borrador antes de limpiar"
            )
        if file_id and share_id and not (draft_removed and share_revoked):
            raise RuntimeError("Limpieza incompleta; fixture identificado en reporte.")
