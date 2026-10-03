from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.storage.exceptions import (
    StorageQuotaExceededError,
    StorageUploadError,
)

from .constants import STORAGE_BUCKET
from .file_helpers import (
    _cancel_upload_safely,
    _get_extension,
    _get_mime_type,
    _serialize_file,
    _validate_upload,
)
from .file_queries import get_owned_file
from .file_upload_notifications import _notify_upload_results_safely

logger = logging.getLogger(__name__)

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

    logger.warning(
        "Storage upload received: user_id=%s filename=%s extension=%s "
        "mime_type=%s size_bytes=%s folder_id=%s",
        user_id,
        filename,
        extension,
        mime_type,
        size_bytes,
        folder_id,
    )

    try:
        _validate_upload(
            filename=filename,
            extension=extension,
            mime_type=mime_type,
            size_bytes=size_bytes,
        )
    except Exception as error:
        logger.warning(
            "Storage upload validation rejected: user_id=%s filename=%s "
            "extension=%s mime_type=%s size_bytes=%s error_type=%s error=%s",
            user_id,
            filename,
            extension,
            mime_type,
            size_bytes,
            type(error).__name__,
            str(error),
        )
        raise

    logger.warning(
        "Storage upload validation passed: user_id=%s filename=%s",
        user_id,
        filename,
    )

    upload_id: str | None = None
    storage_path: str | None = None
    bucket_id: str | None = None

    try:
        supabase = get_supabase_admin_client()

        logger.warning(
            "Storage prepare RPC start: user_id=%s filename=%s",
            user_id,
            filename,
        )

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

        logger.warning(
            "Storage prepare RPC response: user_id=%s filename=%s "
            "data=%r",
            user_id,
            filename,
            getattr(prepare_response, "data", None),
        )

        if not prepare_response.data:
            raise StorageUploadError(
                "Storage upload preparation did not return data."
            )

        prepared_upload = prepare_response.data[0]
        upload_id = prepared_upload["upload_id"]
        storage_path = prepared_upload["storage_path"]
        bucket_id = str(
            prepared_upload.get("bucket_id") or STORAGE_BUCKET
        ).strip()

        if not bucket_id:
            raise StorageUploadError(
                "Storage upload preparation did not return a bucket."
            )

        logger.warning(
            "Storage upload prepared: user_id=%s upload_id=%s "
            "bucket_id=%s storage_path=%s filename=%s size_bytes=%s",
            user_id,
            upload_id,
            bucket_id,
            storage_path,
            filename,
            size_bytes,
        )

        uploaded_file.seek(0)

        logger.warning(
            "Storage object upload start: user_id=%s upload_id=%s "
            "bucket_id=%s storage_path=%s",
            user_id,
            upload_id,
            bucket_id,
            storage_path,
        )

        upload_response = (
            supabase.storage.from_(bucket_id)
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

        logger.warning(
            "Storage object uploaded: user_id=%s upload_id=%s "
            "bucket_id=%s storage_path=%s response=%r",
            user_id,
            upload_id,
            bucket_id,
            storage_path,
            upload_response,
        )

        path_parts = storage_path.rsplit("/", 1)
        storage_folder = path_parts[0] if len(path_parts) == 2 else ""
        storage_filename = path_parts[-1]

        logger.warning(
            "Storage object verification start: user_id=%s upload_id=%s "
            "bucket_id=%s storage_folder=%s storage_filename=%s",
            user_id,
            upload_id,
            bucket_id,
            storage_folder,
            storage_filename,
        )

        listed_objects = (
            supabase.storage.from_(bucket_id)
            .list(
                storage_folder,
                {
                    "limit": 100,
                    "offset": 0,
                    "sortBy": {
                        "column": "name",
                        "order": "asc",
                    },
                },
            )
        )

        logger.warning(
            "Storage object verification response: user_id=%s upload_id=%s "
            "bucket_id=%s storage_folder=%s objects=%r",
            user_id,
            upload_id,
            bucket_id,
            storage_folder,
            listed_objects,
        )

        object_exists = any(
            (
                item.get("name") == storage_filename
                if isinstance(item, dict)
                else getattr(item, "name", None) == storage_filename
            )
            for item in (listed_objects or [])
        )

        if not object_exists:
            raise StorageUploadError(
                "Storage upload finished without creating the object."
            )

        logger.warning(
            "Storage object verification passed: user_id=%s upload_id=%s "
            "bucket_id=%s storage_path=%s",
            user_id,
            upload_id,
            bucket_id,
            storage_path,
        )

        logger.warning(
            "Storage complete RPC start: user_id=%s upload_id=%s "
            "bucket_id=%s storage_path=%s",
            user_id,
            upload_id,
            bucket_id,
            storage_path,
        )

        complete_response = supabase.rpc(
            "complete_storage_upload",
            {
                "p_user_id": user_id,
                "p_upload_id": upload_id,
            },
        ).execute()

        logger.warning(
            "Storage complete RPC response: user_id=%s upload_id=%s "
            "data=%r",
            user_id,
            upload_id,
            getattr(complete_response, "data", None),
        )

        if not complete_response.data:
            raise StorageUploadError(
                "Storage upload completion did not return data."
            )

        completed_upload = complete_response.data[0]

        logger.warning(
            "Storage upload completed: user_id=%s upload_id=%s "
            "file_id=%s bucket_id=%s storage_path=%s",
            user_id,
            upload_id,
            completed_upload.get("file_id"),
            bucket_id,
            storage_path,
        )

        return get_owned_file(
            user_id=user_id,
            file_id=completed_upload["file_id"],
            include_trashed=True,
        )

    except Exception as error:
        logger.exception(
            "Storage upload pipeline failed: user_id=%s filename=%s "
            "mime_type=%s size_bytes=%s upload_id=%s error_type=%s",
            user_id,
            filename,
            mime_type,
            size_bytes,
            upload_id,
            type(error).__name__,
        )

        if upload_id:
            logger.warning(
                "Storage upload compensation start: user_id=%s "
                "upload_id=%s bucket_id=%s storage_path=%s",
                user_id,
                upload_id,
                bucket_id,
                storage_path,
            )
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

    _notify_upload_results_safely(
        user_id=user_id,
        successful_files=successful_files,
        failed_files=failed_files,
    )

    return {
        "files": successful_files,
        "failed_files": failed_files,
        "success_count": len(successful_files),
        "failure_count": len(failed_files),
    }
