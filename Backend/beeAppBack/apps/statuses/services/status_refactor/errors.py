from __future__ import annotations

from apps.statuses.exceptions import (
    StatusAccessError,
    StatusMediaError,
    StatusOperationError,
    StatusValidationError,
)


def raise_status_operation_error(
    error: Exception,
    *,
    default_message: str,
) -> None:
    message = str(error)

    if "STATUS_STORY_LIMIT_30_PER_24_HOURS" in message:
        raise StatusValidationError(
            "You can publish at most 30 stories in 24 hours."
        ) from error

    if "STATUS_TEXT_CONTENT_REQUIRED" in message:
        raise StatusValidationError(
            "Text stories require non-empty content."
        ) from error

    if "STATUS_TEXT_BACKGROUND_MUST_BE_ACTIVE" in message:
        raise StatusValidationError(
            "Text stories require an active background."
        ) from error

    if "STATUS_NON_TEXT_CANNOT_HAVE_TEXT_FIELDS" in message:
        raise StatusValidationError(
            "Media stories cannot include text story fields."
        ) from error

    if "STATUS_EDITOR_METADATA_MUST_BE_OBJECT" in message:
        raise StatusValidationError(
            "editor_metadata must be a JSON object."
        ) from error

    if (
        "STATUS_ACTOR_NOT_OWNED_BY_USER" in message
        or "STATUS_STORY_NOT_OWNED_BY_USER" in message
        or "STATUS_ACTOR_NOT_FOUND" in message
    ):
        raise StatusAccessError(
            "The selected status author is unavailable."
        ) from error

    if (
        "STATUS_IMAGE_MIME_TYPE_NOT_ALLOWED" in message
        or "STATUS_VIDEO_MIME_TYPE_NOT_ALLOWED" in message
        or "STATUS_GIF_MIME_TYPE_NOT_ALLOWED" in message
        or "STATUS_IMAGE_MAX_SIZE_10_MB" in message
        or "STATUS_VIDEO_MAX_SIZE_40_MB" in message
        or "STATUS_GIF_MAX_SIZE_10_MB" in message
        or "STATUS_VIDEO_DURATION_MAX_90_SECONDS" in message
        or "STATUS_GIF_DURATION_MAX_120_SECONDS" in message
    ):
        raise StatusMediaError(
            "The selected media does not meet story requirements."
        ) from error

    raise StatusOperationError(
        f"{default_message} {message}"
    ) from error
