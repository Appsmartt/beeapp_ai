from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notes.exceptions import (
    NoteAttachmentError,
    NoteAttachmentFileNotFoundError,
    NoteAttachmentNotFoundError,
)

from .constants import (
    ATTACHMENT_COLUMNS,
    FILE_COLUMNS,
    extract_rpc_uuid,
)


def get_note_attachment_row(
    *,
    note_id: str,
    attachment_id: str,
) -> dict[str, Any]:
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

    return response.data


def get_files_by_ids(
    *,
    file_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not file_ids:
        return {}

    response = (
        get_supabase_admin_client()
        .table("files")
        .select(FILE_COLUMNS)
        .in_("id", file_ids)
        .eq("status", "ready")
        .execute()
    )

    return {
        file_record["id"]: file_record
        for file_record in (response.data or [])
    }


def get_attachable_owned_file(
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
            f"Could not retrieve selected file: {error}"
        ) from error


def get_or_create_notes_storage_folder(
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

        folder_id = extract_rpc_uuid(response.data)

        if not folder_id:
            raise NoteAttachmentError(
                "Notes storage folder could not be created."
            )

        return folder_id

    except NoteAttachmentError:
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not prepare notes storage folder: {error}"
        ) from error
