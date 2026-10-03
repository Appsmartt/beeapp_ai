from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.shared import (
    normalize_optional_text,
)


class AdjustCommercialOfferInventorySerializer(
    serializers.Serializer,
):
    quantity_delta = serializers.IntegerField()
    reason_code = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=5000,
        trim_whitespace=True,
    )

    def validate_quantity_delta(self, value: int) -> int:
        if value == 0:
            raise serializers.ValidationError(
                "Quantity delta cannot be zero."
            )

        return value

    def validate_reason_code(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Reason code cannot be empty."
            )

        return normalized_value

    def validate_reason_text(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)


class CommercialAuditEventsQuerySerializer(
    serializers.Serializer,
):
    entity_type = serializers.CharField(
        required=False,
        max_length=80,
        trim_whitespace=True,
    )
    entity_id = serializers.UUIDField(
        required=False,
    )
    action = serializers.CharField(
        required=False,
        max_length=100,
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

    def validate_entity_type(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Entity type cannot be empty."
            )

        return normalized_value

    def validate_action(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Action cannot be empty."
            )

        return normalized_value
