"""Normalization helpers for Microsoft Graph mail resources."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_email_address,
    normalize_mail_body_text,
    normalize_text,
)


def normalize_string(value: Any) -> str | None:
    """Return stripped text or None when the value is empty."""
    normalized = str(value or "").strip()
    return normalized or None


def normalize_datetime(value: Any) -> str | None:
    """Normalize a Graph datetime to an ISO UTC string when possible."""
    normalized = normalize_string(value)

    if not normalized:
        return None

    try:
        parsed = datetime.fromisoformat(
            normalized.replace("Z", "+00:00")
        )

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc).isoformat()
    except ValueError:
        return normalized


def safe_int(value: Any) -> int | None:
    """Convert a value to an integer without raising."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def html_to_text(value: str) -> str:
    """Produce bounded visible text from provider-controlled HTML."""
    text = value

    for marker in (
        "<br>",
        "<br/>",
        "<br />",
        "</p>",
        "</div>",
        "</li>",
    ):
        text = text.replace(marker, "\n")

    result: list[str] = []
    inside_tag = False

    for character in text:
        if character == "<":
            inside_tag = True
            continue

        if character == ">":
            inside_tag = False
            continue

        if not inside_tag:
            result.append(character)

    normalized = "".join(result)

    return "\n".join(
        line.strip()
        for line in normalized.splitlines()
        if line.strip()
    )[:50_000]


def parse_recipient(
    value: Any,
) -> dict[str, str | None] | None:
    """Normalize one Microsoft Graph recipient."""
    if not isinstance(value, dict):
        return None

    email_address = value.get("emailAddress")

    if not isinstance(email_address, dict):
        return None

    email = normalize_email_address(
        normalize_string(email_address.get("address"))
    )

    if not email:
        return None

    return {
        "email": email,
        "display_name": normalize_string(
            email_address.get("name")
        ),
    }


def parse_recipients(
    value: Any,
) -> list[dict[str, str | None]]:
    """Normalize a Graph recipient collection."""
    if not isinstance(value, list):
        return []

    recipients: list[dict[str, str | None]] = []

    for item in value:
        recipient = parse_recipient(item)

        if recipient:
            recipients.append(recipient)

    return recipients


def require_message_id(provider_message_id: str | None) -> str:
    """Require a non-empty Microsoft provider message identifier."""
    normalized_message_id = normalize_string(provider_message_id)

    if not normalized_message_id:
        raise MailProviderError(
            "El identificador del correo de Microsoft es inválido."
        )

    return normalized_message_id


def normalize_message(
    *,
    data: dict[str, Any],
    attachments: list[dict[str, Any]],
    attachments_loaded: bool,
    folder_cache: dict[str, str],
) -> dict[str, Any]:
    """Map a Microsoft Graph message to BeeApp's normalized schema."""
    provider_message_id = normalize_string(data.get("id"))

    if not provider_message_id:
        raise MailProviderError(
            "Microsoft Graph devolvió un mensaje sin identificador."
        )

    body = data.get("body")

    if not isinstance(body, dict):
        body = {}

    body_content = normalize_string(body.get("content"))
    body_type = str(
        body.get("contentType") or ""
    ).strip().lower()

    body_text: str | None = None
    body_html: str | None = None

    if body_type == "html":
        body_html = body_content
        body_text = normalize_mail_body_text(
            html_to_text(body_content) if body_content else None
        )
    else:
        body_text = normalize_mail_body_text(body_content)

    sender = parse_recipient(data.get("from"))
    recipients = {
        "from": [sender] if sender else [],
        "to": parse_recipients(data.get("toRecipients")),
        "cc": parse_recipients(data.get("ccRecipients")),
        "bcc": parse_recipients(data.get("bccRecipients")),
        "reply_to": parse_recipients(data.get("replyTo")),
    }

    is_draft = bool(data.get("isDraft"))
    sent_at = normalize_datetime(data.get("sentDateTime"))
    received_at = normalize_datetime(data.get("receivedDateTime"))
    direction = (
        "outbound"
        if is_draft or (sent_at and not received_at)
        else "inbound"
    )

    flag = data.get("flag")

    if not isinstance(flag, dict):
        flag = {}

    flag_status = str(
        flag.get("flagStatus") or ""
    ).strip().lower()
    parent_folder_id = normalize_string(data.get("parentFolderId"))
    folder = map_folder(
        parent_folder_id=parent_folder_id,
        is_draft=is_draft,
        folder_cache=folder_cache,
    )
    status = map_status(folder=folder, is_draft=is_draft)
    subject = normalize_text(data.get("subject"), max_length=1000)
    preview = normalize_text(data.get("bodyPreview"), max_length=1000)
    has_attachments = bool(data.get("hasAttachments"))

    return {
        "provider_message_id": provider_message_id,
        "provider_thread_id": normalize_string(
            data.get("conversationId")
        ),
        "provider_conversation_id": normalize_string(
            data.get("conversationId")
        ),
        "provider_change_key": normalize_string(
            data.get("changeKey")
        ),
        "provider_etag": normalize_string(data.get("@odata.etag")),
        "provider_web_link": normalize_string(data.get("webLink")),
        "provider_created_at": normalize_datetime(
            data.get("createdDateTime")
        ),
        "provider_updated_at": normalize_datetime(
            data.get("lastModifiedDateTime")
        ),
        "direction": direction,
        "status": status,
        "folder": folder,
        "is_read": bool(data.get("isRead")),
        "is_starred": flag_status == "flagged",
        "is_archived": folder == "archived",
        "is_spam": folder == "spam",
        "is_trashed": folder == "trash",
        "subject": subject,
        "body_text": body_text,
        "body_html": body_html,
        "body_preview": preview,
        "snippet": preview,
        "message_id_header": normalize_string(
            data.get("internetMessageId")
        ),
        "in_reply_to_header": None,
        "references_header": None,
        "sent_at": sent_at,
        "received_at": received_at,
        "has_attachments": has_attachments,
        "attachment_count": len(attachments),
        "recipients": recipients,
        "attachments": attachments,
        "metadata": {
            "microsoft_parent_folder_id": parent_folder_id,
            "microsoft_importance": data.get("importance"),
            "microsoft_flag_status": flag_status,
            "microsoft_body_content_type": body_type,
            "microsoft_attachments_loaded": attachments_loaded,
            "microsoft_uses_immutable_id": True,
        },
    }


def map_folder(
    *,
    parent_folder_id: str | None,
    is_draft: bool,
    folder_cache: dict[str, str],
) -> str:
    """Resolve a BeeApp folder from cached Microsoft folder IDs."""
    if is_draft:
        return "drafts"

    if parent_folder_id:
        for folder, folder_id in folder_cache.items():
            if parent_folder_id == folder_id:
                return folder

    return "inbox"


def map_status(
    *,
    folder: str,
    is_draft: bool,
) -> str:
    """Resolve BeeApp message status from the folder and draft flag."""
    if is_draft:
        return "draft"

    if folder == "sent":
        return "sent"

    if folder == "trash":
        return "trashed"

    return "received"
