from __future__ import annotations

from rest_framework import serializers


class CreateCommercialRequestItemSerializer(serializers.Serializer):
    commercial_offer_id = serializers.UUIDField()
    quantity = serializers.IntegerField(
        required=False,
        min_value=1,
        default=1,
    )
    line_comment = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
    )
    requested_modality = serializers.ChoiceField(
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
        required=False,
        allow_null=True,
    )
    requested_starts_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
    requested_ends_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
    timezone = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
    )

    def validate(self, attrs: dict) -> dict:
        starts_at = attrs.get("requested_starts_at")
        ends_at = attrs.get("requested_ends_at")

        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError(
                {
                    "requested_ends_at": (
                        "requested_ends_at must be after "
                        "requested_starts_at."
                    )
                }
            )

        return attrs


class CreateCommercialRequestSerializer(serializers.Serializer):
    request_type = serializers.ChoiceField(
        choices=(
            "product_order",
            "service_request",
            "booking_request",
            "mixed_request",
        )
    )
    commercial_profile_id = serializers.UUIDField()
    requested_modality = serializers.ChoiceField(
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
        required=False,
        allow_null=True,
    )
    customer_note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )
    delivery_address = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
    )
    delivery_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
    )
    currency_code = serializers.CharField(
        required=False,
        default="COP",
        min_length=3,
        max_length=3,
    )
    items = CreateCommercialRequestItemSerializer(
        many=True,
        min_length=1,
    )

    def validate_currency_code(self, value: str) -> str:
        normalized = str(value or "").strip().upper()

        if normalized != "COP":
            raise serializers.ValidationError(
                "Only COP is supported in V1."
            )

        return normalized
