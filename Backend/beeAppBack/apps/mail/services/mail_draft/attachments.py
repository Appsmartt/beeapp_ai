from __future__ import annotations

from typing import Any

from apps.mail.exceptions import MailSyncError
from apps.mail.services.mail_provider_service import (
    MAX_MAIL_ATTACHMENT_SIZE_BYTES,
)
from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
)
from apps.storage.services.file_operations.file_access import (
    get_accessible_file,
)
from apps.storage.services.file_operations.file_mail_attachments import (
    get_file_content_for_mail_attachment,
)

from .database import get_supabase


def load_mail_attachments(
    *,
    user_id: str,
    file_ids: list[str] | None,
) -> list[dict[str, Any]]:
    attachments: list[dict[str, Any]] = []

    for file_id in file_ids or []:
        try:
            attachment = get_file_content_for_mail_attachment(
                user_id=user_id,
                file_id=str(file_id),
                max_size_bytes=MAX_MAIL_ATTACHMENT_SIZE_BYTES,
            )
        except StorageFileNotFoundError as error:
            raise MailSyncError(
                "Uno de los archivos seleccionados no fue encontrado."
            ) from error
        except StorageFileOperationError as error:
            raise MailSyncError(str(error)) from error

        attachments.append(attachment)

    return attachments


def replace_storage_attachment_links(
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
            .eq("source", "storage")
            .execute()
        )

        rows: list[dict[str, Any]] = []

        for attachment in attachments:
            rows.append(
                {
                    "message_id": message_id,
                    "storage_file_id": attachment[
                        "storage_file_id"
                    ],
                    "source": "storage",
                    "provider_attachment_id": None,
                    "provider_message_attachment_id": None,
                    "filename": attachment["filename"],
                    "mime_type": attachment["mime_type"],
                    "size_bytes": attachment["size_bytes"],
                    "content_id": None,
                    "content_disposition": "attachment",
                    "is_inline": False,
                    "checksum_sha256": None,
                    "metadata": attachment.get("metadata") or {},
                }
            )

        if rows:
            (
                get_supabase()
                .table("mail_message_attachments")
                .insert(rows)
                .execute()
            )

    except Exception as error:
        raise MailSyncError(
            "No fue posible guardar los adjuntos del borrador."
        ) from error


def validate_draft_storage_attachment_access(
    *,
    user_id: str,
    attachments: list[dict[str, Any]],
) -> None:
    for attachment in attachments:
        if attachment.get("source") != "storage":
            continue

        file_id = str(attachment.get("storage_file_id") or "").strip()
        if not file_id:
            raise MailSyncError(
                "Uno de los archivos adjuntos ya no está disponible."
            )

        try:
            get_accessible_file(user_id=user_id, file_id=file_id)
        except StorageFileNotFoundError as error:
            raise MailSyncError(
                "Uno de los archivos adjuntos ya no está disponible."
            ) from error
