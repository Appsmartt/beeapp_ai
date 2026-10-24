from __future__ import annotations

from typing import Any

from apps.mail.exceptions import MailSyncError

from .common import get_supabase


def replace_message_recipients(
    *,
    message_id: str,
    recipients: dict[str, Any],
) -> None:
    try:
        (
            get_supabase()
            .table("mail_message_recipients")
            .delete()
            .eq("message_id", message_id)
            .execute()
        )

        recipient_rows: list[dict[str, Any]] = []

        for recipient_kind in (
            "from",
            "to",
            "cc",
            "bcc",
            "reply_to",
        ):
            values = recipients.get(recipient_kind)

            if not isinstance(values, list):
                continue

            for position, recipient in enumerate(values):
                if not isinstance(recipient, dict):
                    continue

                email = str(recipient.get("email") or "").strip()

                if not email:
                    continue

                recipient_rows.append(
                    {
                        "message_id": message_id,
                        "recipient_kind": recipient_kind,
                        "email": email[:320],
                        "display_name": (
                            str(
                                recipient.get("display_name") or ""
                            ).strip()[:500]
                            or None
                        ),
                        "position": position,
                        "metadata": {},
                    }
                )

        if recipient_rows:
            (
                get_supabase()
                .table("mail_message_recipients")
                .insert(recipient_rows)
                .execute()
            )
    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar los destinatarios del correo."
        ) from error


def replace_message_attachments(
    *,
    message_id: str,
    attachments: list[dict[str, Any]],
) -> None:
    try:
        (
            get_supabase()
            .table("mail_message_attachments")
            .delete()
            .eq("message_id", message_id)
            .eq("source", "provider")
            .execute()
        )

        attachment_rows: list[dict[str, Any]] = []

        for attachment in attachments:
            if not isinstance(attachment, dict):
                continue

            filename = str(
                attachment.get("filename") or ""
            ).strip()

            if not filename:
                continue

            attachment_rows.append(
                {
                    "message_id": message_id,
                    "storage_file_id": None,
                    "source": "provider",
                    "provider_attachment_id": attachment.get(
                        "provider_attachment_id"
                    ),
                    "provider_message_attachment_id": attachment.get(
                        "provider_message_attachment_id"
                    ),
                    "filename": filename[:255],
                    "mime_type": (
                        str(
                            attachment.get("mime_type")
                            or "application/octet-stream"
                        ).strip()
                        or "application/octet-stream"
                    ),
                    "size_bytes": attachment.get("size_bytes"),
                    "content_id": attachment.get("content_id"),
                    "content_disposition": attachment.get(
                        "content_disposition"
                    ),
                    "is_inline": bool(attachment.get("is_inline")),
                    "checksum_sha256": attachment.get(
                        "checksum_sha256"
                    ),
                    "metadata": (
                        attachment.get("metadata")
                        if isinstance(attachment.get("metadata"), dict)
                        else {}
                    ),
                }
            )

        if attachment_rows:
            (
                get_supabase()
                .table("mail_message_attachments")
                .insert(attachment_rows)
                .execute()
            )
    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar los adjuntos del correo."
        ) from error
