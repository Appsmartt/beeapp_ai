"""HTTP positive controls: owned and actively shared Storage attachments."""

import os
import time
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from test_s7_expired_file_shares_http import parse
from test_security_12_http import request


def _upload(backend, token, owner, label, lines):
    marker = uuid.uuid4().hex
    filename = f"s7-{label.lower()}-{marker}.txt"
    content = f"BeeApp S7 {label} attachment {marker}\n".encode("ascii")
    boundary = "beeapp-s7-" + uuid.uuid4().hex
    multipart = (
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            "Content-Type: text/plain\r\n\r\n"
        ).encode("ascii")
        + content
        + f"\r\n--{boundary}--\r\n".encode("ascii")
    )
    upload = urllib.request.Request(
        backend + "/api/storage/uploads/",
        data=multipart,
        headers={
            "Accept": "application/json",
            "Authorization": "Bearer " + token,
            "Content-Type": "multipart/form-data; boundary=" + boundary,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(upload, timeout=40) as response:
            status, raw = response.status, response.read(262144)
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read(262144)
    payload = parse(raw)
    files = payload.get("files") if isinstance(payload, dict) else None
    if status != 201 or not isinstance(files, list) or len(files) != 1:
        raise RuntimeError(f"{label}: upload HTTP {status}")
    record = files[0]
    if (
        not isinstance(record, dict)
        or str(record.get("owner_id")) != str(owner)
        or record.get("status") != "ready"
        or record.get("original_name") != filename
        or not record.get("id")
    ):
        raise RuntimeError(f"{label}: upload no acredita archivo propio")
    file_id = str(record["id"])
    lines.append(f"PASS | {label} | upload propio | file_id={file_id}")
    return file_id, filename, content


def _sync_and_find(backend, token, integration_id, subject, lines, label):
    for attempt in range(1, 5):
        status, raw = request(
            "POST", backend + "/api/mail/sync/", token=token,
            body={"integration_ids": [integration_id]},
        )
        payload = parse(raw)
        if (
            status != 200
            or not isinstance(payload, dict)
            or payload.get("synced_integration_count") != 1
            or payload.get("failed_integration_count") != 0
        ):
            raise RuntimeError(f"{label}: sincronización HTTP {status}")
        results = payload.get("results")
        if not isinstance(results, list) or len(results) != 1:
            raise RuntimeError(f"{label}: resultado de sync inesperado")
        skipped = results[0].get("skipped_message_count")
        lines.append(f"DIAGNÓSTICO | {label} | sync intento={attempt} | omitidos={skipped}")
        url = (
            backend + "/api/mail/messages/?integration_id="
            + quote(integration_id, safe="")
            + "&folder=inbox&search=" + quote(subject, safe="")
            + "&limit=100"
        )
        status, raw = request("GET", url, token=token)
        listing = parse(raw)
        messages = listing.get("messages") if isinstance(listing, dict) else None
        if status != 200 or not isinstance(messages, list):
            raise RuntimeError(f"{label}: listado inbox HTTP {status}")
        matches = [
            item for item in messages
            if isinstance(item, dict) and item.get("subject") == subject
            and item.get("id")
        ]
        if len(matches) == 1:
            return str(matches[0]["id"])
        if len(matches) > 1:
            raise RuntimeError(f"{label}: asunto duplicado en inbox")
        if attempt < 4:
            time.sleep(5)
    raise RuntimeError(f"{label}: correo no apareció en inbox tras cuatro sync")


def _send_and_verify(
    backend, token_b, integration, label, file_id, filename, content, lines
):
    subject = f"S7-{label}-{uuid.uuid4().hex}"
    recipient = str(integration["provider_email"])
    draft_id = None
    sent = False
    lines.append(f"DIAGNÓSTICO | {label} | destinatario={recipient} | asunto={subject}")
    try:
        status, raw = request(
            "POST", backend + "/api/mail/drafts/", token=token_b,
            body={
                "integration_id": str(integration["id"]),
                "to": [{"email": recipient}],
                "subject": subject,
                "body": f"BeeApp S7 {label} positive attachment control.",
                "body_content_type": "text",
                "file_ids": [file_id],
            },
        )
        payload = parse(raw)
        message = payload.get("message") if isinstance(payload, dict) else None
        if status != 201 or not isinstance(message, dict) or not message.get("id"):
            raise RuntimeError(f"{label}: creación borrador HTTP {status}")
        draft_id = str(message["id"])
        attached = message.get("attachments")
        if (
            message.get("status") != "draft"
            or not isinstance(attached, list)
            or not any(
                isinstance(item, dict)
                and str(item.get("storage_file_id")) == file_id
                and item.get("source") == "storage"
                for item in attached
            )
        ):
            raise RuntimeError(f"{label}: borrador sin adjunto Storage esperado")
        lines.append(f"PASS | {label} | borrador con adjunto | draft_id={draft_id}")

        status, raw = request(
            "POST",
            backend + "/api/mail/messages/" + quote(draft_id, safe="") + "/send/",
            token=token_b, body={},
        )
        payload = parse(raw)
        message = payload.get("message") if isinstance(payload, dict) else None
        if status != 200 or not isinstance(message, dict) or not message.get("id"):
            raise RuntimeError(f"{label}: envío HTTP {status}; estado desconocido")
        sent = True
        lines.append(f"PASS | {label} | envío HTTP 200 | sent_id={message['id']}")
        if os.environ.get("BEEAPP_S7_SKIP_SYNC") == "1":
            lines.append(
                f"PENDIENTE | {label} | recepción y descarga por verificar "
                f"| asunto={subject}"
            )
            return

        received_id = _sync_and_find(
            backend, token_b, str(integration["id"]), subject, lines, label
        )
        lines.append(f"PASS | {label} | recibido en inbox | received_id={received_id}")
        status, raw = request(
            "GET",
            backend + "/api/mail/messages/" + quote(received_id, safe="") + "/",
            token=token_b,
        )
        payload = parse(raw)
        received = payload.get("message") if isinstance(payload, dict) else None
        attachments = received.get("attachments") if isinstance(received, dict) else None
        matches = [
            item for item in attachments
            if isinstance(item, dict)
            and item.get("filename") == filename
            and item.get("id")
        ] if isinstance(attachments, list) else []
        if status != 200 or len(matches) != 1:
            raise RuntimeError(f"{label}: adjunto recibido no identificado")
        attachment_id = str(matches[0]["id"])
        status, downloaded = request(
            "GET",
            backend + "/api/mail/messages/"
            + quote(received_id, safe="")
            + "/attachments/"
            + quote(attachment_id, safe="")
            + "/download/",
            token=token_b,
        )
        if status != 200 or downloaded != content:
            raise RuntimeError(
                f"{label}: descarga HTTP {status} o bytes diferentes"
            )
        lines.append(
            f"PASS | {label} | adjunto descargado idéntico | "
            f"attachment_id={attachment_id} | bytes={len(content)}"
        )
    finally:
        if draft_id and not sent:
            lines.append(
                f"PENDIENTE | {label} | draft_id={draft_id} | "
                "estado de envío incierto; revisar antes de borrar"
            )


def run_positive_scenarios(
    *, backend, token_a, user_a, token_b, user_b, integration, lines
):
    if os.environ.get("BEEAPP_S7_CASE") != "shared":
        own_id, own_name, own_content = _upload(
            backend, token_b, user_b, "OWN", lines
        )
        lines.append(f"PENDIENTE | OWN | limpieza posterior | file_id={own_id}")
        _send_and_verify(
            backend, token_b, integration, "OWN",
            own_id, own_name, own_content, lines,
        )
    shared_id, shared_name, shared_content = _upload(
        backend, token_a, user_a, "SHARED", lines
    )
    lines.append(f"PENDIENTE | SHARED | limpieza posterior | file_id={shared_id}")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    status, raw = request(
        "POST",
        backend + "/api/storage/files/" + quote(shared_id, safe="") + "/shares/",
        token=token_a,
        body={
            "recipient_id": str(user_b),
            "expires_at": expires_at.isoformat(),
        },
    )
    payload = parse(raw)
    share = payload.get("share") if isinstance(payload, dict) else None
    if status != 201 or not isinstance(share, dict) or not share.get("id"):
        raise RuntimeError(f"SHARED: creación de share HTTP {status}")
    lines.append(f"PASS | SHARED | share vigente | share_id={share['id']}")
    _send_and_verify(
        backend, token_b, integration, "SHARED",
        shared_id, shared_name, shared_content, lines,
    )
