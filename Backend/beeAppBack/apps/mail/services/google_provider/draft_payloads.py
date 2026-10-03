"""Gmail draft payload construction and validation."""

from __future__ import annotations

import base64
from email.message import EmailMessage
from email.utils import formataddr
from typing import Any

from apps.mail.services.google_provider.message_parts import (
    GmailMessageParts,
)
from apps.mail.services.mail_provider_service import (
    MailProviderError,
    normalize_body_content_type,
    normalize_recipients,
    normalize_text,
    validate_draft_content,
    validate_mail_attachments,
    validate_sendable_draft,
)


class GmailDraftPayloadBuilder:
    """Build and validate Gmail RFC 822 draft payloads."""

    def __init__(self) -> None:
        self._message_parts = GmailMessageParts()

    def build_draft_message(
        self,
        *,
        to_recipients: list[dict[str, str | None]],
        cc_recipients: list[dict[str, str | None]],
        bcc_recipients: list[dict[str, str | None]],
        subject: str | None,
        body: str | None,
        body_content_type: str,
        attachments: list[dict[str, Any]],
    ) -> EmailMessage:
        normalized_to = normalize_recipients(to_recipients)
        normalized_cc = normalize_recipients(cc_recipients)
        normalized_bcc = normalize_recipients(bcc_recipients)
        normalized_subject = normalize_text(subject, max_length=1000)
        normalized_body = normalize_text(
            body,
            max_length=200_000,
            fallback="",
        ) or ""
        normalized_content_type = normalize_body_content_type(
            body_content_type
        )
        normalized_attachments = validate_mail_attachments(attachments)

        validate_draft_content(
            to_recipients=normalized_to,
            cc_recipients=normalized_cc,
            bcc_recipients=normalized_bcc,
            subject=normalized_subject,
            body=normalized_body,
            attachments=normalized_attachments,
        )

        message = EmailMessage()

        if normalized_to:
            message["To"] = self.format_recipients(normalized_to)
        if normalized_cc:
            message["Cc"] = self.format_recipients(normalized_cc)
        if normalized_bcc:
            message["Bcc"] = self.format_recipients(normalized_bcc)
        if normalized_subject:
            message["Subject"] = normalized_subject

        if normalized_content_type == "html":
            message.set_content(
                self._message_parts.html_to_text(normalized_body) or " "
            )
            message.add_alternative(
                normalized_body or " ",
                subtype="html",
            )
        else:
            message.set_content(normalized_body or " ")

        for attachment in normalized_attachments:
            maintype, separator, subtype = str(
                attachment["mime_type"]
            ).partition("/")
            message.add_attachment(
                attachment["content"],
                maintype=maintype or "application",
                subtype=subtype if separator and subtype else "octet-stream",
                filename=attachment["filename"],
            )

        return message

    def format_recipients(
        self,
        recipients: list[dict[str, str | None]],
    ) -> str:
        return ", ".join(
            formataddr(
                (
                    recipient.get("display_name") or "",
                    recipient["email"],
                )
            )
            for recipient in recipients
        )

    def encode_raw_message(self, message: EmailMessage) -> str:
        return base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode("ascii").rstrip("=")

    def required_draft_id(self, provider_draft_id: str | None) -> str:
        draft_id = str(provider_draft_id or "").strip()

        if not draft_id:
            raise MailProviderError(
                "No se encontró el identificador del borrador Gmail."
            )

        return draft_id

    def validate_draft_snapshot_for_send(
        self,
        *,
        draft_snapshot: dict[str, Any] | None,
    ) -> None:
        if not isinstance(draft_snapshot, dict):
            return

        recipients = draft_snapshot.get("recipients")

        if not isinstance(recipients, dict):
            return

        normalized_to = normalize_recipients(
            recipients.get("to")
            if isinstance(recipients.get("to"), list)
            else []
        )
        normalized_cc = normalize_recipients(
            recipients.get("cc")
            if isinstance(recipients.get("cc"), list)
            else []
        )
        normalized_bcc = normalize_recipients(
            recipients.get("bcc")
            if isinstance(recipients.get("bcc"), list)
            else []
        )

        validate_sendable_draft(
            to_recipients=normalized_to,
            cc_recipients=normalized_cc,
            bcc_recipients=normalized_bcc,
        )
