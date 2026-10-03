from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.shared import (
    normalize_optional_text,
)


class CreateCommercialRequestItemProposalSerializer(
    serializers.Serializer,
):
    proposed_quantity = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=999,
    )
    proposed_unit_price_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    requested_modality = serializers.ChoiceField(
        required=False,
        allow_null=True,
        choices=(
            "at_establishment",
            "in_person",
            "virtual",
            "home_visit",
            "delivery",
            "pickup",
            "phone_call",
            "buddy_chat",
        ),
    )
    proposed_starts_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
    proposed_ends_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
    timezone = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
    )

    def validate(self, attrs: dict) -> dict:
        starts_at = attrs.get("proposed_starts_at")
        ends_at = attrs.get("proposed_ends_at")

        if starts_at is not None and (
            starts_at.tzinfo is None
            or starts_at.utcoffset() is None
        ):
            raise serializers.ValidationError(
                {
                    "proposed_starts_at": (
                        "proposed_starts_at must include a timezone offset."
                    )
                }
            )

        if ends_at is not None and (
            ends_at.tzinfo is None
            or ends_at.utcoffset() is None
        ):
            raise serializers.ValidationError(
                {
                    "proposed_ends_at": (
                        "proposed_ends_at must include a timezone offset."
                    )
                }
            )

        if (
            starts_at is not None
            and ends_at is not None
            and ends_at <= starts_at
        ):
            raise serializers.ValidationError(
                {
                    "proposed_ends_at": (
                        "proposed_ends_at must be after "
                        "proposed_starts_at."
                    )
                }
            )

        attrs["timezone"] = normalize_optional_text(
            attrs.get("timezone")
        )
        attrs["note"] = normalize_optional_text(attrs.get("note"))
        return attrs


class CloseCommercialRequestItemSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=("reject",),
    )
    reason_code = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
    )

    def validate(self, attrs: dict) -> dict:
        attrs["reason_code"] = normalize_optional_text(
            attrs.get("reason_code")
        )
        attrs["reason_text"] = normalize_optional_text(
            attrs.get("reason_text")
        )
        return attrs


class WithdrawCommercialRequestItemProposalSerializer(
    serializers.Serializer,
):
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
    )

    def validate(self, attrs: dict) -> dict:
        attrs["reason_text"] = normalize_optional_text(
            attrs.get("reason_text")
        )
        return attrs


class UpdateCommercialRequestItemOperationalStatusSerializer(
    serializers.Serializer,
):
    next_status = serializers.ChoiceField(
        choices=(
            "preparing",
            "ready_for_pickup",
            "shipped",
            "delivered",
            "in_progress",
            "completed",
            "no_show",
            "cancelled",
        ),
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
    )

    def validate(self, attrs: dict) -> dict:
        attrs["reason_text"] = normalize_optional_text(
            attrs.get("reason_text")
        )
        return attrs
