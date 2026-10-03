"""Draft payload and sent-snapshot helpers for Microsoft Graph."""

from __future__ import annotations

from typing import Any

from apps.mail.services.mail_provider_service import (
    normalize_body_content_type,
    normalize_recipients,
    normalize_text,
    validate_draft_content,
)
from apps.mail.services.microsoft_provider.message_normalizer import (
    normalize_string,
)


def build_draft_payload(
    *,
    to_recipients: list[dict[str, str | None]],
    cc_recipients: list[dict[str, str | None]],
    bcc_recipients: list[dict[str, str | None]],
    subject: str | None,
    body: str | None,
    body_content_type: str,
    attachments: list[dict[str, Any]],
) -> dict[str, Any]:
    """Validate compose input and map it to a Graph message payload."""
    normalized_to = normalize_recipients(to_recipients)
    normalized_cc = normalize_recipients(cc_recipients)
    normalized_bcc = normalize_recipients(bcc_recipients)
    normalized_subject = normalize_text(
        subject,
        max_length=1000,
        fallback="",
    ) or ""
    normalized_body = normalize_text(
        body,
        max_length=200_000,
        fallback="",
    ) or ""
    normalized_content_type = normalize_body_content_type(
        body_content_type
    )

    validate_draft_content(
        to_recipients=normalized_to,
        cc_recipients=normalized_cc,
        bcc_recipients=normalized_bcc,
        subject=normalized_subject,
        body=normalized_body,
        attachments=attachments,
    )

    return {
        "subject": normalized_subject,
        "body": {
            "contentType": (
                "HTML"
                if normalized_content_type == "html"
                else "Text"
            ),
            "content": normalized_body,
        },
        "toRecipients": serialize_recipients(normalized_to),
        "ccRecipients": serialize_recipients(normalized_cc),
        "bccRecipients": serialize_recipients(normalized_bcc),
    }


def serialize_recipients(
    recipients: list[dict[str, str | None]],
) -> list[dict[str, dict[str, str]]]:
    """Map normalized BeeApp recipients to Graph recipients."""
    return [
        {
            "emailAddress": {
                "address": recipient["email"],
                "name": recipient.get("display_name") or "",
            }
        }
        for recipient in recipients
    ]


def normalize_draft_snapshot(
    *,
    provider_message_id: str,
    draft_snapshot: dict[str, Any] | None,
) -> dict[str, Any]:
    """Create a bounded fallback sent-message snapshot."""
    snapshot = (
        draft_snapshot
        if isinstance(draft_snapshot, dict)
        else {}
    )
    raw_recipients = snapshot.get("recipients")
    recipients_data = (
        raw_recipients
        if isinstance(raw_recipients, dict)
        else {}
    )
    recipients = {
        "from": normalize_snapshot_recipients(
            recipients_data.get("from")
        ),
        "to": normalize_snapshot_recipients(
            recipients_data.get("to")
        ),
        "cc": normalize_snapshot_recipients(
            recipients_data.get("cc")
        ),
        "bcc": normalize_snapshot_recipients(
            recipients_data.get("bcc")
        ),
        "reply_to": normalize_snapshot_recipients(
            recipients_data.get("reply_to")
        ),
    }
    raw_attachments = snapshot.get("attachments")
    attachments = (
        raw_attachments
        if isinstance(raw_attachments, list)
        else []
    )
    attachment_count = int(
        snapshot.get("attachment_count") or len(attachments)
    )

    return {
        "provider_message_id": provider_message_id,
        "provider_thread_id": normalize_string(
            snapshot.get("provider_thread_id")
        ),
        "provider_conversation_id": normalize_string(
            snapshot.get("provider_conversation_id")
        ),
        "provider_change_key": normalize_string(
            snapshot.get("provider_change_key")
        ),
        "provider_etag": normalize_string(
            snapshot.get("provider_etag")
        ),
        "provider_web_link": normalize_string(
            snapshot.get("provider_web_link")
        ),
        "provider_created_at": normalize_string(
            snapshot.get("provider_created_at")
        ),
        "provider_updated_at": normalize_string(
            snapshot.get("provider_updated_at")
        ),
        "direction": "outbound",
        "status": "sent",
        "folder": "sent",
        "is_read": True,
        "is_starred": bool(snapshot.get("is_starred")),
        "is_archived": False,
        "is_spam": False,
        "is_trashed": False,
        "subject": normalize_text(
            snapshot.get("subject"),
            max_length=1000,
        ),
        "body_text": normalize_text(
            snapshot.get("body_text"),
            max_length=200_000,
        ),
        "body_html": normalize_text(
            snapshot.get("body_html"),
            max_length=200_000,
        ),
        "body_preview": normalize_text(
            snapshot.get("body_preview"),
            max_length=1000,
        ),
        "snippet": normalize_text(
            snapshot.get("snippet"),
            max_length=1000,
        ),
        "message_id_header": normalize_string(
            snapshot.get("message_id_header")
        ),
        "in_reply_to_header": normalize_string(
            snapshot.get("in_reply_to_header")
        ),
        "references_header": normalize_string(
            snapshot.get("references_header")
        ),
        "sent_at": normalize_string(snapshot.get("sent_at")),
        "received_at": None,
        "has_attachments": bool(
            snapshot.get("has_attachments") or attachments
        ),
        "attachment_count": attachment_count,
        "recipients": recipients,
        "attachments": attachments,
        "metadata": (
            snapshot.get("metadata")
            if isinstance(snapshot.get("metadata"), dict)
            else {}
        ),
    }


def normalize_snapshot_recipients(
    value: Any,
) -> list[dict[str, str | None]]:
    """Normalize a recipient list from an existing draft snapshot."""
    return normalize_recipients(value if isinstance(value, list) else [])
