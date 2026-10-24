from rest_framework import serializers

from .validators import (
    validate_hex_color,
    validate_note_tag_icon,
    validate_note_tag_name,
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
        return validate_note_tag_icon(value)

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
        return validate_note_tag_icon(value)

    def validate_color(self, value: str) -> str:
        return validate_hex_color(value)

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
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
