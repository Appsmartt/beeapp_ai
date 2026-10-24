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
    NoteShareNotFoundError,
)
from apps.notes.services.note_service import (
    get_owned_note,
)
from apps.storage.services.file_operations.constants import (
    SIGNED_URL_EXPIRES_IN_SECONDS,
)

from .access import (
    ensure_note_access,
)
from .constants import (
    ATTACHMENT_COLUMNS,
    FILE_COLUMNS,
    extract_rpc_uuid,
)
from .repository import (
    get_attachable_owned_file,
    get_files_by_ids,
    get_note_attachment_row,
)


def list_note_attachments(
    *,
    user_id: str,
    note_id: str,
    allow_shared: bool = False,
) -> list[dict[str, Any]]:
    try:
        if allow_shared:
            ensure_note_access(
                user_id=user_id,
                note_id=note_id,
            )
        else:
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
        files_by_id = get_files_by_ids(file_ids=file_ids)

        return [
            {
                **attachment,
                "file": files_by_id[attachment["file_id"]],
            }
            for attachment in attachments
            if attachment.get("file_id") in files_by_id
        ]

    except (
        NoteNotFoundError,
        NoteShareNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not retrieve note attachments: {error}"
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
        attachment = get_note_attachment_row(
            note_id=note_id,
            attachment_id=attachment_id,
        )
        file_record = get_attachable_owned_file(
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
        get_attachable_owned_file(
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
        attachment_id = extract_rpc_uuid(response.data)

        if not attachment_id:
            raise NoteAttachmentError(
                "Supabase did not return the note attachment ID."
            )

        return get_note_attachment(
            user_id=user_id,
            note_id=note_id,
            attachment_id=attachment_id,
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


def create_note_attachment_access_url(
    *,
    user_id: str,
    note_id: str,
    attachment_id: str,
    download: bool = False,
) -> dict[str, Any]:
    try:
        ensure_note_access(
            user_id=user_id,
            note_id=note_id,
        )
        attachment = get_note_attachment_row(
            note_id=note_id,
            attachment_id=attachment_id,
        )

        file_response = (
            get_supabase_admin_client()
            .table("files")
            .select(FILE_COLUMNS)
            .eq("id", attachment["file_id"])
            .eq("status", "ready")
            .maybe_single()
            .execute()
        )

        if not file_response.data:
            raise NoteAttachmentNotFoundError(
                "Attachment file was not found."
            )

        file_record = file_response.data
        options = (
            {"download": file_record["display_name"]}
            if download
            else {}
        )
        response = (
            get_supabase_admin_client()
            .storage.from_(file_record["bucket_id"])
            .create_signed_url(
                file_record["storage_path"],
                SIGNED_URL_EXPIRES_IN_SECONDS,
                options,
            )
        )
        signed_url = getattr(response, "signed_url", None)

        if not signed_url and isinstance(response, dict):
            signed_url = (
                response.get("signedURL")
                or response.get("signed_url")
            )

        if not signed_url:
            raise NoteAttachmentError(
                "Supabase did not return a signed attachment URL."
            )

        return {
            "attachment": {
                **attachment,
                "file": file_record,
            },
            "url": signed_url,
            "expires_in_seconds": SIGNED_URL_EXPIRES_IN_SECONDS,
            "download": download,
        }

    except (
        NoteAttachmentError,
        NoteAttachmentNotFoundError,
        NoteNotFoundError,
        NoteShareNotFoundError,
    ):
        raise

    except Exception as error:
        raise NoteAttachmentError(
            f"Could not create attachment access URL: {error}"
        ) from error
