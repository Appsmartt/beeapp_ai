from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.notifications.services.notification_service import create_storage_notification
from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
    StorageUploadError,
)

from .constants import BLOCKED_EXTENSIONS, MAX_FILE_SIZE_BYTES
from .file_queries import get_owned_file

def _execute_file_rpc(
    *,
    user_id: str,
    function_name: str,
    file_id: str,
) -> None:
    try:
        get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=True,
        )

        supabase = get_supabase_admin_client()

        response = supabase.rpc(
            function_name,
            {
                "p_user_id": user_id,
                "p_file_id": file_id,
            },
        ).execute()

        if response.data is not True:
            raise StorageFileOperationError(
                "Storage operation did not complete."
            )

    except StorageFileNotFoundError:
        raise

    except StorageFileOperationError:
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not complete the storage operation."
        ) from error


def _create_file_operation_notification_safely(
    *,
    recipient_id: str,
    notification_type: str,
    title: str,
    file_id: str,
    display_name: str | None = None,
) -> None:
    try:
        if display_name:
            body = f"{display_name}."

        elif notification_type == "file_trashed":
            body = "El archivo fue movido a la papelera."

        else:
            body = "La operación se completó correctamente."

        create_storage_notification(
            recipient_id=recipient_id,
            notification_type=notification_type,
            title=title,
            body=body,
            metadata={
                "file_id": file_id,
            },
        )

    except Exception:
        pass


def _cancel_upload_safely(
    *,
    user_id: str,
    upload_id: str,
) -> None:
    try:
        supabase = get_supabase_admin_client()

        upload_response = (
            supabase.table("storage_uploads")
            .select(
                "id,file_id,owner_id,status,"
                "files!inner(bucket_id,storage_path)"
            )
            .eq("id", upload_id)
            .eq("owner_id", user_id)
            .maybe_single()
            .execute()
        )

        upload_record = upload_response.data or {}
        file_record = upload_record.get("files") or {}

        bucket_id = str(
            file_record.get("bucket_id") or ""
        ).strip()
        storage_path = str(
            file_record.get("storage_path") or ""
        ).strip()

        if bucket_id and storage_path:
            try:
                supabase.storage.from_(bucket_id).remove(
                    [storage_path],
                )
            except Exception:
                pass

        supabase.rpc(
            "cancel_storage_upload",
            {
                "p_user_id": user_id,
                "p_upload_id": upload_id,
            },
        ).execute()

    except Exception:
        pass


def _validate_upload(
    *,
    filename: str,
    extension: str | None,
    mime_type: str,
    size_bytes: int,
) -> None:
    if not filename or len(filename) > 255:
        raise StorageUploadError(
            "Invalid file name."
        )

    if size_bytes <= 0:
        raise StorageUploadError(
            "The selected file is empty."
        )

    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise StorageUploadError(
            "Files cannot be larger than 50 MB."
        )

    if extension and extension in BLOCKED_EXTENSIONS:
        raise StorageUploadError(
            "This file type is not allowed."
        )

    if mime_type in {
        "application/x-msdownload",
        "application/x-msdos-program",
        "application/x-sh",
        "application/vnd.android.package-archive",
    }:
        raise StorageUploadError(
            "This file type is not allowed."
        )


def _get_extension(
    filename: str,
) -> str | None:
    suffix = Path(filename).suffix.lower().lstrip(".")
    return suffix or None


def _get_mime_type(
    uploaded_file,
    filename: str,
) -> str:
    provided_mime_type = (
        getattr(uploaded_file, "content_type", "")
        or ""
    ).strip().lower()

    if provided_mime_type:
        return provided_mime_type

    guessed_mime_type, _ = mimetypes.guess_type(filename)

    return guessed_mime_type or "application/octet-stream"


def _serialize_file(
    file_record: dict[str, Any],
) -> dict[str, Any]:
    return {
        key: file_record.get(key)
        for key in (
            "id",
            "owner_id",
            "folder_id",
            "original_name",
            "display_name",
            "extension",
            "mime_type",
            "kind",
            "size_bytes",
            "status",
            "is_starred",
            "trashed_at",
            "purge_after",
            "created_at",
            "updated_at",
        )
    }
