from __future__ import annotations

import mimetypes
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote

from beeAppBack.core.supabase_client import (
    _get_required_env,
    get_supabase_admin_client,
)
from apps.storage.exceptions import StorageUploadError


COMMERCIAL_PUBLIC_IMAGES_BUCKET = "beeapp-commercial-images"
COMMERCIAL_PUBLIC_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024
COMMERCIAL_PUBLIC_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
COMMERCIAL_PUBLIC_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}

_SAFE_FILENAME_RE = re.compile(r"[^a-z0-9._-]+")


def _normalized_filename(filename: str) -> tuple[str, str]:
    safe_name = Path(filename).name.strip().lower()

    if not safe_name:
        raise StorageUploadError("Commercial image filename is required.")

    extension = safe_name.rsplit(".", 1)[-1] if "." in safe_name else ""

    if extension not in COMMERCIAL_PUBLIC_IMAGE_EXTENSIONS:
        raise StorageUploadError(
            "Commercial images must be JPG, PNG, or WebP."
        )

    normalized = _SAFE_FILENAME_RE.sub("-", safe_name)
    normalized = normalized.strip("-")

    if not normalized:
        normalized = f"image.{extension}"

    return normalized, extension


def _mime_type(uploaded_file: Any, filename: str) -> str:
    raw_mime_type = str(
        getattr(uploaded_file, "content_type", "") or ""
    ).strip().lower()

    guessed_mime_type, _ = mimetypes.guess_type(filename)
    mime_type = raw_mime_type or guessed_mime_type or ""

    if mime_type == "image/jpg":
        mime_type = "image/jpeg"

    if mime_type not in COMMERCIAL_PUBLIC_IMAGE_MIME_TYPES:
        raise StorageUploadError(
            "Commercial images must be JPEG, PNG, or WebP."
        )

    return mime_type


def _size_bytes(uploaded_file: Any) -> int:
    try:
        size_bytes = int(uploaded_file.size)
    except (AttributeError, TypeError, ValueError) as error:
        raise StorageUploadError(
            "Commercial image size is invalid."
        ) from error

    if size_bytes <= 0:
        raise StorageUploadError(
            "Commercial image cannot be empty."
        )

    if size_bytes > COMMERCIAL_PUBLIC_IMAGE_MAX_SIZE_BYTES:
        raise StorageUploadError(
            "Commercial images cannot exceed 5 MB."
        )

    return size_bytes


def public_commercial_image_url(storage_path: str) -> str:
    normalized_storage_path = str(storage_path or "").strip().lstrip("/")

    if not normalized_storage_path:
        raise StorageUploadError(
            "Commercial image storage path is required."
        )

    response = (
        get_supabase_admin_client()
        .storage
        .from_(COMMERCIAL_PUBLIC_IMAGES_BUCKET)
        .get_public_url(normalized_storage_path)
    )

    url = None

    if isinstance(response, str):
        url = response
    elif isinstance(response, dict):
        response_data = response.get("data")
        url = (
            response.get("publicUrl")
            or response.get("public_url")
            or (
                response_data.get("publicUrl")
                if isinstance(response_data, dict)
                else None
            )
            or (
                response_data.get("public_url")
                if isinstance(response_data, dict)
                else None
            )
        )
    else:
        url = (
            getattr(response, "public_url", None)
            or getattr(response, "publicUrl", None)
        )

    normalized_url = str(url or "").strip()

    if normalized_url:
        return normalized_url

    try:
        supabase_url = _get_required_env(
            "SUPABASE_URL",
        ).strip().rstrip("/")
    except RuntimeError as error:
        raise StorageUploadError(
            "Supabase did not return a commercial image public URL."
        ) from error

    return (
        f"{supabase_url}/storage/v1/object/public/"
        f"{COMMERCIAL_PUBLIC_IMAGES_BUCKET}/"
        f"{quote(normalized_storage_path, safe='/')}"
    )


def upload_commercial_public_image(
    *,
    user_id: str,
    uploaded_file: Any,
) -> dict[str, Any]:
    filename, extension = _normalized_filename(
        str(getattr(uploaded_file, "name", ""))
    )
    mime_type = _mime_type(uploaded_file, filename)
    size_bytes = _size_bytes(uploaded_file)

    supabase = get_supabase_admin_client()

    prepare_response = supabase.rpc(
        "prepare_storage_upload",
        {
            "p_user_id": user_id,
            "p_original_name": filename,
            "p_mime_type": mime_type,
            "p_size_bytes": size_bytes,
            "p_folder_id": None,
            "p_bucket_id": COMMERCIAL_PUBLIC_IMAGES_BUCKET,
        },
    ).execute()

    if not prepare_response.data:
        raise StorageUploadError(
            "Commercial image upload preparation returned no data."
        )

    prepared = prepare_response.data[0]
    upload_id = str(prepared["upload_id"])
    storage_path = str(prepared["storage_path"])
    bucket_id = str(
        prepared.get("bucket_id")
        or COMMERCIAL_PUBLIC_IMAGES_BUCKET
    ).strip()

    if bucket_id != COMMERCIAL_PUBLIC_IMAGES_BUCKET:
        raise StorageUploadError(
            "Commercial image upload returned an invalid bucket."
        )

    try:
        uploaded_file.seek(0)
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
                "Supabase did not confirm commercial image upload."
            )

        storage_folder, storage_filename = storage_path.rsplit("/", 1)
        listed_objects = supabase.storage.from_(bucket_id).list(
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
                "Commercial image object was not created."
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
                "Commercial image upload completion returned no data."
            )

        completed = complete_response.data[0]

        return {
            "file_id": str(completed["file_id"]),
            "bucket_id": bucket_id,
            "storage_path": storage_path,
            "original_name": filename,
            "extension": extension,
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "url": public_commercial_image_url(storage_path),
        }

    except Exception as error:
        try:
            supabase.storage.from_(bucket_id).remove(
                [storage_path],
            )
        except Exception:
            pass

        try:
            supabase.rpc(
                "cancel_storage_upload",
                {
                    "p_user_id": user_id,
                    "p_upload_id": upload_id,
                },
            ).execute()
        except Exception:
            pass

        if isinstance(error, StorageUploadError):
            raise

        raise StorageUploadError(
            "Could not upload commercial image."
        ) from error


def remove_commercial_public_image(
    *,
    bucket_id: str,
    storage_path: str,
) -> None:
    if bucket_id != COMMERCIAL_PUBLIC_IMAGES_BUCKET:
        raise StorageUploadError(
            "Invalid commercial image bucket."
        )

    response = (
        get_supabase_admin_client()
        .storage
        .from_(bucket_id)
        .remove([storage_path])
    )

    if response is None:
        raise StorageUploadError(
            "Supabase did not confirm commercial image deletion."
        )
