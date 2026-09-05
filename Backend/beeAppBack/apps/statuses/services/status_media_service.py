from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path
from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
    get_supabase_admin_client,
)

from apps.statuses.exceptions import (
    StatusMediaError,
    StatusMediaUploadError,
)


STATUS_MEDIA_BUCKET = "beeapp-statuses"
STATUS_MEDIA_SIGNED_URL_TTL_SECONDS = 300

MAX_STATUS_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_STATUS_GIF_SIZE_BYTES = 10 * 1024 * 1024
MAX_STATUS_VIDEO_SIZE_BYTES = 50 * 1024 * 1024
MAX_STATUS_VIDEO_DURATION_SECONDS = 120

STATUS_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

STATUS_GIF_MIME_TYPES = {
    "image/gif",
}

STATUS_VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
}

MIME_TYPES_BY_KIND = {
    "image": STATUS_IMAGE_MIME_TYPES,
    "gif": STATUS_GIF_MIME_TYPES,
    "video": STATUS_VIDEO_MIME_TYPES,
}

MAX_SIZE_BY_KIND = {
    "image": MAX_STATUS_IMAGE_SIZE_BYTES,
    "gif": MAX_STATUS_GIF_SIZE_BYTES,
    "video": MAX_STATUS_VIDEO_SIZE_BYTES,
}

EXTENSIONS_BY_MIME_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
}


def validate_status_media_file(
    *,
    uploaded_file,
    kind: str,
    duration_seconds: float | None = None,
) -> dict[str, Any]:
    """
    Valida el archivo antes de crear/subir una historia con media.

    El MIME del cliente se contrasta contra una lista cerrada. No usamos
    extensión como fuente de confianza; se conserva solo para el nombre
    de objeto y para facilitar depuración.
    """
    if kind not in MIME_TYPES_BY_KIND:
        raise StatusMediaError(
            "Only image, gif, and video stories can include media."
        )

    if uploaded_file is None:
        raise StatusMediaError(
            "A media file is required for this story."
        )

    filename = Path(
        str(getattr(uploaded_file, "name", "") or "")
    ).name.strip()

    if not filename or len(filename) > 255:
        raise StatusMediaError(
            "The media file name is invalid."
        )

    size_bytes = int(getattr(uploaded_file, "size", 0) or 0)

    if size_bytes <= 0:
        raise StatusMediaError(
            "The selected media file is empty."
        )

    max_size_bytes = MAX_SIZE_BY_KIND[kind]

    if size_bytes > max_size_bytes:
        max_size_mb = max_size_bytes // (1024 * 1024)
        raise StatusMediaError(
            f"{kind.title()} stories must be {max_size_mb} MB "
            "or smaller."
        )

    mime_type = _resolve_mime_type(
        uploaded_file=uploaded_file,
        filename=filename,
    )

    if mime_type not in MIME_TYPES_BY_KIND[kind]:
        raise StatusMediaError(
            f"The selected file is not a supported {kind}."
        )

    normalized_duration = _normalize_duration(
        kind=kind,
        duration_seconds=duration_seconds,
    )

    return {
        "original_name": filename,
        "mime_type": mime_type,
        "size_bytes": size_bytes,
        "duration_seconds": normalized_duration,
    }


def upload_status_media(
    *,
    owner_profile_id: str,
    story_id: str,
    uploaded_file,
    kind: str,
    duration_seconds: float | None = None,
) -> dict[str, Any]:
    """
    Sube media privada al bucket beeapp-statuses.

    La ruta siempre empieza con <owner_profile_id>/stories/, regla que
    valida el trigger status_validate_story_media en Supabase.
    """
    validated = validate_status_media_file(
        uploaded_file=uploaded_file,
        kind=kind,
        duration_seconds=duration_seconds,
    )

    extension = _safe_extension(
        filename=validated["original_name"],
        mime_type=validated["mime_type"],
    )

    storage_path = (
        f"{owner_profile_id}/stories/{story_id}/"
        f"{uuid.uuid4().hex}.{extension}"
    )

    try:
        uploaded_file.seek(0)

        response = (
            get_supabase_admin_client()
            .storage.from_(STATUS_MEDIA_BUCKET)
            .upload(
                path=storage_path,
                file=uploaded_file.read(),
                file_options={
                    "content-type": validated["mime_type"],
                    "upsert": "false",
                },
            )
        )

        if not response:
            raise StatusMediaUploadError(
                "Supabase Storage did not confirm the media upload."
            )

        return {
            "bucket_id": STATUS_MEDIA_BUCKET,
            "storage_path": storage_path,
            **validated,
            "width": None,
            "height": None,
        }

    except StatusMediaUploadError:
        raise

    except Exception as error:
        raise StatusMediaUploadError(
            f"Could not upload status media: {error}"
        ) from error


def delete_status_media_object_safely(
    *,
    bucket_id: str,
    storage_path: str,
) -> None:
    """
    Compensación tras un fallo posterior a una subida confirmada.

    Nunca eleva una excepción: el error original de publicación debe
    mantenerse y los huérfanos podrán limpiarse posteriormente.
    """
    if not bucket_id or not storage_path:
        return

    try:
        (
            get_supabase_admin_client()
            .storage.from_(bucket_id)
            .remove([storage_path])
        )
    except Exception:
        return


def create_status_media_signed_url(
    *,
    bucket_id: str,
    storage_path: str,
    expires_in_seconds: int = STATUS_MEDIA_SIGNED_URL_TTL_SECONDS,
) -> str | None:
    """
    Devuelve una URL firmada de media sin validar permisos.

    El llamador debe comprobar primero autorización sobre la historia.
    """
    if not bucket_id or not storage_path:
        return None

    normalized_expiry = max(
        1,
        min(
            int(expires_in_seconds),
            STATUS_MEDIA_SIGNED_URL_TTL_SECONDS,
        ),
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .storage.from_(bucket_id)
                .create_signed_url(
                    storage_path,
                    normalized_expiry,
                )
            ),
        )

        signed_url = getattr(response, "signed_url", None)

        if not signed_url and isinstance(response, dict):
            signed_url = (
                response.get("signedURL")
                or response.get("signed_url")
            )

        return str(signed_url) if signed_url else None

    except Exception:
        return None


def create_status_avatar_signed_url(
    *,
    avatar_file_id: str | None,
) -> str | None:
    """
    Emite URL firmada para un avatar registrado en la tabla files.

    La autorización del estado ya se verificó antes de presentar el autor.
    Un avatar inexistente, no listo o eliminado se representa como null.
    """
    if not avatar_file_id:
        return None

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("files")
                .select(
                    "bucket_id,storage_path,status,trashed_at"
                )
                .eq("id", str(avatar_file_id))
                .eq("status", "ready")
                .is_("trashed_at", "null")
                .maybe_single()
                .execute()
            ),
        )

        file_record = getattr(response, "data", None)

        if not isinstance(file_record, dict):
            return None

        return create_status_media_signed_url(
            bucket_id=str(file_record.get("bucket_id") or ""),
            storage_path=str(file_record.get("storage_path") or ""),
        )

    except Exception:
        return None


def _resolve_mime_type(
    *,
    uploaded_file,
    filename: str,
) -> str:
    provided_mime_type = str(
        getattr(uploaded_file, "content_type", "") or ""
    ).strip().lower()

    if provided_mime_type:
        return provided_mime_type

    guessed_mime_type, _ = mimetypes.guess_type(filename)

    return str(
        guessed_mime_type or "application/octet-stream"
    ).lower()


def _normalize_duration(
    *,
    kind: str,
    duration_seconds: float | None,
) -> float | None:
    if kind == "video":
        if duration_seconds is None:
            raise StatusMediaError(
                "Video stories require duration_seconds."
            )

        try:
            normalized_duration = float(duration_seconds)
        except (TypeError, ValueError) as error:
            raise StatusMediaError(
                "duration_seconds must be a valid number."
            ) from error

        if normalized_duration <= 0:
            raise StatusMediaError(
                "duration_seconds must be greater than zero."
            )

        if normalized_duration > MAX_STATUS_VIDEO_DURATION_SECONDS:
            raise StatusMediaError(
                "Video stories cannot exceed 120 seconds."
            )

        return round(normalized_duration, 3)

    if duration_seconds not in (None, ""):
        raise StatusMediaError(
            "Only video stories can include duration_seconds."
        )

    return None


def _safe_extension(
    *,
    filename: str,
    mime_type: str,
) -> str:
    supplied_extension = (
        Path(filename).suffix.lower().lstrip(".")
    )

    expected_extension = EXTENSIONS_BY_MIME_TYPE[mime_type]

    if supplied_extension == expected_extension:
        return supplied_extension

    if (
        mime_type == "image/jpeg"
        and supplied_extension == "jpeg"
    ):
        return "jpg"

    return expected_extension
