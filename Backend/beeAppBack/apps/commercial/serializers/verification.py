from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.shared import (
    normalize_optional_text,
)


class CreateCommercialVerificationRequestSerializer(
    serializers.Serializer,
):
    applicant_type = serializers.ChoiceField(
        choices=("natural", "legal"),
    )
    legal_name = serializers.CharField(
        max_length=160,
        trim_whitespace=True,
    )
    tax_id = serializers.CharField(
        max_length=30,
        trim_whitespace=True,
    )
    business_address = serializers.CharField(
        max_length=500,
        trim_whitespace=True,
    )
    review_note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
        trim_whitespace=True,
    )
    declaration_accepted = serializers.BooleanField()
    declaration_version = serializers.CharField(
        max_length=80,
        trim_whitespace=True,
    )

    def validate_legal_name(self, value: str) -> str:
        normalized = normalize_optional_text(value)

        if not normalized or len(normalized) < 2:
            raise serializers.ValidationError(
                "Legal name must contain at least 2 characters."
            )

        return normalized

    def validate_tax_id(self, value: str) -> str:
        normalized = normalize_optional_text(value)

        if not normalized or len(normalized) < 5:
            raise serializers.ValidationError(
                "Tax ID must contain at least 5 characters."
            )

        return normalized

    def validate_business_address(self, value: str) -> str:
        normalized = normalize_optional_text(value)

        if not normalized or len(normalized) < 5:
            raise serializers.ValidationError(
                "Business address must contain at least 5 characters."
            )

        return normalized

    def validate_review_note(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_declaration_version(self, value: str) -> str:
        normalized = normalize_optional_text(value)

        if not normalized:
            raise serializers.ValidationError(
                "Declaration version is required."
            )

        return normalized

    def validate(self, attrs: dict) -> dict:
        if attrs.get("declaration_accepted") is not True:
            raise serializers.ValidationError(
                {
                    "declaration_accepted": (
                        "You must accept the truthfulness declaration."
                    )
                }
            )

        return attrs


class CreateCommercialVerificationDocumentSerializer(
    serializers.Serializer,
):
    file_id = serializers.UUIDField()
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
        trim_whitespace=True,
    )

    def validate_note(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)


class SubmitCommercialVerificationRequestSerializer(
    serializers.Serializer,
):
    """
    No recibe campos: el backend valida los datos obligatorios.
    El PDF de soporte es opcional.
    """


class ReviewCommercialVerificationRequestSerializer(
    serializers.Serializer,
):
    decision = serializers.ChoiceField(
        choices=("verified", "requires_correction", "rejected"),
    )
    reason_code = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
        trim_whitespace=True,
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
        trim_whitespace=True,
    )

    def validate_reason_code(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_reason_text(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate(self, attrs: dict) -> dict:
        decision = attrs["decision"]
        reason_text = attrs.get("reason_text")

        if (
            decision in {"requires_correction", "rejected"}
            and not reason_text
        ):
            raise serializers.ValidationError(
                {
                    "reason_text": (
                        "A review reason is required for this decision."
                    )
                }
            )

        if decision == "verified" and reason_text:
            raise serializers.ValidationError(
                {
                    "reason_text": (
                        "A verified request cannot include a review reason."
                    )
                }
            )

        return attrs
