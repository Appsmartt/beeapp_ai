from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol


MAIL_MESSAGE_ACTIONS = (
    "mark_read",
    "mark_unread",
    "star",
    "unstar",
    "archive",
    "unarchive",
    "trash",
    "restore",
    "move",
)

MAIL_FOLDERS = (
    "inbox",
    "sent",
    "drafts",
    "archived",
    "spam",
    "trash",
)

MAIL_BODY_CONTENT_TYPES = (
    "text",
    "html",
)

MAX_MAIL_ATTACHMENTS = 10
MAX_MAIL_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024
MAX_MAIL_ATTACHMENTS_TOTAL_SIZE_BYTES = 10 * 1024 * 1024


class MailProviderError(Exception):
    """Error returned by Gmail or Microsoft Graph."""


class ExternalMailProvider(Protocol):
    provider: str

    def list_message_ids(
        self,
        *,
        access_token: str,
        after: datetime,
        max_results: int,
    ) -> tuple[list[str], str | None]:
        """
        Return provider message IDs and the latest provider cursor.

        Gmail returns its current history ID. Microsoft Graph currently
        returns None because its delta-link synchronization is not yet used.
        """

    def get_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
    ) -> dict[str, Any]:
        """Return a normalized message compatible with Mail services."""

    def update_message_state(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        is_read: bool | None = None,
        is_starred: bool | None = None,
    ) -> dict[str, Any]:
        """Update read and/or starred state remotely."""

    def move_message(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        folder: str,
    ) -> dict[str, Any]:
        """Move a remote message to a BeeApp standard folder."""

    def create_draft(
        self,
        *,
        access_token: str,
        to_recipients: list[dict[str, str | None]],
        cc_recipients: list[dict[str, str | None]],
        bcc_recipients: list[dict[str, str | None]],
        subject: str | None,
        body: str | None,
        body_content_type: str,
        attachments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Create a draft in the remote provider."""

    def update_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
        to_recipients: list[dict[str, str | None]],
        cc_recipients: list[dict[str, str | None]],
        bcc_recipients: list[dict[str, str | None]],
        subject: str | None,
        body: str | None,
        body_content_type: str,
        attachments: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Replace a remote draft's compose fields and attachments."""

    def delete_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
    ) -> None:
        """Permanently delete a remote draft."""

    def send_draft(
        self,
        *,
        access_token: str,
        provider_message_id: str,
        provider_draft_id: str | None,
        draft_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Send a remote draft and return a normalized sent message.

        Gmail returns the newly created sent Message directly. Microsoft
        Graph returns 202 without a resource, so its provider may return
        a safe local sent-message snapshot while a later sync resolves
        the final Sent Items resource.
        """


def normalize_email_address(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip().lower()

    if not normalized:
        return None

    return normalized[:320]


def normalize_text(
    value: Any,
    *,
    max_length: int,
    fallback: str | None = None,
) -> str | None:
    if value is None:
        return fallback

    normalized = str(value).strip()

    if not normalized:
        return fallback

    return normalized[:max_length]


def normalize_mail_folder(
    value: str,
) -> str:
    folder = str(value or "").strip().lower()

    if folder not in MAIL_FOLDERS:
        raise MailProviderError(
            "La carpeta de correo no es compatible."
        )

    return folder


def normalize_body_content_type(
    value: str,
) -> str:
    content_type = str(value or "").strip().lower()

    if content_type not in MAIL_BODY_CONTENT_TYPES:
        raise MailProviderError(
            "El tipo de contenido del correo no es compatible."
        )

    return content_type


def validate_message_state_update(
    *,
    is_read: bool | None,
    is_starred: bool | None,
) -> None:
    if is_read is None and is_starred is None:
        raise MailProviderError(
            "Debes indicar al menos un estado para actualizar."
        )


def normalize_recipients(
    recipients: list[dict[str, str | None]] | None,
) -> list[dict[str, str | None]]:
    normalized_recipients: list[dict[str, str | None]] = []
    existing_emails: set[str] = set()

    for recipient in recipients or []:
        if not isinstance(recipient, dict):
            continue

        email = normalize_email_address(
            str(recipient.get("email") or "")
        )

        if not email or email in existing_emails:
            continue

        display_name = normalize_text(
            recipient.get("display_name"),
            max_length=255,
        )

        normalized_recipients.append(
            {
                "email": email,
                "display_name": display_name,
            }
        )
        existing_emails.add(email)

    return normalized_recipients


def validate_draft_content(
    *,
    to_recipients: list[dict[str, str | None]],
    cc_recipients: list[dict[str, str | None]],
    bcc_recipients: list[dict[str, str | None]],
    subject: str | None,
    body: str | None,
    attachments: list[dict[str, Any]] | None = None,
) -> None:
    has_recipient = bool(
        to_recipients
        or cc_recipients
        or bcc_recipients
    )
    has_subject = bool(
        normalize_text(subject, max_length=1000)
    )
    has_body = bool(
        normalize_text(body, max_length=200_000)
    )
    has_attachments = bool(attachments)

    if not (
        has_recipient
        or has_subject
        or has_body
        or has_attachments
    ):
        raise MailProviderError(
            "El borrador debe tener al menos un destinatario, "
            "asunto, contenido o adjunto."
        )


def validate_sendable_draft(
    *,
    to_recipients: list[dict[str, str | None]],
    cc_recipients: list[dict[str, str | None]],
    bcc_recipients: list[dict[str, str | None]],
) -> None:
    """
    Providers may store incomplete drafts, but no email can be sent unless
    it has at least one effective recipient.

    CC and BCC are accepted here because SMTP/Gmail/Graph allow messages
    addressed only through those headers. The mobile UI still requires a
    primary To recipient for its standard compose experience.
    """
    if not (
        to_recipients
        or cc_recipients
        or bcc_recipients
    ):
        raise MailProviderError(
            "Agrega al menos un destinatario antes de enviar."
        )


def validate_mail_attachments(
    attachments: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    normalized_attachments: list[dict[str, Any]] = []
    total_size_bytes = 0
    seen_storage_file_ids: set[str] = set()

    for attachment in attachments or []:
        if not isinstance(attachment, dict):
            continue

        storage_file_id = str(
            attachment.get("storage_file_id") or ""
        ).strip()

        filename = str(
            attachment.get("filename") or ""
        ).strip()

        mime_type = str(
            attachment.get("mime_type")
            or "application/octet-stream"
        ).strip() or "application/octet-stream"

        content = attachment.get("content")

        if (
            not storage_file_id
            or not filename
            or not isinstance(content, bytes)
            or not content
        ):
            raise MailProviderError(
                "Uno de los adjuntos no es válido."
            )

        if storage_file_id in seen_storage_file_ids:
            continue

        size_bytes = len(content)

        if size_bytes > MAX_MAIL_ATTACHMENT_SIZE_BYTES:
            raise MailProviderError(
                "Cada adjunto debe ser de 3 MB o menos."
            )

        total_size_bytes += size_bytes

        if total_size_bytes > MAX_MAIL_ATTACHMENTS_TOTAL_SIZE_BYTES:
            raise MailProviderError(
                "Los adjuntos no pueden superar 10 MB en total."
            )

        normalized_attachments.append(
            {
                **attachment,
                "storage_file_id": storage_file_id,
                "filename": filename[:255],
                "mime_type": mime_type[:255],
                "size_bytes": size_bytes,
                "content": content,
            }
        )
        seen_storage_file_ids.add(storage_file_id)

        if len(normalized_attachments) >= MAX_MAIL_ATTACHMENTS:
            break

    requested_file_ids = {
        str(item.get("storage_file_id") or "").strip()
        for item in attachments or []
        if isinstance(item, dict)
        and str(item.get("storage_file_id") or "").strip()
    }

    if len(normalized_attachments) < len(requested_file_ids):
        raise MailProviderError(
            "Puedes adjuntar un máximo de 10 archivos."
        )

    return normalized_attachments