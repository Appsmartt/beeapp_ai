from __future__ import annotations

from typing import Any

from apps.mail.exceptions import MailMessageNotFoundError

from .database import (
    get_mail_message_supabase,
    get_response_single,
)
from .queries import get_mail_message


def persist_provider_message_update(
    *,
    message: dict[str, Any],
    provider_message: dict[str, Any],
) -> dict[str, Any]:
    try:
        provider_message_id = str(
            provider_message.get("provider_message_id") or ""
        ).strip()

        if not provider_message_id:
            raise MailMessageNotFoundError(
                "El proveedor no devolvió el correo actualizado."
            )

        payload = {
            "provider_message_id": provider_message_id,
            "provider_thread_id": provider_message.get(
                "provider_thread_id"
            ),
            "provider_conversation_id": provider_message.get(
                "provider_conversation_id"
            ),
            "provider_change_key": provider_message.get(
                "provider_change_key"
            ),
            "provider_etag": provider_message.get(
                "provider_etag"
            ),
            "provider_web_link": provider_message.get(
                "provider_web_link"
            ),
            "provider_updated_at": provider_message.get(
                "provider_updated_at"
            ),
            "direction": provider_message.get("direction"),
            "status": provider_message.get("status"),
            "folder": provider_message.get("folder"),
            "is_read": bool(provider_message.get("is_read")),
            "is_starred": bool(provider_message.get("is_starred")),
            "is_archived": bool(
                provider_message.get("is_archived")
            ),
            "is_spam": bool(provider_message.get("is_spam")),
            "is_trashed": bool(
                provider_message.get("is_trashed")
            ),
            "body_preview": provider_message.get(
                "body_preview"
            ),
            "snippet": provider_message.get("snippet"),
            "has_attachments": bool(
                provider_message.get("has_attachments")
            ),
            "attachment_count": int(
                provider_message.get("attachment_count") or 0
            ),
            "metadata": provider_message.get("metadata") or {},
            "is_provider_deleted": False,
            "provider_deleted_at": None,
            "last_synced_at": "now()",
        }

        response = (
            get_mail_message_supabase()
            .table("mail_messages")
            .update(payload)
            .eq("id", message["id"])
            .eq("user_id", message["user_id"])
            .execute()
        )

        updated_message = get_response_single(response)

        if not updated_message:
            raise MailMessageNotFoundError(
                "No fue posible guardar el correo actualizado."
            )

        return get_mail_message(
            user_id=message["user_id"],
            message_id=message["id"],
        )["message"]
    except MailMessageNotFoundError:
        raise
    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible guardar la actualización del correo."
        ) from error
