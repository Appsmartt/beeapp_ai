from __future__ import annotations

from typing import Any

from .common import utc_now_iso


def provider_message_is_unchanged(
    *,
    existing_message: dict[str, Any] | None,
    provider_message: dict[str, Any],
) -> bool:
    if not existing_message:
        return False

    provider_change_key = str(
        provider_message.get("provider_change_key") or ""
    ).strip()
    existing_change_key = str(
        existing_message.get("provider_change_key") or ""
    ).strip()

    if (
        provider_change_key
        and existing_change_key
        and provider_change_key == existing_change_key
    ):
        return True

    provider_etag = str(
        provider_message.get("provider_etag") or ""
    ).strip()
    existing_etag = str(
        existing_message.get("provider_etag") or ""
    ).strip()

    return bool(
        provider_etag
        and existing_etag
        and provider_etag == existing_etag
    )


def build_message_payload(
    *,
    user_id: str,
    integration: dict[str, Any],
    provider_message: dict[str, Any],
    existing_message: dict[str, Any] | None,
) -> dict[str, Any]:
    metadata = provider_message.get("metadata")
    normalized_metadata = metadata if isinstance(metadata, dict) else {}

    existing_metadata = (
        existing_message.get("metadata")
        if existing_message
        and isinstance(existing_message.get("metadata"), dict)
        else {}
    )
    merged_metadata = {
        **existing_metadata,
        **normalized_metadata,
        "last_synced_at": utc_now_iso(),
    }

    return {
        "user_id": user_id,
        "mail_integration_id": integration["id"],
        "provider": integration["provider"],
        "provider_message_id": provider_message["provider_message_id"],
        "provider_thread_id": provider_message.get("provider_thread_id"),
        "provider_conversation_id": provider_message.get(
            "provider_conversation_id"
        ),
        "provider_change_key": provider_message.get(
            "provider_change_key"
        ),
        "provider_etag": provider_message.get("provider_etag"),
        "provider_web_link": provider_message.get("provider_web_link"),
        "provider_created_at": provider_message.get(
            "provider_created_at"
        ),
        "provider_updated_at": provider_message.get(
            "provider_updated_at"
        ),
        "direction": provider_message["direction"],
        "status": provider_message["status"],
        "folder": provider_message["folder"],
        "is_read": bool(provider_message["is_read"]),
        "is_starred": bool(
            provider_message.get(
                "is_starred",
                existing_message.get("is_starred")
                if existing_message
                else False,
            )
        ),
        "is_archived": bool(provider_message["is_archived"]),
        "is_spam": bool(provider_message["is_spam"]),
        "is_trashed": bool(provider_message["is_trashed"]),
        "is_deleted_permanently": bool(
            existing_message.get("is_deleted_permanently")
            if existing_message
            else False
        ),
        "deleted_permanently_at": None,
        "subject": provider_message.get("subject"),
        "body_text": provider_message.get("body_text"),
        "body_html": provider_message.get("body_html"),
        "body_preview": provider_message.get("body_preview"),
        "snippet": provider_message.get("snippet"),
        "message_id_header": provider_message.get("message_id_header"),
        "in_reply_to_header": provider_message.get(
            "in_reply_to_header"
        ),
        "references_header": provider_message.get("references_header"),
        "sent_at": provider_message.get("sent_at"),
        "received_at": provider_message.get("received_at"),
        "has_attachments": bool(
            provider_message.get("has_attachments")
        ),
        "attachment_count": int(
            provider_message.get("attachment_count") or 0
        ),
        "is_provider_deleted": False,
        "provider_deleted_at": None,
        "last_synced_at": utc_now_iso(),
        "metadata": merged_metadata,
    }
