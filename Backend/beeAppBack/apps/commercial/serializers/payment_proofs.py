from __future__ import annotations

from rest_framework import serializers


class ReviewCommercialPaymentProofSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=("confirmed", "rejected")
    )
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate(self, attrs: dict) -> dict:
        decision = attrs["decision"]
        rejection_reason = str(
            attrs.get("rejection_reason") or ""
        ).strip()

        if decision == "rejected" and not rejection_reason:
            raise serializers.ValidationError(
                {
                    "rejection_reason": (
                        "A rejection reason is required."
                    )
                }
            )

        if decision == "confirmed" and rejection_reason:
            raise serializers.ValidationError(
                {
                    "rejection_reason": (
                        "A rejection reason is not allowed when "
                        "confirming a payment proof."
                    )
                }
            )

        attrs["rejection_reason"] = rejection_reason or None
        return attrs


class SubmitCommercialPaymentProofSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    payment_method_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    payment_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=200,
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate_payment_reference(self, value: str) -> str:
        return value.strip()

    def validate_note(self, value: str) -> str:
        return value.strip()


class ReplaceCommercialPaymentProofSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    payment_method_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    payment_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=200,
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate_payment_reference(
        self,
        value: str,
    ) -> str | None:
        normalized = value.strip()
        return normalized or None

    def validate_note(
        self,
        value: str,
    ) -> str | None:
        normalized = value.strip()
        return normalized or None
