"""Normalization helpers for Gmail API messages."""

from __future__ import annotations

from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.utils import getaddresses, parsedate_to_datetime
from typing import Any

from apps.mail.services.google_provider.message_parts import (
    GmailMessageParts,
)
from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_email_address,
    normalize_text,
)


class GmailMessageNormalizer(GmailMessageParts):
    def normalize_message(
        self,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        provider_message_id = str(
            data.get("id") or ""
        ).strip()

        if not provider_message_id:
            raise MailProviderError(
                "Gmail devolvió un mensaje sin identificador."
            )

        payload = data.get("payload")

        if not isinstance(payload, dict):
            payload = {}

        headers = self.header_map(payload.get("headers"))

        label_ids = [
            str(label).strip()
            for label in (data.get("labelIds") or [])
            if str(label).strip()
        ]

        body_text, body_html = self.extract_bodies(payload)

        snippet = normalize_text(
            data.get("snippet"),
            max_length=1000,
        )

        subject = self.decode_header(
            headers.get("subject")
        )

        sent_at = self.parse_header_datetime(
            headers.get("date")
        )

        internal_date = self.parse_internal_date(
            data.get("internalDate")
        )

        received_at = internal_date or sent_at

        recipients = {
            "from": self.parse_addresses(
                headers.get("from"),
            ),
            "to": self.parse_addresses(
                headers.get("to"),
            ),
            "cc": self.parse_addresses(
                headers.get("cc"),
            ),
            "bcc": self.parse_addresses(
                headers.get("bcc"),
            ),
            "reply_to": self.parse_addresses(
                headers.get("reply-to"),
            ),
        }

        attachments = self.extract_attachments(payload)

        folder = self.map_folder(label_ids)

        is_trashed = "TRASH" in label_ids
        is_spam = "SPAM" in label_ids
        is_archived = (
            "INBOX" not in label_ids
            and "SENT" not in label_ids
            and "DRAFT" not in label_ids
            and not is_spam
            and not is_trashed
        )

        return {
            "provider_message_id": provider_message_id,
            "provider_thread_id": (
                str(data.get("threadId") or "").strip()
                or None
            ),
            "provider_conversation_id": (
                str(data.get("threadId") or "").strip()
                or None
            ),
            "provider_change_key": str(
                data.get("historyId") or ""
            ).strip()
            or None,
            "provider_etag": None,
            "provider_web_link": None,
            "provider_created_at": internal_date,
            "provider_updated_at": internal_date,
            "direction": (
                "outbound"
                if "SENT" in label_ids
                else "inbound"
            ),
            "status": self.map_status(label_ids),
            "folder": folder,
            "is_read": "UNREAD" not in label_ids,
            "is_starred": "STARRED" in label_ids,
            "is_archived": is_archived,
            "is_spam": is_spam,
            "is_trashed": is_trashed,
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
            "body_preview": snippet,
            "snippet": snippet,
            "message_id_header": headers.get("message-id"),
            "in_reply_to_header": headers.get("in-reply-to"),
            "references_header": headers.get("references"),
            "sent_at": sent_at,
            "received_at": received_at,
            "has_attachments": bool(attachments),
            "attachment_count": len(attachments),
            "recipients": recipients,
            "attachments": attachments,
            "metadata": {
                "gmail_label_ids": label_ids,
                "gmail_size_estimate": data.get("sizeEstimate"),
                "gmail_history_id": data.get("historyId"),
                "gmail_raw_headers": {
                    key: value
                    for key, value in headers.items()
                    if key in {
                        "from",
                        "to",
                        "cc",
                        "bcc",
                        "reply-to",
                        "date",
                        "message-id",
                        "in-reply-to",
                        "references",
                    }
                },
            },
        }

    def header_map(
        self,
        raw_headers: Any,
    ) -> dict[str, str]:
        if not isinstance(raw_headers, list):
            return {}

        result: dict[str, str] = {}

        for header in raw_headers:
            if not isinstance(header, dict):
                continue

            name = str(header.get("name") or "").strip().lower()
            value = str(header.get("value") or "").strip()

            if name and value and name not in result:
                result[name] = value

        return result

    def decode_header(
        self,
        value: str | None,
    ) -> str | None:
        if not value:
            return None

        try:
            return str(make_header(decode_header(value))).strip() or None
        except Exception:
            return normalize_text(
                value,
                max_length=1000,
            )

    def parse_addresses(
        self,
        value: str | None,
    ) -> list[dict[str, str | None]]:
        if not value:
            return []

        result: list[dict[str, str | None]] = []

        for display_name, email in getaddresses([value]):
            normalized_email = normalize_email_address(email)

            if not normalized_email:
                continue

            result.append(
                {
                    "email": normalized_email,
                    "display_name": (
                        self.decode_header(display_name)
                        if display_name
                        else None
                    ),
                }
            )

        return result

    def parse_header_datetime(
        self,
        value: str | None,
    ) -> str | None:
        if not value:
            return None

        try:
            parsed = parsedate_to_datetime(value)

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)

            return parsed.astimezone(timezone.utc).isoformat()
        except Exception:
            return None

    def parse_internal_date(
        self,
        value: Any,
    ) -> str | None:
        try:
            milliseconds = int(str(value))
            parsed = datetime.fromtimestamp(
                milliseconds / 1000,
                tz=timezone.utc,
            )
            return parsed.isoformat()
        except Exception:
            return None

    def map_folder(
        self,
        label_ids: list[str],
    ) -> str:
        labels = set(label_ids)

        if "TRASH" in labels:
            return "trash"

        if "SPAM" in labels:
            return "spam"

        if "DRAFT" in labels:
            return "drafts"

        if "SENT" in labels:
            return "sent"

        if "INBOX" in labels:
            return "inbox"

        return "archived"

    def map_status(
        self,
        label_ids: list[str],
    ) -> str:
        labels = set(label_ids)

        if "TRASH" in labels:
            return "trashed"

        if "DRAFT" in labels:
            return "draft"

        if "SENT" in labels:
            return "sent"

        return "received"
