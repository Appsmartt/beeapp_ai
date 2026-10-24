from __future__ import annotations

from rest_framework import serializers

from apps.commercial.enums import (
    CommercialOfferKind,
    CommercialPaymentPolicy,
    CommercialPricingStrategy,
    enum_values,
)


COMMERCIAL_OFFER_KINDS = enum_values(
    CommercialOfferKind,
)

COMMERCIAL_PRICING_STRATEGIES = enum_values(
    CommercialPricingStrategy,
)

COMMERCIAL_SERVICE_PAYMENT_POLICIES = enum_values(
    CommercialPaymentPolicy,
)


def _validate_offer_payload(
    *,
    attrs: dict,
    require_all_fields: bool,
) -> None:
    offer_kind = attrs.get("offer_kind")
    pricing_strategy = attrs.get("pricing_strategy")
    base_price_amount = attrs.get("base_price_amount")

    if pricing_strategy in {"fixed", "starting_at"}:
        if base_price_amount is None:
            raise serializers.ValidationError(
                {
                    "base_price_amount": (
                        "Fixed and starting-at pricing require "
                        "a base price amount."
                    )
                }
            )
    elif pricing_strategy in {"free", "to_be_confirmed"}:
        if base_price_amount is not None:
            raise serializers.ValidationError(
                {
                    "base_price_amount": (
                        "Free and to-be-confirmed pricing cannot "
                        "include a base price amount."
                    )
                }
            )

    track_inventory = attrs.get("track_inventory", False)
    stock_quantity = attrs.get("stock_quantity")
    duration_minutes = attrs.get("duration_minutes")
    requires_booking = attrs.get(
        "requires_booking",
        False,
    )
    payment_policy = attrs.get("payment_policy")

    if offer_kind == "product":
        if requires_booking:
            raise serializers.ValidationError(
                {
                    "requires_booking": (
                        "Products cannot require booking."
                    )
                }
            )

        if duration_minutes is not None:
            raise serializers.ValidationError(
                {
                    "duration_minutes": (
                        "Products cannot include duration."
                    )
                }
            )

        if payment_policy is not None:
            raise serializers.ValidationError(
                {
                    "payment_policy": (
                        "Products cannot include a payment policy."
                    )
                }
            )

        if track_inventory and stock_quantity is None:
            raise serializers.ValidationError(
                {
                    "stock_quantity": (
                        "Tracked products require stock quantity."
                    )
                }
            )

        if not track_inventory and stock_quantity is not None:
            raise serializers.ValidationError(
                {
                    "stock_quantity": (
                        "Stock quantity requires inventory tracking."
                    )
                }
            )

    elif offer_kind == "service":
        if track_inventory:
            raise serializers.ValidationError(
                {
                    "track_inventory": (
                        "Services cannot track inventory."
                    )
                }
            )

        if stock_quantity is not None:
            raise serializers.ValidationError(
                {
                    "stock_quantity": (
                        "Services cannot include stock quantity."
                    )
                }
            )

        if payment_policy is None:
            raise serializers.ValidationError(
                {
                    "payment_policy": (
                        "Services require a payment policy."
                    )
                }
            )

        if requires_booking and duration_minutes is None:
            raise serializers.ValidationError(
                {
                    "duration_minutes": (
                        "Booked services require duration."
                    )
                }
            )

        if not requires_booking and duration_minutes is not None:
            raise serializers.ValidationError(
                {
                    "duration_minutes": (
                        "Duration is only allowed for booked services."
                    )
                }
            )
