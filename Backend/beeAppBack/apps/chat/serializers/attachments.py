from __future__ import annotations

from rest_framework import serializers

from .constants import (
    CHAT_ATTACHMENT_MESSAGE_TYPES,
    MAX_CHAT_ATTACHMENT_SIZE_BYTES,
)

class UploadChatAttachmentSerializer(serializers.Serializer):
    """
    Upload multipart para un único archivo, ligado a una identidad
    remitente propia y a una conversación existente.

    El archivo se sube bajo owner_id = auth.uid(), por lo que consume
    la cuota del usuario autenticado, como definimos para BeeApp.
    """

    sender_identity_id = serializers.UUIDField()

    message_type = serializers.ChoiceField(
        choices=CHAT_ATTACHMENT_MESSAGE_TYPES,
    )

    file = serializers.FileField(
        allow_empty_file=False,
    )

    body = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=10_000,
        trim_whitespace=True,
    )

    metadata = serializers.JSONField(
        required=False,
        default=dict,
    )

    def validate_file(self, value):
        if value.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES:
            raise serializers.ValidationError(
                "Chat attachments must be 50 MB or smaller."
            )

        if value.size <= 0:
            raise serializers.ValidationError(
                "Chat attachment cannot be empty."
            )

        return value

    def validate_body(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Metadata must be a JSON object."
            )

        return value


class ChatAttachmentAccessQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()

    download = serializers.BooleanField(
        required=False,
        default=False,
    )
