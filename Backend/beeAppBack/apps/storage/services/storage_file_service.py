from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.notifications.services.notification_service import (
    create_or_update_upload_success_notification,
    create_storage_notification,
)
from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
    StorageQuotaExceededError,
    StorageUploadError,
)


STORAGE_BUCKET = "beeapp-files"
MAX_FILE_SIZE_BYTES = 52_428_800
SIGNED_URL_EXPIRES_IN_SECONDS = 300

BLOCKED_EXTENSIONS = {
    "apk",
    "app",
    "bat",
    "bash",
    "cmd",
    "com",
    "dll",
    "dylib",
    "exe",
    "jar",
    "msi",
    "ps1",
    "scr",
    "sh",
    "so",
    "zsh",
}

FILE_LIST_COLUMNS = (
    "id,owner_id,folder_id,original_name,display_name,"
    "extension,mime_type,kind,size_bytes,status,is_starred,"
    "trashed_at,purge_after,created_at,updated_at"
)


def get_storage_summary(
    *,
    user_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("storage_quotas")
            .select(
                "quota_bytes,used_bytes,reserved_bytes,updated_at"
            )
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        quota = response.data or {
            "quota_bytes": 5_368_709_120,
            "used_bytes": 0,
            "reserved_bytes": 0,
            "updated_at": None,
        }

        quota_bytes = int(quota["quota_bytes"])
        used_bytes = int(quota["used_bytes"])
        reserved_bytes = int(quota["reserved_bytes"])

        available_bytes = max(
            0,
            quota_bytes - used_bytes - reserved_bytes,
        )

        usage_percentage = (
            round(
                (used_bytes / quota_bytes) * 100,
                2,
            )
            if quota_bytes
            else 0
        )

        return {
            "quota_bytes": quota_bytes,
            "used_bytes": used_bytes,
            "reserved_bytes": reserved_bytes,
            "available_bytes": available_bytes,
            "usage_percentage": usage_percentage,
            "updated_at": quota.get("updated_at"),
        }

    except Exception as error:
        raise StorageFileOperationError(
            "Could not retrieve storage summary."
        ) from error


def list_user_files(
    *,
    user_id: str,
    folder_id: str | None = None,
    status: str = "ready",
    scope: str = "all",
    kind: str | None = None,
    tag_id: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("files")
            .select(
                FILE_LIST_COLUMNS,
                count="exact",
            )
            .eq("owner_id", user_id)
            .eq("status", status)
            .order("is_starred", desc=True)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if folder_id:
            query = query.eq("folder_id", folder_id)

        elif status != "trashed" and scope == "all":
            query = query.is_("folder_id", "null")

        if kind:
            query = query.eq("kind", kind)

        if scope == "documents":
            query = query.in_(
                "kind",
                (
                    "document",
                    "spreadsheet",
                    "presentation",
                    "archive",
                ),
            )

        elif scope == "media":
            query = query.in_(
                "kind",
                (
                    "image",
                    "video",
                    "audio",
                ),
            )

        if search:
            query = query.ilike(
                "display_name",
                f"%{search.strip()}%",
            )

        response = query.execute()
        files = response.data or []

        if tag_id:
            file_ids = [
                file_record["id"]
                for file_record in files
            ]

            if not file_ids:
                return {
                    "files": [],
                    "count": 0,
                    "limit": limit,
                    "offset": offset,
                }

            tags_response = (
                supabase.table("file_tags")
                .select("file_id")
                .eq("tag_id", tag_id)
                .in_("file_id", file_ids)
                .execute()
            )

            allowed_file_ids = {
                item["file_id"]
                for item in (tags_response.data or [])
            }

            files = [
                file_record
                for file_record in files
                if file_record["id"] in allowed_file_ids
            ]

        return {
            "files": files,
            "count": (
                len(files)
                if tag_id
                else response.count or 0
            ),
            "limit": limit,
            "offset": offset,
        }

    except Exception as error:
        raise StorageFileOperationError(
            "Could not retrieve files."
        ) from error


def get_owned_file(
    *,
    user_id: str,
    file_id: str,
    include_trashed: bool = True,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("files")
            .select("*")
            .eq("id", file_id)
            .eq("owner_id", user_id)
        )

        if not include_trashed:
            query = query.eq("status", "ready")

        response = query.maybe_single().execute()

        if not response.data:
            raise StorageFileNotFoundError(
                "The requested file was not found."
            )

        return response.data

    except StorageFileNotFoundError:
        raise

    except Exception as error:
        raise StorageFileNotFoundError(
            "Could not retrieve the requested file."
        ) from error


def prepare_and_upload_file(
    *,
    user_id: str,
    uploaded_file,
    folder_id: str | None = None,
) -> dict[str, Any]:
    filename = Path(uploaded_file.name).name.strip()
    extension = _get_extension(filename)
    mime_type = _get_mime_type(uploaded_file, filename)
    size_bytes = int(uploaded_file.size)

    _validate_upload(
        filename=filename,
        extension=extension,
        mime_type=mime_type,
        size_bytes=size_bytes,
    )

    upload_id: str | None = None

    try:
        supabase = get_supabase_admin_client()

        prepare_response = supabase.rpc(
            "prepare_storage_upload",
            {
                "p_user_id": user_id,
                "p_original_name": filename,
                "p_mime_type": mime_type,
                "p_size_bytes": size_bytes,
                "p_folder_id": folder_id,
            },
        ).execute()

        if not prepare_response.data:
            raise StorageUploadError(
                "Storage upload preparation did not return data."
            )

        prepared_upload = prepare_response.data[0]
        upload_id = prepared_upload["upload_id"]
        storage_path = prepared_upload["storage_path"]

        uploaded_file.seek(0)

        upload_response = (
            supabase.storage.from_(STORAGE_BUCKET)
            .upload(
                path=storage_path,
                file=uploaded_file.read(),
                file_options={
                    "content-type": mime_type,
                    "upsert": "false",
                },
            )
        )

        if not upload_response:
            raise StorageUploadError(
                "Supabase Storage did not confirm the upload."
            )

        complete_response = supabase.rpc(
            "complete_storage_upload",
            {
                "p_user_id": user_id,
                "p_upload_id": upload_id,
            },
        ).execute()

        if not complete_response.data:
            raise StorageUploadError(
                "Storage upload completion did not return data."
            )

        completed_upload = complete_response.data[0]

        return get_owned_file(
            user_id=user_id,
            file_id=completed_upload["file_id"],
            include_trashed=True,
        )

    except Exception as error:
        if upload_id:
            _cancel_upload_safely(
                user_id=user_id,
                upload_id=upload_id,
            )

        if isinstance(error, StorageUploadError):
            raise

        message = str(error)

        if "STORAGE_QUOTA_EXCEEDED" in message:
            raise StorageQuotaExceededError(
                "There is not enough available storage."
            ) from error

        raise StorageUploadError(
            "Could not upload the selected file."
        ) from error


def upload_multiple_files(
    *,
    user_id: str,
    uploaded_files: list,
    folder_id: str | None = None,
) -> dict[str, Any]:
    successful_files: list[dict[str, Any]] = []
    failed_files: list[dict[str, str]] = []

    for uploaded_file in uploaded_files:
        try:
            file_record = prepare_and_upload_file(
                user_id=user_id,
                uploaded_file=uploaded_file,
                folder_id=folder_id,
            )

            successful_files.append(
                _serialize_file(file_record)
            )

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

        except StorageUploadError as error:
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

    if successful_files:
        try:
            create_or_update_upload_success_notification(
                recipient_id=user_id,
                uploaded_files=successful_files,
            )
        except Exception:
            pass

    if failed_files:
        try:
            failed_names = [
                failed_file["name"]
                for failed_file in failed_files
            ]

            create_storage_notification(
                recipient_id=user_id,
                notification_type="upload_failed",
                title="Error al subir archivos",
                body=(
                    f"No se pudieron subir "
                    f"{len(failed_files)} archivo(s): "
                    f"{', '.join(failed_names[:3])}."
                ),
                metadata={
                    "failed_count": len(failed_files),
                    "failed_files": failed_files,
                },
            )
        except Exception:
            pass

    return {
        "files": successful_files,
        "failed_files": failed_files,
        "success_count": len(successful_files),
        "failure_count": len(failed_files),
    }


def create_file_access_url(
    *,
    user_id: str,
    file_id: str,
    download: bool = False,
) -> dict[str, Any]:
    try:
        file_record = get_accessible_file(
            user_id=user_id,
            file_id=file_id,
        )

        supabase = get_supabase_admin_client()

        options = (
            {
                "download": file_record["display_name"],
            }
            if download
            else {}
        )

        response = (
            supabase.storage.from_(file_record["bucket_id"])
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
            raise StorageFileOperationError(
                "Supabase did not return a signed URL."
            )

        return {
            "file": _serialize_file(file_record),
            "url": signed_url,
            "expires_in_seconds": (
                SIGNED_URL_EXPIRES_IN_SECONDS
            ),
            "download": download,
        }

    except (
        StorageFileNotFoundError,
        StorageFileOperationError,
    ):
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not create file access."
        ) from error


def get_accessible_file(
    *,
    user_id: str,
    file_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()

        own_file_response = (
            supabase.table("files")
            .select("*")
            .eq("id", file_id)
            .eq("owner_id", user_id)
            .neq("status", "failed")
            .maybe_single()
            .execute()
        )

        if (
            own_file_response
            and own_file_response.data
        ):
            return own_file_response.data

        share_response = (
            supabase.table("file_shares")
            .select(
                "id,file_id,shared_with_user_id,"
                "accepted_at,revoked_at,expires_at,hidden_at"
            )
            .eq("file_id", file_id)
            .eq("shared_with_user_id", user_id)
            .is_("revoked_at", "null")
            .maybe_single()
            .execute()
        )

        if (
            not share_response
            or not share_response.data
        ):
            raise StorageFileNotFoundError(
                "The requested file was not found."
            )

        file_response = (
            supabase.table("files")
            .select("*")
            .eq("id", file_id)
            .eq("status", "ready")
            .maybe_single()
            .execute()
        )

        if (
            not file_response
            or not file_response.data
        ):
            raise StorageFileNotFoundError(
                "The requested file was not found."
            )

        return file_response.data

    except StorageFileNotFoundError:
        raise

    except Exception as error:
        raise StorageFileNotFoundError(
            "Could not access the requested file."
        ) from error


def rename_file(
    *,
    user_id: str,
    file_id: str,
    display_name: str,
) -> dict[str, Any]:
    try:
        get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=True,
        )

        response = (
            get_supabase_admin_client()
            .table("files")
            .update(
                {
                    "display_name": display_name.strip(),
                }
            )
            .eq("id", file_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response.data:
            raise StorageFileOperationError(
                "Supabase did not return the renamed file."
            )

        return response.data[0]

    except (
        StorageFileNotFoundError,
        StorageFileOperationError,
    ):
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not rename the file."
        ) from error


def move_file(
    *,
    user_id: str,
    file_id: str,
    folder_id: str | None,
) -> dict[str, Any]:
    try:
        get_owned_file(
            user_id=user_id,
            file_id=file_id,
            include_trashed=True,
        )

        supabase = get_supabase_admin_client()

        if folder_id:
            folder_response = (
                supabase.table("storage_folders")
                .select("id")
                .eq("id", folder_id)
                .eq("owner_id", user_id)
                .maybe_single()
                .execute()
            )

            if not folder_response.data:
                raise StorageFileOperationError(
                    "Destination folder was not found."
                )

        response = (
            supabase.table("files")
            .update(
                {
                    "folder_id": folder_id,
                }
            )
            .eq("id", file_id)
            .eq("owner_id", user_id)
            .execute()
        )

        if not response.data:
            raise StorageFileOperationError(
                "Supabase did not return the moved file."
            )

        return response.data[0]

    except (
        StorageFileNotFoundError,
        StorageFileOperationError,
    ):
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not move the file."
        ) from error


def move_file_to_trash(
    *,
    user_id: str,
    file_id: str,
) -> None:
    _execute_file_rpc(
        user_id=user_id,
        function_name="move_file_to_trash",
        file_id=file_id,
    )

    _create_file_operation_notification_safely(
        recipient_id=user_id,
        notification_type="file_trashed",
        title="Archivo movido a la papelera",
        file_id=file_id,
    )


def restore_file_from_trash(
    *,
    user_id: str,
    file_id: str,
) -> None:
    file_record = get_owned_file(
        user_id=user_id,
        file_id=file_id,
        include_trashed=True,
    )

    _execute_file_rpc(
        user_id=user_id,
        function_name="restore_file_from_trash",
        file_id=file_id,
    )

    _create_file_operation_notification_safely(
        recipient_id=user_id,
        notification_type="file_restored",
        title="Archivo restaurado",
        file_id=file_id,
        display_name=file_record["display_name"],
    )


def permanently_delete_file(
    *,
    user_id: str,
    file_id: str,
) -> None:
    file_record = get_owned_file(
        user_id=user_id,
        file_id=file_id,
        include_trashed=True,
    )

    _execute_file_rpc(
        user_id=user_id,
        function_name="permanently_delete_file",
        file_id=file_id,
    )

    _create_file_operation_notification_safely(
        recipient_id=user_id,
        notification_type="file_deleted",
        title="Archivo eliminado permanentemente",
        file_id=file_id,
        display_name=file_record["display_name"],
    )


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

def get_file_content_for_mail_attachment(
    *,
    user_id: str,
    file_id: str,
    max_size_bytes: int,
) -> dict[str, Any]:
    """
    Recupera un archivo accesible para adjuntarlo a un correo.

    Esta función se usa solamente en el backend: valida que el
    usuario pueda acceder al archivo y descarga el contenido desde
    Supabase Storage sin exponer URLs firmadas al cliente.
    """
    if max_size_bytes <= 0:
        raise StorageFileOperationError(
            "Invalid mail attachment size limit."
        )

    try:
        file_record = get_accessible_file(
            user_id=user_id,
            file_id=file_id,
        )

        if file_record.get("status") != "ready":
            raise StorageFileOperationError(
                "The selected file is not ready to attach."
            )

        size_bytes = int(file_record.get("size_bytes") or 0)

        if size_bytes <= 0:
            raise StorageFileOperationError(
                "The selected file is empty."
            )

        if size_bytes > max_size_bytes:
            raise StorageFileOperationError(
                "The selected file is too large to attach."
            )

        bucket_id = str(
            file_record.get("bucket_id") or ""
        ).strip()
        storage_path = str(
            file_record.get("storage_path") or ""
        ).strip()

        if not bucket_id or not storage_path:
            raise StorageFileOperationError(
                "The selected file has no storage location."
            )

        response = (
            get_supabase_admin_client()
            .storage.from_(bucket_id)
            .download(storage_path)
        )

        if isinstance(response, bytes):
            content = response
        elif isinstance(response, bytearray):
            content = bytes(response)
        elif isinstance(response, memoryview):
            content = response.tobytes()
        else:
            content = getattr(response, "data", None)

            if isinstance(content, bytearray):
                content = bytes(content)

            elif isinstance(content, memoryview):
                content = content.tobytes()

        if not isinstance(content, bytes) or not content:
            raise StorageFileOperationError(
                "Could not download the selected file."
            )

        if len(content) > max_size_bytes:
            raise StorageFileOperationError(
                "The selected file is too large to attach."
            )

        filename = str(
            file_record.get("display_name")
            or file_record.get("original_name")
            or "attachment"
        ).strip()

        if not filename:
            filename = "attachment"

        mime_type = str(
            file_record.get("mime_type")
            or "application/octet-stream"
        ).strip() or "application/octet-stream"

        return {
            "storage_file_id": str(file_record["id"]),
            "filename": filename[:255],
            "mime_type": mime_type[:255],
            "size_bytes": len(content),
            "content": content,
            "metadata": {
                "storage_file_id": str(file_record["id"]),
                "storage_bucket_id": bucket_id,
                "storage_path": storage_path,
            },
        }

    except (
        StorageFileNotFoundError,
        StorageFileOperationError,
    ):
        raise

    except Exception as error:
        raise StorageFileOperationError(
            "Could not prepare the selected file for attachment."
        ) from error