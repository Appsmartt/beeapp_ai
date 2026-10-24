from __future__ import annotations

import json
from typing import Any

from rest_framework import serializers

from .constants import ALLOWED_BLOCK_TYPES, MAX_NOTE_CONTENT_BYTES


def validate_note_content(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise serializers.ValidationError("Note content must be an object.")

    version = value.get("version")
    blocks = value.get("blocks")

    if not isinstance(version, int) or version < 1:
        raise serializers.ValidationError(
            "Note content must include a valid version."
        )

    if not isinstance(blocks, list):
        raise serializers.ValidationError(
            "Note content must include a blocks array."
        )

    if len(blocks) > 500:
        raise serializers.ValidationError(
            "A note cannot contain more than 500 blocks."
        )

    try:
        serialized_size = len(
            json.dumps(
                value,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8")
        )
    except (TypeError, ValueError) as error:
        raise serializers.ValidationError(
            "Note content must be JSON serializable."
        ) from error

    if serialized_size > MAX_NOTE_CONTENT_BYTES:
        raise serializers.ValidationError(
            "Note content cannot exceed 1 MB."
        )

    seen_block_ids: set[str] = set()

    for index, block in enumerate(blocks):
        if not isinstance(block, dict):
            raise serializers.ValidationError(
                {"blocks": {index: "Each block must be an object."}}
            )

        block_id = block.get("id")
        block_type = block.get("type")

        if (
            not isinstance(block_id, str)
            or not block_id.strip()
            or len(block_id) > 120
        ):
            raise serializers.ValidationError(
                {
                    "blocks": {
                        index: (
                            "Each block requires a valid id "
                            "of at most 120 characters."
                        )
                    }
                }
            )

        if block_id in seen_block_ids:
            raise serializers.ValidationError(
                {
                    "blocks": {
                        index: "Block IDs cannot be repeated.",
                    }
                }
            )

        seen_block_ids.add(block_id)

        if block_type not in ALLOWED_BLOCK_TYPES:
            raise serializers.ValidationError(
                {
                    "blocks": {
                        index: "The block type is not supported.",
                    }
                }
            )

    return value


def validate_note_folder_name(value: str) -> str:
    normalized_value = value.strip()

    if not normalized_value:
        raise serializers.ValidationError("Folder name cannot be empty.")

    if "/" in normalized_value or "\\" in normalized_value:
        raise serializers.ValidationError(
            "Folder names cannot contain slashes."
        )

    return normalized_value


def validate_note_tag_name(value: str) -> str:
    normalized_value = value.strip()

    if not normalized_value:
        raise serializers.ValidationError("Tag name cannot be empty.")

    return normalized_value


def validate_hex_color(value: str) -> str:
    normalized_value = value.strip().upper()

    if (
        len(normalized_value) != 7
        or not normalized_value.startswith("#")
    ):
        raise serializers.ValidationError(
            "Color must use hexadecimal format, for example #8B5CF6."
        )

    try:
        int(normalized_value[1:], 16)
    except ValueError as error:
        raise serializers.ValidationError(
            "Color must use hexadecimal format, for example #8B5CF6."
        ) from error

    return normalized_value


def validate_note_title(value: str) -> str:
    normalized_value = value.strip()

    if not normalized_value:
        raise serializers.ValidationError("Title cannot be empty.")

    return normalized_value


def validate_note_tag_icon(value: str) -> str:
    normalized_value = value.strip()

    if not normalized_value:
        raise serializers.ValidationError("Tag icon cannot be empty.")

    return normalized_value
