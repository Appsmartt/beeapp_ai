from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.storage.exceptions import (
    StorageFileNotFoundError,
    StorageFileOperationError,
)

from .file_access import get_accessible_file

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
