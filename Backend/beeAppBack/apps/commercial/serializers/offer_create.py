from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.offer_validation import (
    COMMERCIAL_OFFER_KINDS,
    COMMERCIAL_PRICING_STRATEGIES,
    COMMERCIAL_SERVICE_PAYMENT_POLICIES,
    _validate_offer_payload,
)
from apps.commercial.serializers.shared import (
    COMMERCIAL_PROFILE_MODALITIES,
    normalize_optional_text,
)


class CreateCommercialOfferSerializer(serializers.Serializer):
    catalog_id = serializers.UUIDField()
    offer_kind = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_KINDS,
    )
    title = serializers.CharField(
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
        default="fixed",
    )
    base_price_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    currency_code = serializers.CharField(
        required=False,
        default="COP",
        max_length=3,
        trim_whitespace=True,
    )
    is_available = serializers.BooleanField(
        required=False,
        default=True,
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
    track_inventory = serializers.BooleanField(
        required=False,
        default=False,
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
        default=False,
    )
    payment_policy = serializers.ChoiceField(
        choices=COMMERCIAL_SERVICE_PAYMENT_POLICIES,
        required=False,
        allow_null=True,
    )
    modalities = serializers.ListField(
        child=serializers.ChoiceField(
            choices=COMMERCIAL_PROFILE_MODALITIES,
        ),
        required=False,
        allow_empty=True,
        max_length=8,
        default=list,
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

    def validate_modalities(
        self,
        value: list[str],
    ) -> list[str]:
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Offer modalities cannot be repeated."
            )

        return value

    def validate(self, attrs: dict) -> dict:
        _validate_offer_payload(
            attrs=attrs,
            require_all_fields=True,
        )
        return attrs
