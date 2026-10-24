from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

from apps.statuses.exceptions import StatusMediaError
from apps.statuses.services.status_media_refactor.shared import (
    EXTENSIONS_BY_MIME_TYPE,
    MAX_SIZE_BY_KIND,
    MAX_STATUS_VIDEO_DURATION_SECONDS,
    MIME_TYPES_BY_KIND,
)


def validate_status_media_file(
    *,
    uploaded_file,
    kind: str,
    duration_seconds: float | None = None,
) -> dict[str, Any]:
    if kind not in MIME_TYPES_BY_KIND:
        raise StatusMediaError(
            "Only image, gif, and video stories can include media."
        )
    if uploaded_file is None:
        raise StatusMediaError("A media file is required for this story.")

    filename = Path(
        str(getattr(uploaded_file, "name", "") or "")
    ).name.strip()
    if not filename or len(filename) > 255:
        raise StatusMediaError("The media file name is invalid.")

    size_bytes = int(getattr(uploaded_file, "size", 0) or 0)
    if size_bytes <= 0:
        raise StatusMediaError("The selected media file is empty.")

    max_size_bytes = MAX_SIZE_BY_KIND[kind]
    if size_bytes > max_size_bytes:
        max_size_mb = max_size_bytes // (1024 * 1024)
        raise StatusMediaError(
            f"{kind.title()} stories must be {max_size_mb} MB or smaller."
        )

    mime_type = _resolve_mime_type(
        uploaded_file=uploaded_file,
        filename=filename,
    )
    if mime_type not in MIME_TYPES_BY_KIND[kind]:
        raise StatusMediaError(
            f"The selected file is not a supported {kind}."
        )

    return {
        "original_name": filename,
        "mime_type": mime_type,
        "size_bytes": size_bytes,
        "duration_seconds": _normalize_duration(
            kind=kind,
            duration_seconds=duration_seconds,
        ),
    }


def _resolve_mime_type(*, uploaded_file, filename: str) -> str:
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
                "Video stories cannot exceed 90 seconds."
            )
        return round(normalized_duration, 3)

    if duration_seconds not in (None, ""):
        raise StatusMediaError(
            "Only video stories can include duration_seconds."
        )
    return None


def safe_extension(*, filename: str, mime_type: str) -> str:
    supplied_extension = Path(filename).suffix.lower().lstrip(".")
    expected_extension = EXTENSIONS_BY_MIME_TYPE[mime_type]

    if supplied_extension == expected_extension:
        return supplied_extension
    if mime_type == "image/jpeg" and supplied_extension == "jpeg":
        return "jpg"
    return expected_extension
