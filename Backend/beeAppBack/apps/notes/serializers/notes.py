from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .constants import MAX_NOTE_TITLE_LENGTH
from .validators import (
    validate_hex_color,
    validate_note_content,
    validate_note_title,
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
        return validate_note_title(value)


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
        return validate_note_title(value)

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
