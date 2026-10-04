from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .commercial_links import _normalize_commercial_offer_link
from .image_layers import (
    _normalize_image_layers_metadata,
    _validate_image_layer_files,
)

from .metadata import (
    MAX_STATUS_CAPTION_LENGTH,
    MAX_STATUS_TEXT_LENGTH,
    STATUS_ACTOR_TYPES,
    STATUS_STORY_KINDS,
    _normalize_editor_metadata,
    _normalize_optional_text,
    _validate_editor_metadata,
)


class StatusCreateSerializer(serializers.Serializer):
    actor_type = serializers.ChoiceField(
        choices=STATUS_ACTOR_TYPES,
        required=False,
        default="profile",
    )
    actor_commercial_profile_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    kind = serializers.ChoiceField(
        choices=STATUS_STORY_KINDS,
    )
    caption = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=MAX_STATUS_CAPTION_LENGTH,
        trim_whitespace=True,
    )
    text_content = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=MAX_STATUS_TEXT_LENGTH,
        trim_whitespace=True,
    )
    text_background_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    editor_metadata = serializers.JSONField(
        required=False,
        default=dict,
    )
    file = serializers.FileField(
        required=False,
        allow_empty_file=False,
    )
    duration_seconds = serializers.DecimalField(
        required=False,
        allow_null=True,
        max_digits=8,
        decimal_places=3,
        min_value=Decimal("0.001"),
    )
    image_layers_metadata = serializers.JSONField(
        required=False,
        default=list,
    )
    commercial_offer_link = serializers.JSONField(
        required=False,
        allow_null=True,
    )
    image_layer_file_0 = serializers.FileField(
        required=False,
        allow_empty_file=False,
    )
    image_layer_file_1 = serializers.FileField(
        required=False,
        allow_empty_file=False,
    )
    image_layer_file_2 = serializers.FileField(
        required=False,
        allow_empty_file=False,
    )

    def validate_caption(self, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    def validate_text_content(
        self,
        value: str | None,
    ) -> str | None:
        return _normalize_optional_text(value)

    def validate_editor_metadata(self, value) -> dict:
        normalized = _normalize_editor_metadata(value)
        return _validate_editor_metadata(normalized)

    def validate_image_layers_metadata(self, value) -> list[dict]:
        return _normalize_image_layers_metadata(value)

    def validate_commercial_offer_link(self, value) -> dict | None:
        return _normalize_commercial_offer_link(value)

    def validate(self, attrs: dict) -> dict:
        actor_type = attrs["actor_type"]
        commercial_profile_id = attrs.get(
            "actor_commercial_profile_id"
        )
        kind = attrs["kind"]
        uploaded_file = attrs.get("file")
        duration_seconds = attrs.get("duration_seconds")
        text_content = attrs.get("text_content")
        text_background_id = attrs.get("text_background_id")
        image_layers = attrs.get("image_layers_metadata", [])
        commercial_offer_link = attrs.get("commercial_offer_link")
        image_layer_files = _validate_image_layer_files(
            layers=image_layers,
            files=attrs,
        )
        attrs["image_layer_files"] = image_layer_files

        if actor_type == "profile" and commercial_offer_link:
            raise serializers.ValidationError(
                {
                    "commercial_offer_link": (
                        "Commercial offer links require a commercial story."
                    )
                }
            )

        if actor_type == "profile" and commercial_profile_id:
            raise serializers.ValidationError(
                {
                    "actor_commercial_profile_id": (
                        "This field must be omitted for profile stories."
                    )
                }
            )

        if (
            actor_type == "commercial_profile"
            and not commercial_profile_id
        ):
            raise serializers.ValidationError(
                {
                    "actor_commercial_profile_id": (
                        "This field is required for commercial stories."
                    )
                }
            )

        if kind == "text":
            if not text_content:
                raise serializers.ValidationError(
                    {
                        "text_content": (
                            "Text stories require non-empty content."
                        )
                    }
                )

            if not text_background_id:
                raise serializers.ValidationError(
                    {
                        "text_background_id": (
                            "Text stories require an active background."
                        )
                    }
                )

            if uploaded_file is not None:
                raise serializers.ValidationError(
                    {
                        "file": (
                            "Text stories cannot include a media file."
                        )
                    }
                )

            if duration_seconds is not None:
                raise serializers.ValidationError(
                    {
                        "duration_seconds": (
                            "Text stories cannot include duration_seconds."
                        )
                    }
                )

        else:
            if uploaded_file is None:
                raise serializers.ValidationError(
                    {
                        "file": (
                            "Image, GIF, and video stories require a file."
                        )
                    }
                )

            if text_content is not None:
                raise serializers.ValidationError(
                    {
                        "text_content": (
                            "Only text stories can include text_content."
                        )
                    }
                )

            if text_background_id is not None:
                raise serializers.ValidationError(
                    {
                        "text_background_id": (
                            "Only text stories can include "
                            "text_background_id."
                        )
                    }
                )

            if kind == "video" and duration_seconds is None:
                raise serializers.ValidationError(
                    {
                        "duration_seconds": (
                            "Video stories require duration_seconds."
                        )
                    }
                )

            if kind != "video" and duration_seconds is not None:
                raise serializers.ValidationError(
                    {
                        "duration_seconds": (
                            "Only video stories can include "
                            "duration_seconds."
                        )
                    }
                )

        return attrs


class StatusReplySerializer(serializers.Serializer):
    sender_identity_id = serializers.UUIDField()
    body = serializers.CharField(
        max_length=10_000,
        trim_whitespace=True,
    )

    def validate_body(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "A status reply requires non-empty content."
            )

        return normalized_value
