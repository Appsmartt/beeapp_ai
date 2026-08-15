from __future__ import annotations

import json
from typing import Any

from rest_framework import serializers


MAX_NOTE_TITLE_LENGTH = 500
MAX_NOTE_CONTENT_BYTES = 1_000_000
MAX_NOTE_UPLOAD_FILES = 10

ALLOWED_BLOCK_TYPES = {
    "text",
    "heading",
    "field",
    "textarea",
    "checklist",
    "bulleted_list",
    "numbered_list",
    "date",
    "date_list",
    "number_list",
    "image",
    "file",
    "file_list",
    "divider",
}

NOTE_ATTACHMENT_TYPES = (
    "attachment",
    "image",
    "cover",
)


def validate_note_content(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise serializers.ValidationError(
            "Note content must be an object."
        )

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
                {
                    "blocks": {
                        index: "Each block must be an object.",
                    }
                }
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
        raise serializers.ValidationError(
            "Folder name cannot be empty."
        )

    if "/" in normalized_value or "\\" in normalized_value:
        raise serializers.ValidationError(
            "Folder names cannot contain slashes."
        )

    return normalized_value


def validate_note_tag_name(value: str) -> str:
    normalized_value = value.strip()

    if not normalized_value:
        raise serializers.ValidationError(
            "Tag name cannot be empty."
        )

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


class NoteTemplateListQuerySerializer(serializers.Serializer):
    include_inactive = serializers.BooleanField(
        required=False,
        default=False,
    )


class CreateNoteSerializer(serializers.Serializer):
    title = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=MAX_NOTE_TITLE_LENGTH,
        trim_whitespace=True,
    )
    template_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    folder_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate_title(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Title cannot be empty."
            )

        return normalized_value


class NoteListQuerySerializer(serializers.Serializer):
    folder_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    template_id = serializers.UUIDField(
        required=False,
    )
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=120,
        trim_whitespace=True,
    )
    is_favorite = serializers.BooleanField(
        required=False,
        allow_null=True,
    )
    is_pinned = serializers.BooleanField(
        required=False,
        allow_null=True,
    )
    is_archived = serializers.BooleanField(
        required=False,
        allow_null=True,
    )
    deleted = serializers.BooleanField(
        required=False,
        default=False,
    )
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )
    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )

    def validate_search(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Search text cannot be empty."
            )

        return normalized_value


class UpdateNoteSerializer(serializers.Serializer):
    title = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=MAX_NOTE_TITLE_LENGTH,
        trim_whitespace=True,
    )
    content = serializers.JSONField(
        required=False,
    )
    color = serializers.CharField(
        required=False,
        max_length=7,
        trim_whitespace=True,
    )
    folder_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    is_favorite = serializers.BooleanField(
        required=False,
    )
    is_pinned = serializers.BooleanField(
        required=False,
    )
    is_archived = serializers.BooleanField(
        required=False,
    )
    position = serializers.DecimalField(
        required=False,
        max_digits=20,
        decimal_places=6,
    )
    last_opened_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    def validate_title(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Title cannot be empty."
            )

        return normalized_value

    def validate_content(
        self,
        value: dict[str, Any],
    ) -> dict[str, Any]:
        return validate_note_content(value)

    def validate_color(self, value: str) -> str:
        return validate_hex_color(value)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )

        return attrs


class NoteFolderQuerySerializer(serializers.Serializer):
    parent_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


class CreateNoteFolderSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )
    parent_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate_name(self, value: str) -> str:
        return validate_note_folder_name(value)


class RenameNoteFolderSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )

    def validate_name(self, value: str) -> str:
        return validate_note_folder_name(value)


class MoveNoteFolderSerializer(serializers.Serializer):
    parent_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


class CreateNoteTagSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=40,
        trim_whitespace=True,
    )
    icon = serializers.CharField(
        required=False,
        default="tag",
        max_length=50,
        trim_whitespace=True,
    )
    color = serializers.CharField(
        required=False,
        default="#8B5CF6",
        max_length=7,
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )

    def validate_name(self, value: str) -> str:
        return validate_note_tag_name(value)

    def validate_icon(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Tag icon cannot be empty."
            )

        return normalized_value

    def validate_color(self, value: str) -> str:
        return validate_hex_color(value)


class UpdateNoteTagSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=40,
        trim_whitespace=True,
    )
    icon = serializers.CharField(
        required=False,
        max_length=50,
        trim_whitespace=True,
    )
    color = serializers.CharField(
        required=False,
        max_length=7,
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        min_value=0,
    )

    def validate_name(self, value: str) -> str:
        return validate_note_tag_name(value)

    def validate_icon(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Tag icon cannot be empty."
            )

        return normalized_value

    def validate_color(self, value: str) -> str:
        return validate_hex_color(value)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )

        return attrs


class ReplaceNoteTagsSerializer(serializers.Serializer):
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
        max_length=30,
    )

    def validate_tag_ids(self, value):
        normalized_ids = [str(tag_id) for tag_id in value]

        if len(normalized_ids) != len(set(normalized_ids)):
            raise serializers.ValidationError(
                "Tag IDs cannot be repeated."
            )

        return value


class CreateNoteAttachmentSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    attachment_type = serializers.ChoiceField(
        choices=NOTE_ATTACHMENT_TYPES,
        required=False,
        default="attachment",
    )
    display_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )


class UpdateNoteAttachmentSerializer(serializers.Serializer):
    attachment_type = serializers.ChoiceField(
        choices=NOTE_ATTACHMENT_TYPES,
        required=False,
    )
    display_order = serializers.IntegerField(
        required=False,
        min_value=0,
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )

        return attrs


class UploadNoteAttachmentsSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(
            allow_empty_file=False,
        ),
        required=False,
        allow_empty=False,
        max_length=MAX_NOTE_UPLOAD_FILES,
    )
    file = serializers.FileField(
        required=False,
        allow_empty_file=False,
    )
    attachment_type = serializers.ChoiceField(
        choices=NOTE_ATTACHMENT_TYPES,
        required=False,
        default="attachment",
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        uploaded_files = list(attrs.get("files") or [])
        single_file = attrs.get("file")

        if single_file:
            uploaded_files.append(single_file)

        if not uploaded_files:
            raise serializers.ValidationError(
                {
                    "files": (
                        "Provide at least one file using "
                        "'files' or 'file'."
                    )
                }
            )

        attrs["files"] = uploaded_files
        attrs.pop("file", None)

        return attrs