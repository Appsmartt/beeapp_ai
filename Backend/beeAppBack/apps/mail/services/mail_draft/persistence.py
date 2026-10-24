from __future__ import annotations

from typing import Any

from apps.mail.exceptions import MailSyncError
from apps.mail.services.mail_sync import (
    persist_provider_mail_message,
)

from .database import (
    extract_single,
    get_supabase,
    utc_now_iso,
)


def mark_draft_as_sent_from_snapshot(
    *,
    user_id: str,
    draft: dict[str, Any],
    integration: dict[str, Any],
    provider_message: dict[str, Any],
) -> str:
    try:
        now = utc_now_iso()

        existing_metadata = draft.get("metadata")
        provider_metadata = provider_message.get("metadata")

        metadata = {
            **(
                existing_metadata
                if isinstance(existing_metadata, dict)
                else {}
            ),
            **(
                provider_metadata
                if isinstance(provider_metadata, dict)
                else {}
            ),
            "last_synced_at": now,
        }

        payload = {
            "mail_integration_id": integration["id"],
            "provider": integration["provider"],
            "provider_message_id": (
                provider_message.get("provider_message_id")
                or draft["provider_message_id"]
            ),
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
            "provider_created_at": provider_message.get(
                "provider_created_at"
            ),
            "provider_updated_at": provider_message.get(
                "provider_updated_at"
            ),
            "direction": "outbound",
            "status": "sent",
            "folder": "sent",
            "is_read": True,
            "is_starred": bool(
                provider_message.get(
                    "is_starred",
                    draft.get("is_starred"),
                )
            ),
            "is_archived": False,
            "is_spam": False,
            "is_trashed": False,
            "is_deleted_permanently": False,
            "deleted_permanently_at": None,
            "subject": provider_message.get(
                "subject",
                draft.get("subject"),
            ),
            "body_text": provider_message.get(
                "body_text",
                draft.get("body_text"),
            ),
            "body_html": provider_message.get(
                "body_html",
                draft.get("body_html"),
            ),
            "body_preview": provider_message.get(
                "body_preview",
                draft.get("body_preview"),
            ),
            "snippet": provider_message.get(
                "snippet",
                draft.get("snippet"),
            ),
            "message_id_header": provider_message.get(
                "message_id_header",
                draft.get("message_id_header"),
            ),
            "in_reply_to_header": provider_message.get(
                "in_reply_to_header",
                draft.get("in_reply_to_header"),
            ),
            "references_header": provider_message.get(
                "references_header",
                draft.get("references_header"),
            ),
            "sent_at": (
                provider_message.get("sent_at")
                or draft.get("sent_at")
                or now
            ),
            "received_at": None,
            "has_attachments": bool(
                provider_message.get(
                    "has_attachments",
                    draft.get("has_attachments"),
                )
            ),
            "attachment_count": int(
                provider_message.get(
                    "attachment_count",
                    draft.get("attachment_count"),
                )
                or 0
            ),
            "is_provider_deleted": False,
            "provider_deleted_at": None,
            "last_synced_at": now,
            "metadata": metadata,
        }

        response = (
            get_supabase()
            .table("mail_messages")
            .update(payload)
            .eq("id", draft["id"])
            .eq("user_id", user_id)
            .execute()
        )
        saved_message = extract_single(response)

        if not saved_message:
            raise MailSyncError(
                "Microsoft confirmó el envío, pero BeeApp no pudo "
                "actualizar el correo local."
            )

        return str(saved_message["id"])

    except MailSyncError:
        raise

    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar el correo enviado por Microsoft."
        ) from error


def persist_sent_provider_message(
    *,
    user_id: str,
    draft: dict[str, Any],
    integration: dict[str, Any],
    provider_message: dict[str, Any],
) -> str:
    metadata = provider_message.get("metadata")

    is_microsoft_pending_sync = bool(
        isinstance(metadata, dict)
        and metadata.get(
            "microsoft_sent_message_pending_sync"
        )
    )

    if is_microsoft_pending_sync:
        return mark_draft_as_sent_from_snapshot(
            user_id=user_id,
            draft=draft,
            integration=integration,
            provider_message=provider_message,
        )

    saved_message = persist_provider_mail_message(
        user_id=user_id,
        integration=integration,
        provider_message=provider_message,
    )
    saved_message_id = str(saved_message["id"])

    if saved_message_id != str(draft["id"]):
        (
            get_supabase()
            .table("mail_messages")
            .delete()
            .eq("id", draft["id"])
            .eq("user_id", user_id)
            .execute()
        )

    return saved_message_id
