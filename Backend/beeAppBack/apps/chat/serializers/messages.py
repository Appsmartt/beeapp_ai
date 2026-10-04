from __future__ import annotations

import math

from rest_framework import serializers

from .constants import (
    CHAT_ATTACHMENT_MESSAGE_TYPES,
    CHAT_MESSAGE_TYPES,
)

class ChatMessageListQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )
    before_sequence = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )


class SendChatMessageSerializer(serializers.Serializer):
    sender_identity_id = serializers.UUIDField()

    message_type = serializers.ChoiceField(
        choices=CHAT_MESSAGE_TYPES,
        default="text",
        required=False,
    )

    body = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=10_000,
        trim_whitespace=True,
    )

    attachment_file_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    reference_type = serializers.CharField(
        required=False,
        allow_blank=False,
        allow_null=True,
        max_length=80,
        trim_whitespace=True,
    )

    reference_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    metadata = serializers.JSONField(
        required=False,
        default=dict,
    )

    def validate_body(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None

    def validate_reference_type(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None

    def validate_metadata(
        self,
        value,
    ):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Metadata must be a JSON object."
            )

        return value

    def validate(self, attrs: dict) -> dict:
        message_type = attrs.get("message_type", "text")
        body = attrs.get("body")
        attachment_file_id = attrs.get("attachment_file_id")
        reference_type = attrs.get("reference_type")
        reference_id = attrs.get("reference_id")

        if bool(reference_type) != bool(reference_id):
            raise serializers.ValidationError(
                {
                    "reference_id": (
                        "reference_type and reference_id must be "
                        "provided together."
                    )
                }
            )

        if message_type == "system":
            raise serializers.ValidationError(
                {
                    "message_type": (
                        "System messages cannot be sent by clients."
                    )
                }
            )

        if message_type == "location":
            location = attrs.get("metadata", {}).get("location")
            if (
                not isinstance(location, dict)
                or set(location) != {"latitude", "longitude"}
                or any(
                    isinstance(location[key], bool)
                    or not isinstance(location[key], (int, float))
                    or not math.isfinite(location[key])
                    for key in ("latitude", "longitude")
                )
                or not -90 <= location["latitude"] <= 90
                or not -180 <= location["longitude"] <= 180
                or attachment_file_id is not None
                or not body
            ):
                raise serializers.ValidationError(
                    {"metadata": "Location requires valid coordinates, a label, and no attachment."}
                )

        if message_type == "text" and not body:
            raise serializers.ValidationError(
                {
                    "body": (
                        "Text messages require non-empty content."
                    )
                }
            )

        if (
            message_type in CHAT_ATTACHMENT_MESSAGE_TYPES
            and attachment_file_id is None
        ):
            raise serializers.ValidationError(
                {
                    "attachment_file_id": (
                        "This message type requires an attachment."
                    )
                }
            )

        if (
            not body
            and attachment_file_id is None
            and reference_id is None
        ):
            raise serializers.ValidationError(
                "A message requires text, an attachment, or a reference."
            )

        return attrs


class MarkConversationDeliveredSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    last_delivered_message_id = serializers.UUIDField()


class MarkConversationReadSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    last_read_message_id = serializers.UUIDField()


class CreateReactionSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    emoji = serializers.CharField(
        min_length=1,
        max_length=32,
        trim_whitespace=True,
    )

    def validate_emoji(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Emoji cannot be empty."
            )

        return normalized_value


class DeleteReactionQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()


class ChatMessageReadersQuerySerializer(serializers.Serializer):
    """
    Serializer de query vacío para mantener consistencia en endpoints
    que no requieren parámetros adicionales.
    """
