from __future__ import annotations

from rest_framework import serializers


class CreateCommercialRequestProposalSerializer(
    serializers.Serializer,
):
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
    subtotal_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    delivery_fee_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    total_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
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
        max_length=100,
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )
    terms_snapshot = serializers.JSONField(
        required=False,
        default=dict,
    )

    def validate_terms_snapshot(self, value: object) -> dict:
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "terms_snapshot must be an object."
            )

        return value

    def validate(self, attrs: dict) -> dict:
        starts_at = attrs.get("proposed_starts_at")
        ends_at = attrs.get("proposed_ends_at")

        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError(
                {
                    "proposed_ends_at": (
                        "proposed_ends_at must be after "
                        "proposed_starts_at."
                    )
                }
            )

        subtotal_amount = attrs.get("subtotal_amount")
        delivery_fee_amount = attrs.get("delivery_fee_amount")
        total_amount = attrs.get("total_amount")

        if (
            subtotal_amount is not None
            and delivery_fee_amount is not None
            and total_amount is not None
            and total_amount != subtotal_amount + delivery_fee_amount
        ):
            raise serializers.ValidationError(
                {
                    "total_amount": (
                        "total_amount must equal subtotal_amount plus "
                        "delivery_fee_amount when all values are present."
                    )
                }
            )

        return attrs
