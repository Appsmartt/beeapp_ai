from __future__ import annotations

from typing import Any

from apps.statuses.exceptions import StatusValidationError


def normalize_actor_type(value: str) -> str:
    normalized_value = str(value or "").strip()

    if normalized_value not in {
        "profile",
        "commercial_profile",
    }:
        raise StatusValidationError(
            "actor_type must be profile or commercial_profile."
        )

    return normalized_value


def normalize_story_kind(value: str) -> str:
    normalized_value = str(value or "").strip()

    if normalized_value not in {
        "image",
        "video",
        "gif",
        "text",
    }:
        raise StatusValidationError(
            "kind must be image, video, gif, or text."
        )

    return normalized_value


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = str(value).strip()

    return normalized_value or None


def validate_story_input(
    *,
    kind: str,
    text_content: str | None,
    text_background_id: str | None,
    uploaded_file,
    editor_metadata: dict[str, Any] | None,
) -> None:
    if kind == "text":
        if not normalize_optional_text(text_content):
            raise StatusValidationError(
                "Text stories require non-empty text_content."
            )

        if not text_background_id:
            raise StatusValidationError(
                "Text stories require text_background_id."
            )

        if uploaded_file is not None:
            raise StatusValidationError(
                "Text stories cannot include media."
            )
    else:
        if uploaded_file is None:
            raise StatusValidationError(
                "Media stories require a file."
            )

        if normalize_optional_text(text_content):
            raise StatusValidationError(
                "Only text stories can include text_content."
            )

        if text_background_id is not None:
            raise StatusValidationError(
                "Only text stories can include text_background_id."
            )

    if editor_metadata is not None and not isinstance(
        editor_metadata,
        dict,
    ):
        raise StatusValidationError(
            "editor_metadata must be a JSON object."
        )
