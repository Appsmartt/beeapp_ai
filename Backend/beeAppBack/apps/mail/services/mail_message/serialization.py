from __future__ import annotations

from typing import Any

from .database import (
    get_mail_message_supabase,
    get_response_rows,
)


def serialize_mail_recipient(
    recipient: dict[str, Any] | None,
) -> dict[str, str | None] | None:
    if not recipient:
        return None

    email = str(recipient.get("email") or "").strip()

    if not email:
        return None

    display_name = str(
        recipient.get("display_name") or ""
    ).strip()

    return {
        "email": email,
        "display_name": display_name or None,
    }


def get_recipients_for_message_ids(
    *,
    message_ids: list[str],
) -> dict[str, list[dict[str, Any]]]:
    if not message_ids:
        return {}

    try:
        response = (
            get_mail_message_supabase()
            .table("mail_message_recipients")
            .select(
                "message_id,recipient_kind,email,"
                "display_name,position"
            )
            .in_("message_id", message_ids)
            .order("position")
            .execute()
        )

        result: dict[str, list[dict[str, Any]]] = {}

        for recipient in get_response_rows(response):
            message_id = str(
                recipient.get("message_id") or ""
            )

            if message_id:
                result.setdefault(message_id, []).append(
                    recipient
                )

        return result
    except Exception:
        return {}


def get_mail_message_attachments(
    *,
    message_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_mail_message_supabase()
            .table("mail_message_attachments")
            .select(
                "id,source,provider_attachment_id,"
                "provider_message_attachment_id,filename,"
                "mime_type,size_bytes,content_id,"
                "content_disposition,is_inline,metadata,"
                "created_at"
            )
            .eq("message_id", message_id)
            .order("created_at")
            .execute()
        )

        return get_response_rows(response)
    except Exception:
        return []


def serialize_mail_list_message(
    *,
    message: dict[str, Any],
    recipients: list[dict[str, Any]],
) -> dict[str, Any]:
    sender: dict[str, str | None] | None = None

    for recipient in recipients:
        if recipient.get("recipient_kind") == "from":
            sender = serialize_mail_recipient(recipient)
            break

    return {
        "id": message["id"],
        "mail_integration_id": message[
            "mail_integration_id"
        ],
        "provider": message["provider"],
        "provider_thread_id": message.get(
            "provider_thread_id"
        ),
        "provider_conversation_id": message.get(
            "provider_conversation_id"
        ),
        "direction": message["direction"],
        "status": message["status"],
        "folder": message["folder"],
        "is_read": bool(message["is_read"]),
        "is_starred": bool(message["is_starred"]),
        "subject": message.get("subject"),
        "body_preview": message.get("body_preview"),
        "snippet": message.get("snippet"),
        "sent_at": message.get("sent_at"),
        "received_at": message.get("received_at"),
        "has_attachments": bool(
            message["has_attachments"]
        ),
        "attachment_count": int(
            message["attachment_count"] or 0
        ),
        "sender": sender,
    }
