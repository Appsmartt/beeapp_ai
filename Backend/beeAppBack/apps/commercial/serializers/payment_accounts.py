from __future__ import annotations

from rest_framework import serializers

from apps.commercial.enums import (
    CommercialExternalPaymentType,
)
from apps.commercial.serializers.shared import (
    normalize_optional_text,
)


class CommercialMobilePaymentAccountSerializer(
    serializers.Serializer,
):
    wallet_type = serializers.ChoiceField(
        choices=(
            CommercialExternalPaymentType.NEQUI.value,
            CommercialExternalPaymentType.DAVIPLATA.value,
            CommercialExternalPaymentType.BREB.value,
        ),
    )
    payment_key = serializers.CharField(
        max_length=320,
        trim_whitespace=True,
    )
    account_holder_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=160,
        trim_whitespace=True,
    )

    def validate_payment_key(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Payment key cannot be empty."
            )

        return normalized_value

    def validate_account_holder_name(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)


class CommercialBankAccountSerializer(serializers.Serializer):
    account_holder_name = serializers.CharField(
        max_length=160,
        trim_whitespace=True,
    )
    account_holder_document_type = serializers.CharField(
        max_length=80,
        trim_whitespace=True,
    )
    account_holder_document_number = serializers.CharField(
        max_length=80,
        trim_whitespace=True,
    )
    bank_name = serializers.CharField(
        max_length=160,
        trim_whitespace=True,
    )
    account_type = serializers.CharField(
        max_length=80,
        trim_whitespace=True,
    )
    account_number = serializers.CharField(
        max_length=80,
        trim_whitespace=True,
    )

    def validate(self, attrs: dict) -> dict:
        for field_name, value in attrs.items():
            normalized_value = str(value or "").strip()

            if not normalized_value:
                raise serializers.ValidationError(
                    {
                        field_name: (
                            "This bank account field cannot be empty."
                        )
                    }
                )

            attrs[field_name] = normalized_value

        return attrs
