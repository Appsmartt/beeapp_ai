from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notes.exceptions import (
    NoteAttachmentError,
    NoteAttachmentFileNotFoundError,
    NoteAttachmentNotFoundError,
    NoteNotFoundError,
)
from apps.notes.services.note_service import (
    get_owned_note,
)
from apps.storage.exceptions import (
    StorageQuotaExceededError,
    StorageUploadError,
)
from apps.storage.services.storage_file_service import (
    prepare_and_upload_file,
)


ATTACHMENT_COLUMNS = (
    "id,note_id,file_id,attachment_type,display_order,created_at"
)

FILE_COLUMNS = (
    "id,owner_id,folder_id,original_name,display_name,"
    "extension,mime_type,kind,size_bytes,status,is_starred,"
    "trashed_at,purge_after,created_at,updated_at"
)


def list_note_attachments(
    *,
    user_id: str,
    note_id: str,
) -> list[dict[str, Any]]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=True,
        )

        response = (
            get_supabase_admin_client()
            .table("note_attachments")
            .select(ATTACHMENT_COLUMNS)
            .eq("note_id", str(note_id))
            .order("display_order")
            .order("created_at")
            .execute()
        )

        attachments = response.data or []

        if not attachments:
            return []

        file_ids = [
            attachment["file_id"]
            for attachment in attachments
            if attachment.get("file_id")
        ]

        files_by_id = _get_owned_files_by_ids(
            user_id=user_id,
            file_ids=file_ids,
        )

        return [
            {
                **attachment,
                "file": files_by_id[attachment["file_id"]],
            }
            for attachment in attachments
            if attachment.get("file_id") in files_by_id
        ]

    except NoteNotFoundError:
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not retrieve note attachments: {error}"
        ) from error


def attach_existing_file(
    *,
    user_id: str,
    note_id: str,
    file_id: str,
    attachment_type: str = "attachment",
    display_order: int = 0,
) -> dict[str, Any]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )

        _get_attachable_owned_file(
            user_id=user_id,
            file_id=file_id,
        )

        response = (
            get_supabase_admin_client()
            .rpc(
                "attach_file_to_note",
                {
                    "p_user_id": str(user_id),
                    "p_note_id": str(note_id),
                    "p_file_id": str(file_id),
                    "p_attachment_type": attachment_type,
                    "p_display_order": display_order,
                },
            )
            .execute()
        )

        attachment_id = response.data

        if isinstance(attachment_id, list):
            attachment_id = (
                attachment_id[0]
                if attachment_id
                else None
            )

        if isinstance(attachment_id, dict):
            attachment_id = (
                attachment_id.get("attach_file_to_note")
                or attachment_id.get("id")
            )

        if not attachment_id:
            raise NoteAttachmentError(
                "Supabase did not return the note attachment ID."
            )

        return get_note_attachment(
            user_id=user_id,
            note_id=note_id,
            attachment_id=str(attachment_id),
        )

    except (
        NoteAttachmentError,
        NoteAttachmentFileNotFoundError,
        NoteNotFoundError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "NOTE_ATTACHMENT_FILE_NOT_AVAILABLE" in message:
            raise NoteAttachmentFileNotFoundError(
                "The selected file is unavailable for attachment."
            ) from error

        if "NOTE_NOT_FOUND" in message:
            raise NoteNotFoundError(
                "Note was not found."
            ) from error

        raise NoteAttachmentError(
            f"Could not attach file to note: {message}"
        ) from error


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

        notes_folder_id = _get_or_create_notes_storage_folder(
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


def get_note_attachment(
    *,
    user_id: str,
    note_id: str,
    attachment_id: str,
) -> dict[str, Any]:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=True,
        )

        response = (
            get_supabase_admin_client()
            .table("note_attachments")
            .select(ATTACHMENT_COLUMNS)
            .eq("id", str(attachment_id))
            .eq("note_id", str(note_id))
            .maybe_single()
            .execute()
        )

        if not response.data:
            raise NoteAttachmentNotFoundError(
                "Note attachment was not found."
            )

        attachment = response.data

        file_record = _get_attachable_owned_file(
            user_id=user_id,
            file_id=attachment["file_id"],
        )

        return {
            **attachment,
            "file": file_record,
        }

    except (
        NoteAttachmentNotFoundError,
        NoteAttachmentFileNotFoundError,
        NoteNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteAttachmentNotFoundError(
            f"Could not retrieve note attachment: {error}"
        ) from error


def update_note_attachment(
    *,
    user_id: str,
    note_id: str,
    attachment_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    try:
        get_note_attachment(
            user_id=user_id,
            note_id=note_id,
            attachment_id=attachment_id,
        )

        response = (
            get_supabase_admin_client()
            .table("note_attachments")
            .update(payload)
            .eq("id", str(attachment_id))
            .eq("note_id", str(note_id))
            .execute()
        )

        if not response.data:
            raise NoteAttachmentError(
                "Supabase did not return the updated attachment."
            )

        return get_note_attachment(
            user_id=user_id,
            note_id=note_id,
            attachment_id=attachment_id,
        )

    except (
        NoteAttachmentError,
        NoteAttachmentNotFoundError,
        NoteNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not update note attachment: {error}"
        ) from error


def remove_note_attachment(
    *,
    user_id: str,
    note_id: str,
    attachment_id: str,
) -> None:
    try:
        get_note_attachment(
            user_id=user_id,
            note_id=note_id,
            attachment_id=attachment_id,
        )

        response = (
            get_supabase_admin_client()
            .table("note_attachments")
            .delete()
            .eq("id", str(attachment_id))
            .eq("note_id", str(note_id))
            .execute()
        )

        if response.data is None:
            raise NoteAttachmentError(
                "Supabase did not confirm attachment removal."
            )

    except (
        NoteAttachmentError,
        NoteAttachmentNotFoundError,
        NoteNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not remove note attachment: {error}"
        ) from error


def _get_or_create_notes_storage_folder(
    *,
    user_id: str,
) -> str:
    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "get_or_create_notes_storage_folder",
                {
                    "p_user_id": str(user_id),
                },
            )
            .execute()
        )

        folder_id = response.data

        if isinstance(folder_id, list):
            folder_id = folder_id[0] if folder_id else None

        if isinstance(folder_id, dict):
            folder_id = (
                folder_id.get("get_or_create_notes_storage_folder")
                or folder_id.get("id")
            )

        if not folder_id:
            raise NoteAttachmentError(
                "Notes storage folder could not be created."
            )

        return str(folder_id)

    except NoteAttachmentError:
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not prepare notes storage folder: {error}"
        ) from error


def _get_attachable_owned_file(
    *,
    user_id: str,
    file_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("files")
            .select(FILE_COLUMNS)
            .eq("id", str(file_id))
            .eq("owner_id", str(user_id))
            .eq("status", "ready")
            .maybe_single()
            .execute()
        )

        if not response.data:
            raise NoteAttachmentFileNotFoundError(
                "The selected file was not found."
            )

        return response.data

    except NoteAttachmentFileNotFoundError:
        raise

    except Exception as error:
        raise NoteAttachmentFileNotFoundError(
            f"Could not retrieve the selected file: {error}"
        ) from error


def _get_owned_files_by_ids(
    *,
    user_id: str,
    file_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not file_ids:
        return {}

    response = (
        get_supabase_admin_client()
        .table("files")
        .select(FILE_COLUMNS)
        .eq("owner_id", str(user_id))
        .in_("id", file_ids)
        .execute()
    )

    return {
        file_record["id"]: file_record
        for file_record in (response.data or [])
    }