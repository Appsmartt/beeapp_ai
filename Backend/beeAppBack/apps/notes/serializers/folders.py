from rest_framework import serializers

from .validators import validate_note_folder_name


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
