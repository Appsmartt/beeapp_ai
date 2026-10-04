from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.mail.exceptions import (
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailMessageNotFoundError,
    MailSyncError,
)

MAIL_INTEGRATION_ACTION_COLUMNS = (
    "id,user_id,integration_connection_id,provider,status,"
    "provider_account_id,provider_email,provider_display_name,"
    "metadata"
)


def get_supabase():
    return get_supabase_admin_client()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def get_active_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_ACTION_COLUMNS)
            .eq("id", integration_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        integration = extract_single(response)

        if not integration:
            raise MailIntegrationNotFoundError(
                "La integración de Email no fue encontrada."
            )

        if integration.get("status") != "active":
            raise MailIntegrationInactiveError(
                integration.get("last_error_message")
                or "La integración de Email requiere reconexión."
            )

        if not integration.get("integration_connection_id"):
            raise MailIntegrationInactiveError(
                "La integración de Email no tiene conexión OAuth."
            )

        provider = str(
            integration.get("provider") or ""
        ).strip().lower()

        if provider not in {"google", "microsoft"}:
            raise MailIntegrationInactiveError(
                "El proveedor de Email no es compatible."
            )

        return integration

    except (
        MailIntegrationNotFoundError,
        MailIntegrationInactiveError,
    ):
        raise

    except Exception as error:
        raise MailIntegrationNotFoundError(
            "No fue posible cargar la integración de Email."
        ) from error


def get_draft_message(
    *,
    user_id: str,
    message_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("mail_messages")
            .select(
                "id,user_id,mail_integration_id,provider,"
                "provider_message_id,provider_thread_id,"
                "provider_conversation_id,provider_change_key,"
                "provider_etag,provider_web_link,"
                "provider_created_at,provider_updated_at,"
                "direction,status,folder,is_read,is_starred,"
                "is_archived,is_spam,is_trashed,subject,"
                "body_text,body_html,body_preview,snippet,"
                "message_id_header,in_reply_to_header,"
                "references_header,sent_at,received_at,"
                "has_attachments,attachment_count,metadata,"
                "is_provider_deleted"
            )
            .eq("id", message_id)
            .eq("user_id", user_id)
            .eq("is_provider_deleted", False)
            .maybe_single()
            .execute()
        )
        message = extract_single(response)

        if not message:
            raise MailMessageNotFoundError(
                "El borrador no fue encontrado."
            )

        if (
            message.get("status") != "draft"
            or message.get("folder") != "drafts"
        ):
            raise MailMessageNotFoundError(
                "El correo indicado no es un borrador."
            )

        provider_message_id = str(
            message.get("provider_message_id") or ""
        ).strip()

        if not provider_message_id:
            raise MailMessageNotFoundError(
                "El borrador no tiene identificador del proveedor."
            )

        return message

    except MailMessageNotFoundError:
        raise

    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible cargar el borrador."
        ) from error


def get_message_recipients(
    *,
    message_id: str,
) -> dict[str, list[dict[str, str | None]]]:
    recipients: dict[str, list[dict[str, str | None]]] = {
        "from": [],
        "to": [],
        "cc": [],
        "bcc": [],
        "reply_to": [],
    }

    try:
        response = (
            get_supabase()
            .table("mail_message_recipients")
            .select(
                "recipient_kind,email,display_name,position"
            )
            .eq("message_id", message_id)
            .order("position")
            .execute()
        )

        for recipient in response_data(response):
            recipient_kind = str(
                recipient.get("recipient_kind") or ""
            ).strip()

            if recipient_kind not in recipients:
                continue

            email = str(recipient.get("email") or "").strip()

            if not email:
                continue

            recipients[recipient_kind].append(
                {
                    "email": email[:320],
                    "display_name": (
                        str(
                            recipient.get("display_name") or ""
                        ).strip()[:255]
                        or None
                    ),
                }
            )

        return recipients

    except Exception as error:
        raise MailSyncError(
            "No fue posible cargar los destinatarios del borrador."
        ) from error


def get_message_attachments(
    *,
    message_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase()
            .table("mail_message_attachments")
            .select(
                "id,storage_file_id,source,"
                "provider_attachment_id,"
                "provider_message_attachment_id,filename,"
                "mime_type,size_bytes,content_id,"
                "content_disposition,is_inline,"
                "checksum_sha256,metadata,created_at"
            )
            .eq("message_id", message_id)
            .order("created_at")
            .execute()
        )

        return response_data(response)

    except Exception as error:
        raise MailSyncError(
            "No fue posible cargar los adjuntos del borrador."
        ) from error
