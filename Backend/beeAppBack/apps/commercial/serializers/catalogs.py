from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.shared import (
    normalize_optional_text,
)


class OwnedCommercialCatalogsQuerySerializer(serializers.Serializer):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class CreateCommercialCatalogSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=160,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )
    status = serializers.ChoiceField(
        choices=("published", "paused"),
        required=False,
        default="published",
    )

    def validate_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Catalog name cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)


class UpdateCommercialCatalogSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=160,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
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
                "Catalog name cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate(self, attrs: dict) -> dict:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs
