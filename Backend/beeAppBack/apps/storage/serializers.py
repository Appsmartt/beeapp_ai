from __future__ import annotations

from rest_framework import serializers


MAX_FILE_SIZE_BYTES = 52_428_800

FILE_KINDS = (
    "image",
    "video",
    "audio",
    "document",
    "spreadsheet",
    "presentation",
    "archive",
    "other",
)


def validate_display_name(value: str) -> str:
    normalized_value = value.strip()

    if not normalized_value:
        raise serializers.ValidationError(
            "File name cannot be empty."
        )

    if "/" in normalized_value or "\\" in normalized_value:
        raise serializers.ValidationError(
            "File names cannot contain slashes."
        )

    if len(normalized_value) > 255:
        raise serializers.ValidationError(
            "File name cannot be longer than 255 characters."
        )

    return normalized_value


def validate_folder_name(value: str) -> str:
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


class StorageListQuerySerializer(serializers.Serializer):
    folder_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    status = serializers.ChoiceField(
        choices=("ready", "trashed"),
        required=False,
        default="ready",
    )
    scope = serializers.ChoiceField(
        choices=(
            "all",
            "recent",
            "documents",
            "media",
        ),
        required=False,
        default="all",
    )
    kind = serializers.ChoiceField(
        choices=FILE_KINDS,
        required=False,
    )
    tag_id = serializers.UUIDField(
        required=False,
    )
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=120,
        trim_whitespace=True,
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


class StorageFolderQuerySerializer(serializers.Serializer):
    parent_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


class CreateStorageFolderSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )
    parent_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate_name(self, value: str) -> str:
        return validate_folder_name(value)


class RenameStorageFolderSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )

    def validate_name(self, value: str) -> str:
        return validate_folder_name(value)


class MoveStorageFolderSerializer(serializers.Serializer):
    parent_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


class RenameStorageFileSerializer(serializers.Serializer):
    display_name = serializers.CharField(
        max_length=255,
        trim_whitespace=True,
    )

    def validate_display_name(self, value: str) -> str:
        return validate_display_name(value)


class MoveStorageFileSerializer(serializers.Serializer):
    folder_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )


class UploadStorageFilesSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(
            allow_empty_file=False,
        ),
        required=False,
        allow_empty=False,
        max_length=20,
    )
    file = serializers.FileField(
        required=False,
        allow_empty_file=False,
    )
    folder_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
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

        for uploaded_file in uploaded_files:
            if uploaded_file.size > MAX_FILE_SIZE_BYTES:
                raise serializers.ValidationError(
                    {
                        "files": (
                            "Each file must be 50 MB or smaller."
                        )
                    }
                )

        attrs["files"] = uploaded_files
        attrs.pop("file", None)

        return attrs


class FileAccessQuerySerializer(serializers.Serializer):
    download = serializers.BooleanField(
        required=False,
        default=False,
    )


class CreateStorageTagSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    icon = serializers.CharField(
        max_length=50,
        required=False,
        default="Tag",
        trim_whitespace=True,
    )
    color = serializers.CharField(
        max_length=7,
        required=False,
        default="#F3E8FF",
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )

    def validate_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Tag name cannot be empty."
            )

        return normalized_value

    def validate_icon(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Tag icon cannot be empty."
            )

        return normalized_value

    def validate_color(self, value: str) -> str:
        normalized_value = value.strip().upper()

        if (
            len(normalized_value) != 7
            or not normalized_value.startswith("#")
        ):
            raise serializers.ValidationError(
                "Color must be a hexadecimal value such as #F3E8FF."
            )

        try:
            int(normalized_value[1:], 16)
        except ValueError as error:
            raise serializers.ValidationError(
                "Color must be a hexadecimal value such as #F3E8FF."
            ) from error

        return normalized_value


class UpdateStorageTagSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=100,
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
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Tag name cannot be empty."
            )

        return normalized_value

    def validate_icon(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Tag icon cannot be empty."
            )

        return normalized_value

    def validate_color(self, value: str) -> str:
        normalized_value = value.strip().upper()

        if (
            len(normalized_value) != 7
            or not normalized_value.startswith("#")
        ):
            raise serializers.ValidationError(
                "Color must be a hexadecimal value such as #F3E8FF."
            )

        try:
            int(normalized_value[1:], 16)
        except ValueError as error:
            raise serializers.ValidationError(
                "Color must be a hexadecimal value such as #F3E8FF."
            ) from error

        return normalized_value


class ReplaceFileTagsSerializer(serializers.Serializer):
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


class RecipientSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=10,
        min_value=1,
        max_value=20,
    )

    def validate_q(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Search text cannot be empty."
            )

        return normalized_value


class CreateFileShareSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField()
    permission = serializers.ChoiceField(
        choices=(
            "viewer",
            "editor",
        ),
        required=False,
        default="viewer",
    )
    expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )


class ReceivedSharesQuerySerializer(serializers.Serializer):
    include_hidden = serializers.BooleanField(
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