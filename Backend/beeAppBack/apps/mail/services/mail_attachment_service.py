from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.integration_connection_service import (
    get_valid_google_access_token,
    get_valid_microsoft_access_token,
)
from apps.mail.exceptions import (
    MailAttachmentError,
    MailMessageNotFoundError,
)

MAX_DOWNLOADABLE_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
HTTP_TIMEOUT_SECONDS = 45.0

GOOGLE_GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1"
MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


@dataclass(frozen=True)
class MailAttachmentDownload:
    content: bytes
    filename: str
    content_type: str
    content_disposition: str


def _supabase():
    return get_supabase_admin_client()


def _extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _safe_filename(
    value: str | None,
) -> str:
    filename = str(value or "").strip()

    if not filename:
        return "adjunto"

    return (
        filename
        .replace("\r", "_")
        .replace("\n", "_")
        .replace('"', "_")
        .replace("/", "_")
        .replace("\\", "_")
    )[:255] or "adjunto"


def _safe_content_type(
    value: str | None,
) -> str:
    content_type = str(value or "").strip().lower()

    if not content_type:
        return "application/octet-stream"

    return content_type[:255]


def _get_download_context(
    *,
    user_id: str,
    message_id: str,
    attachment_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("mail_message_attachments")
            .select(
                "id,message_id,source,provider_attachment_id,"
                "provider_message_attachment_id,filename,mime_type,"
                "size_bytes,content_disposition,is_inline"
            )
            .eq("id", attachment_id)
            .eq("message_id", message_id)
            .maybe_single()
            .execute()
        )

        attachment = _extract_single(response)

        if not attachment:
            raise MailAttachmentError(
                "El adjunto no fue encontrado."
            )

        if attachment.get("source") != "provider":
            raise MailAttachmentError(
                "Este adjunto no está disponible para descarga."
            )

        message_response = (
            _supabase()
            .table("mail_messages")
            .select(
                "id,user_id,mail_integration_id,provider,"
                "provider_message_id,is_provider_deleted"
            )
            .eq("id", message_id)
            .eq("user_id", user_id)
            .eq("is_provider_deleted", False)
            .maybe_single()
            .execute()
        )

        message = _extract_single(message_response)

        if not message:
            raise MailMessageNotFoundError(
                "El correo no fue encontrado."
            )

        integration_response = (
            _supabase()
            .table("mail_integrations")
            .select(
                "id,user_id,provider,integration_connection_id,status"
            )
            .eq("id", message["mail_integration_id"])
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        integration = _extract_single(integration_response)

        if not integration:
            raise MailAttachmentError(
                "La integración de correo no fue encontrada."
            )

        if integration.get("status") != "active":
            raise MailAttachmentError(
                "La integración de correo no está activa."
            )

        if integration.get("provider") != message.get("provider"):
            raise MailAttachmentError(
                "La integración no coincide con el proveedor."
            )

        provider_message_id = str(
            message.get("provider_message_id") or ""
        ).strip()

        provider_attachment_id = str(
            attachment.get("provider_attachment_id")
            or attachment.get(
                "provider_message_attachment_id"
            )
            or ""
        ).strip()

        connection_id = str(
            integration.get("integration_connection_id") or ""
        ).strip()

        if not provider_message_id:
            raise MailAttachmentError(
                "El correo no tiene identificador del proveedor."
            )

        if not provider_attachment_id:
            raise MailAttachmentError(
                "El adjunto no tiene identificador del proveedor."
            )

        if not connection_id:
            raise MailAttachmentError(
                "La integración no tiene una conexión OAuth válida."
            )

        return {
            "attachment": attachment,
            "message": message,
            "integration": integration,
            "provider_message_id": provider_message_id,
            "provider_attachment_id": provider_attachment_id,
            "connection_id": connection_id,
        }

    except (
        MailAttachmentError,
        MailMessageNotFoundError,
    ):
        raise

    except Exception as error:
        raise MailAttachmentError(
            "No fue posible preparar la descarga del adjunto."
        ) from error


def _get_access_token(
    *,
    user_id: str,
    provider: str,
    connection_id: str,
) -> str:
    try:
        if provider == "google":
            return get_valid_google_access_token(
                user_id=user_id,
                connection_id=connection_id,
            )

        if provider == "microsoft":
            return get_valid_microsoft_access_token(
                user_id=user_id,
                connection_id=connection_id,
            )

    except IntegrationCredentialError as error:
        raise MailAttachmentError(
            "No fue posible obtener acceso a la cuenta de correo."
        ) from error

    raise MailAttachmentError(
        "El proveedor de correo no es compatible."
    )


def _validate_size(
    content: bytes,
    expected_size: int | None,
) -> None:
    if len(content) > MAX_DOWNLOADABLE_ATTACHMENT_SIZE_BYTES:
        raise MailAttachmentError(
            "El adjunto supera el límite de descarga de 10 MB."
        )

    if (
        expected_size is not None
        and expected_size > MAX_DOWNLOADABLE_ATTACHMENT_SIZE_BYTES
    ):
        raise MailAttachmentError(
            "El adjunto supera el límite de descarga de 10 MB."
        )


def _download_google_attachment(
    *,
    access_token: str,
    provider_message_id: str,
    provider_attachment_id: str,
    expected_size: int | None,
) -> bytes:
    url = (
        f"{GOOGLE_GMAIL_BASE_URL}/users/me/messages/"
        f"{quote(provider_message_id, safe='')}/attachments/"
        f"{quote(provider_attachment_id, safe='')}"
    )

    try:
        response = httpx.get(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise MailAttachmentError(
            "No fue posible contactar Gmail para descargar el adjunto."
        ) from error

    if response.status_code in (401, 403):
        raise MailAttachmentError(
            "La conexión con Gmail expiró o requiere reconexión."
        )

    if response.status_code == 404:
        raise MailAttachmentError(
            "El adjunto ya no está disponible en Gmail."
        )

    if response.status_code >= 400:
        raise MailAttachmentError(
            "Gmail no pudo entregar el adjunto."
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise MailAttachmentError(
            "Gmail devolvió una respuesta inválida para el adjunto."
        ) from error

    encoded_data = str(payload.get("data") or "").strip()

    if not encoded_data:
        raise MailAttachmentError(
            "Gmail no devolvió contenido para el adjunto."
        )

    try:
        padding = "=" * (-len(encoded_data) % 4)
        content = base64.urlsafe_b64decode(
            f"{encoded_data}{padding}"
        )
    except Exception as error:
        raise MailAttachmentError(
            "No fue posible procesar el adjunto de Gmail."
        ) from error

    _validate_size(content, expected_size)

    return content


def _download_microsoft_attachment(
    *,
    access_token: str,
    provider_message_id: str,
    provider_attachment_id: str,
    expected_size: int | None,
) -> bytes:
    url = (
        f"{MICROSOFT_GRAPH_BASE_URL}/me/messages/"
        f"{quote(provider_message_id, safe='')}/attachments/"
        f"{quote(provider_attachment_id, safe='')}/$value"
    )

    try:
        with httpx.stream(
            "GET",
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/octet-stream",
                "Prefer": 'IdType="ImmutableId"',
            },
            timeout=HTTP_TIMEOUT_SECONDS,
        ) as response:
            if response.status_code in (401, 403):
                raise MailAttachmentError(
                    "La conexión con Microsoft expiró o requiere reconexión."
                )

            if response.status_code == 404:
                raise MailAttachmentError(
                    "El adjunto ya no está disponible en Microsoft."
                )

            if response.status_code >= 400:
                raise MailAttachmentError(
                    "Microsoft no pudo entregar el adjunto."
                )

            chunks: list[bytes] = []
            total_size = 0

            for chunk in response.iter_bytes():
                total_size += len(chunk)

                if total_size > MAX_DOWNLOADABLE_ATTACHMENT_SIZE_BYTES:
                    raise MailAttachmentError(
                        "El adjunto supera el límite de descarga de 10 MB."
                    )

                chunks.append(chunk)

            content = b"".join(chunks)
    except MailAttachmentError:
        raise
    except httpx.HTTPError as error:
        raise MailAttachmentError(
            "No fue posible contactar Microsoft para descargar el adjunto."
        ) from error

    _validate_size(content, expected_size)

    return content


def download_mail_attachment(
    *,
    user_id: str,
    message_id: str,
    attachment_id: str,
) -> MailAttachmentDownload:
    context = _get_download_context(
        user_id=user_id,
        message_id=message_id,
        attachment_id=attachment_id,
    )

    attachment = context["attachment"]
    integration = context["integration"]

    expected_size = attachment.get("size_bytes")

    try:
        normalized_expected_size = (
            int(expected_size)
            if expected_size is not None
            else None
        )
    except (TypeError, ValueError):
        normalized_expected_size = None

    provider = str(
        integration.get("provider") or ""
    ).strip().lower()

    access_token = _get_access_token(
        user_id=user_id,
        provider=provider,
        connection_id=context["connection_id"],
    )

    if provider == "google":
        content = _download_google_attachment(
            access_token=access_token,
            provider_message_id=context["provider_message_id"],
            provider_attachment_id=context[
                "provider_attachment_id"
            ],
            expected_size=normalized_expected_size,
        )
    elif provider == "microsoft":
        content = _download_microsoft_attachment(
            access_token=access_token,
            provider_message_id=context["provider_message_id"],
            provider_attachment_id=context[
                "provider_attachment_id"
            ],
            expected_size=normalized_expected_size,
        )
    else:
        raise MailAttachmentError(
            "El proveedor de correo no es compatible."
        )

    return MailAttachmentDownload(
        content=content,
        filename=_safe_filename(attachment.get("filename")),
        content_type=_safe_content_type(
            attachment.get("mime_type")
        ),
        content_disposition=str(
            attachment.get("content_disposition")
            or "attachment"
        ).strip().lower()
        or "attachment",
    )
