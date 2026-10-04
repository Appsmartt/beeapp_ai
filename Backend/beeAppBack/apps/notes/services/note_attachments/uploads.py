from __future__ import annotations

from typing import Any

from apps.notes.exceptions import (
    NoteAttachmentError,
    NoteNotFoundError,
)
from apps.notes.services.note_service import (
    get_owned_note,
)
from apps.storage.exceptions import (
    StorageQuotaExceededError,
    StorageUploadError,
)
from apps.storage.services.file_operations.file_uploads import (
    prepare_and_upload_file,
)

from .operations import (
    attach_existing_file,
)
from .repository import (
    get_or_create_notes_storage_folder,
)


def upload_and_attach_files(
    *,
    user_id: str,
    note_id: str,
    uploaded_files: list,
    attachment_type: str = "attachment",
) -> dict[str, Any]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )

        notes_folder_id = get_or_create_notes_storage_folder(
            user_id=user_id,
        )
        successful_attachments: list[dict[str, Any]] = []
        failed_files: list[dict[str, str]] = []

        for index, uploaded_file in enumerate(uploaded_files):
            try:
                file_record = prepare_and_upload_file(
                    user_id=user_id,
                    uploaded_file=uploaded_file,
                    folder_id=notes_folder_id,
                )
                attachment = attach_existing_file(
                    user_id=user_id,
                    note_id=note_id,
                    file_id=str(file_record["id"]),
                    attachment_type=attachment_type,
                    display_order=index,
                )
                successful_attachments.append(attachment)

            except StorageQuotaExceededError as error:
                failed_files.append(
                    {
                        "name": getattr(
                            uploaded_file,
                        "name",
                        "Unknown file",
                        ),
                        "detail": str(error),
                        "code": "quota_exceeded",
                    }
                )

            except (
                StorageUploadError,
                NoteAttachmentError,
            ) as error:
                failed_files.append(
                    {
                        "name": getattr(
                            uploaded_file,
                        "name",
                        "Unknown file",
                        ),
                        "detail": str(error),
                        "code": "upload_failed",
                    }
                )

        return {
            "attachments": successful_attachments,
            "failed_files": failed_files,
            "success_count": len(successful_attachments),
            "failure_count": len(failed_files),
        }

    except NoteNotFoundError:
        raise

    except NoteAttachmentError:
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not upload note attachments: {error}"
        ) from error
