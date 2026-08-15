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
from apps.notes.services.note_share_service import (
    _get_active_received_note_share,
)
from apps.storage.exceptions import (
    StorageQuotaExceededError,
    StorageUploadError,
)
from apps.storage.services.storage_file_service import (
    SIGNED_URL_EXPIRES_IN_SECONDS,
    prepare_and_upload_file,
)


ATTACHMENT_COLUMNS = (
    "id,note_id,file_id,attachment_type,display_order,created_at"
)

FILE_COLUMNS = (
    "id,owner_id,folder_id,bucket_id,storage_path,"
    "original_name,display_name,extension,mime_type,"
    "kind,size_bytes,status,is_starred,trashed_at,"
    "purge_after,created_at,updated_at"
)


def list_note_attachments(
    *,
    user_id: str,
    note_id: str,
    allow_shared: bool = False,
) -> list[dict[str, Any]]:
    try:
        if allow_shared:
            _ensure_note_access(
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

        files_by_id = _get_files_by_ids(file_ids=file_ids)

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

        attachment_id = _extract_rpc_uuid(response.data)

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

        attachment = _get_note_attachment_row(
            note_id=note_id,
            attachment_id=attachment_id,
        )

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


def create_note_attachment_access_url(
    *,
    user_id: str,
    note_id: str,
    attachment_id: str,
    download: bool = False,
) -> dict[str, Any]:
    try:
        _ensure_note_access(
            user_id=user_id,
            note_id=note_id,
        )

        attachment = _get_note_attachment_row(
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
            {
                "download": file_record["display_name"],
            }
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
            "expires_in_seconds": (
                SIGNED_URL_EXPIRES_IN_SECONDS
            ),
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


def _ensure_note_access(
    *,
    user_id: str,
    note_id: str,
) -> None:
    try:
        get_owned_note(
            user_id=user_id,
            note_id=note_id,
            include_deleted=False,
        )
        return

    except NoteNotFoundError:
        pass

    _get_active_received_note_share(
        user_id=user_id,
        note_id=note_id,
        include_hidden=True,
    )


def _get_note_attachment_row(
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

        folder_id = _extract_rpc_uuid(response.data)

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
            f"Could not retrieve selected file: {error}"
        ) from error


def _get_files_by_ids(
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


def _extract_rpc_uuid(value: Any) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return _extract_rpc_uuid(value[0])

    if isinstance(value, dict):
        return (
            value.get("get_or_create_notes_storage_folder")
            or value.get("attach_file_to_note")
            or value.get("id")
            or value.get("value")
        )

    return None