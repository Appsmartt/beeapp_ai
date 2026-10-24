from __future__ import annotations

import json
from decimal import Decimal

from rest_framework import serializers


STATUS_ACTOR_TYPES = (
    "profile",
    "commercial_profile",
)

STATUS_STORY_KINDS = (
    "image",
    "video",
    "gif",
    "text",
)

MAX_STATUS_CAPTION_LENGTH = 1000
MAX_STATUS_TEXT_LENGTH = 1000
MAX_STATUS_MENTIONS = 20
MAX_STATUS_EDITOR_METADATA_BYTES = 100_000
MAX_STATUS_IMAGE_LAYERS = 3
IMAGE_LAYER_FILE_FIELD_NAMES = tuple(
    f"image_layer_file_{index}"
    for index in range(MAX_STATUS_IMAGE_LAYERS)
)

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


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


def _normalize_editor_metadata(value) -> dict:
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise serializers.ValidationError(
            "editor_metadata must be a JSON object."
        )

    return value


def _validate_editor_metadata(value: dict) -> dict:
    forbidden_keys = {
        "music",
        "audio",
        "audio_file_id",
        "audio_url",
        "product",
        "products",
    }

    present_forbidden_keys = sorted(
        key
        for key in forbidden_keys
        if key in value and value[key] not in (None, [], {}, "")
    )

    if present_forbidden_keys:
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "Music, audio, and products are not supported "
                    "in this statuses sprint."
                )
            }
        )

    mentions = value.get("mentions", [])

    if mentions is None:
        mentions = []

    if not isinstance(mentions, list):
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "editor_metadata.mentions must be a list."
                )
            }
        )

    if len(mentions) > MAX_STATUS_MENTIONS:
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    f"A status can mention at most "
                    f"{MAX_STATUS_MENTIONS} profiles."
                )
            }
        )

    normalized_mentions: list[str] = []

    for mention in mentions:
        try:
            normalized_mention = str(
                serializers.UUIDField().to_internal_value(mention)
            )
        except serializers.ValidationError as error:
            raise serializers.ValidationError(
                {
                    "editor_metadata": (
                        "Each mention must be a valid profile UUID."
                    )
                }
            ) from error

        normalized_mentions.append(normalized_mention)

    if len(normalized_mentions) != len(set(normalized_mentions)):
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "Mentions cannot contain repeated profiles."
                )
            }
        )

    normalized_value = dict(value)
    normalized_value["mentions"] = normalized_mentions

    encoded_size = len(
        serializers.JSONField().to_representation(
            normalized_value
        ).__str__().encode("utf-8")
    )

    if encoded_size > MAX_STATUS_EDITOR_METADATA_BYTES:
        raise serializers.ValidationError(
            {
                "editor_metadata": (
                    "editor_metadata is too large."
                )
            }
        )

    return normalized_value
