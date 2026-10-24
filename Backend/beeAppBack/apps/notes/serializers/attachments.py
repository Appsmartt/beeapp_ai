from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .constants import MAX_NOTE_UPLOAD_FILES, NOTE_ATTACHMENT_TYPES


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


class NoteAttachmentAccessQuerySerializer(serializers.Serializer):
    download = serializers.BooleanField(
        required=False,
        default=False,
    )
