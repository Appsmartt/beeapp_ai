from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.offer_validation import (
    COMMERCIAL_PRICING_STRATEGIES,
    COMMERCIAL_SERVICE_PAYMENT_POLICIES,
)
from apps.commercial.serializers.shared import (
    normalize_optional_text,
)


class UpdateCommercialOfferSerializer(serializers.Serializer):
    catalog_id = serializers.UUIDField(
        required=False,
    )
    title = serializers.CharField(
        required=False,
        max_length=200,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=6000,
        trim_whitespace=True,
    )
    pricing_strategy = serializers.ChoiceField(
        choices=COMMERCIAL_PRICING_STRATEGIES,
        required=False,
    )
    base_price_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    currency_code = serializers.CharField(
        required=False,
        max_length=3,
        trim_whitespace=True,
    )
    is_available = serializers.BooleanField(
        required=False,
    )
    sort_order = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    track_inventory = serializers.BooleanField(
        required=False,
    )
    stock_quantity = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    duration_minutes = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=5,
        max_value=1440,
    )
    requires_booking = serializers.BooleanField(
        required=False,
    )
    payment_policy = serializers.ChoiceField(
        choices=COMMERCIAL_SERVICE_PAYMENT_POLICIES,
        required=False,
        allow_null=True,
    )

    def validate_title(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Offer title cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_currency_code(self, value: str) -> str:
        normalized_value = value.strip().upper()

        if normalized_value != "COP":
            raise serializers.ValidationError(
                "Currency code must be COP."
            )

        return normalized_value

    def validate(self, attrs: dict) -> dict:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs
