from __future__ import annotations

from typing import Any

from apps.mail.exceptions import (
    MailMessageNotFoundError,
    MailSyncError,
)

from .database import (
    extract_single,
    get_message_attachments,
    get_message_recipients,
    get_supabase,
)


def build_draft_snapshot(
    *,
    draft: dict[str, Any],
) -> dict[str, Any]:
    recipients = get_message_recipients(
        message_id=str(draft["id"]),
    )
    attachments = get_message_attachments(
        message_id=str(draft["id"]),
    )

    metadata = draft.get("metadata")

    return {
        "provider_message_id": draft["provider_message_id"],
        "provider_thread_id": draft.get(
            "provider_thread_id"
        ),
        "provider_conversation_id": draft.get(
            "provider_conversation_id"
        ),
        "provider_change_key": draft.get(
            "provider_change_key"
        ),
        "provider_etag": draft.get("provider_etag"),
        "provider_web_link": draft.get(
            "provider_web_link"
        ),
        "provider_created_at": draft.get(
            "provider_created_at"
        ),
        "provider_updated_at": draft.get(
            "provider_updated_at"
        ),
        "direction": draft.get("direction") or "outbound",
        "status": draft.get("status") or "draft",
        "folder": draft.get("folder") or "drafts",
        "is_read": bool(draft.get("is_read")),
        "is_starred": bool(draft.get("is_starred")),
        "is_archived": bool(draft.get("is_archived")),
        "is_spam": bool(draft.get("is_spam")),
        "is_trashed": bool(draft.get("is_trashed")),
        "subject": draft.get("subject"),
        "body_text": draft.get("body_text"),
        "body_html": draft.get("body_html"),
        "body_preview": draft.get("body_preview"),
        "snippet": draft.get("snippet"),
        "message_id_header": draft.get(
            "message_id_header"
        ),
        "in_reply_to_header": draft.get(
            "in_reply_to_header"
        ),
        "references_header": draft.get(
            "references_header"
        ),
        "sent_at": draft.get("sent_at"),
        "received_at": draft.get("received_at"),
        "has_attachments": bool(
            draft.get("has_attachments")
            or attachments
        ),
        "attachment_count": int(
            draft.get("attachment_count") or len(attachments)
        ),
        "recipients": recipients,
        "attachments": attachments,
        "metadata": (
            metadata
            if isinstance(metadata, dict)
            else {}
        ),
    }


def serialize_message(
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
                "provider_conversation_id,direction,status,"
                "folder,is_read,is_starred,is_archived,is_spam,"
                "is_trashed,subject,body_text,body_html,"
                "body_preview,snippet,sent_at,received_at,"
                "has_attachments,attachment_count,metadata,"
                "created_at,updated_at"
            )
            .eq("id", message_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        message = extract_single(response)

        if not message:
            raise MailMessageNotFoundError(
                "No fue posible recuperar el correo guardado."
            )

        recipients = get_message_recipients(
            message_id=message_id,
        )
        attachments = get_message_attachments(
            message_id=message_id,
        )

        return {
            "message": {
                **message,
                "recipients": recipients,
                "attachments": attachments,
            }
        }

    except MailMessageNotFoundError:
        raise

    except MailSyncError as error:
        raise MailMessageNotFoundError(str(error)) from error

    except Exception as error:
        raise MailMessageNotFoundError(
            "No fue posible cargar el correo guardado."
        ) from error
