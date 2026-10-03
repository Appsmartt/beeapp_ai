from __future__ import annotations

import re

from rest_framework import serializers

from apps.commercial.enums import (
    CommercialExternalPaymentType,
    enum_values,
)
from apps.commercial.serializers.payment_accounts import (
    CommercialBankAccountSerializer,
    CommercialMobilePaymentAccountSerializer,
)


COMMERCIAL_EXTERNAL_PAYMENT_TYPES = enum_values(
    CommercialExternalPaymentType,
)


class CreateCommercialPaymentMethodSerializer(
    serializers.Serializer,
):
    payment_method_type = serializers.ChoiceField(
        choices=COMMERCIAL_EXTERNAL_PAYMENT_TYPES,
    )
    display_name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )
    mobile_account = CommercialMobilePaymentAccountSerializer(
        required=False,
    )
    bank_account = CommercialBankAccountSerializer(
        required=False,
    )

    def validate_display_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Payment method display name cannot be empty."
            )

        return normalized_value

    def validate(self, attrs: dict) -> dict:
        payment_method_type = attrs["payment_method_type"]
        mobile_account = attrs.get("mobile_account")
        bank_account = attrs.get("bank_account")

        mobile_types = {
            CommercialExternalPaymentType.NEQUI.value,
            CommercialExternalPaymentType.DAVIPLATA.value,
            CommercialExternalPaymentType.BREB.value,
        }

        if payment_method_type in mobile_types:
            if mobile_account is None:
                raise serializers.ValidationError(
                    {
                        "mobile_account": (
                            "Mobile payment account data is required."
                        )
                    }
                )

            if bank_account is not None:
                raise serializers.ValidationError(
                    {
                        "bank_account": (
                            "Bank account data is not allowed for this "
                            "payment method type."
                        )
                    }
                )

            if (
                mobile_account["wallet_type"]
                != payment_method_type
            ):
                raise serializers.ValidationError(
                    {
                        "mobile_account": (
                            "wallet_type must match payment_method_type."
                        )
                    }
                )

            if (
                payment_method_type
                in {
                    CommercialExternalPaymentType.NEQUI.value,
                    CommercialExternalPaymentType.DAVIPLATA.value,
                }
                and not re.fullmatch(
                    r"3[0-9]{9}",
                    mobile_account["payment_key"],
                )
            ):
                raise serializers.ValidationError(
                    {
                        "mobile_account": {
                            "payment_key": (
                                "Nequi and Daviplata require a 10-digit "
                                "Colombian mobile number starting with 3."
                            )
                        }
                    }
                )

        elif (
            payment_method_type
            == CommercialExternalPaymentType.BANK_ACCOUNT.value
        ):
            if bank_account is None:
                raise serializers.ValidationError(
                    {
                        "bank_account": (
                            "Bank account data is required."
                        )
                    }
                )

            if mobile_account is not None:
                raise serializers.ValidationError(
                    {
                        "mobile_account": (
                            "Mobile account data is not allowed for "
                            "bank_account."
                        )
                    }
                )

        else:
            raise serializers.ValidationError(
                {
                    "payment_method_type": (
                        "Unsupported payment method type."
                    )
                }
            )

        return attrs


class UpdateCommercialPaymentMethodSerializer(
    serializers.Serializer,
):
    display_name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        min_value=0,
    )
    mobile_account = CommercialMobilePaymentAccountSerializer(
        required=False,
    )
    bank_account = CommercialBankAccountSerializer(
        required=False,
    )

    def validate_display_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Payment method display name cannot be empty."
            )

        return normalized_value

    def validate(self, attrs: dict) -> dict:
        mobile_account = attrs.get("mobile_account")
        bank_account = attrs.get("bank_account")

        if mobile_account is None and bank_account is None:
            raise serializers.ValidationError(
                {
                    "non_field_errors": (
                        "Provide mobile_account or bank_account."
                    )
                }
            )

        if mobile_account is not None and bank_account is not None:
            raise serializers.ValidationError(
                {
                    "non_field_errors": (
                        "Provide only one account payload."
                    )
                }
            )

        if mobile_account is not None:
            wallet_type = mobile_account["wallet_type"]

            if (
                wallet_type
                in {
                    CommercialExternalPaymentType.NEQUI.value,
                    CommercialExternalPaymentType.DAVIPLATA.value,
                }
                and not re.fullmatch(
                    r"3[0-9]{9}",
                    mobile_account["payment_key"],
                )
            ):
                raise serializers.ValidationError(
                    {
                        "mobile_account": {
                            "payment_key": (
                                "Nequi and Daviplata require a 10-digit "
                                "Colombian mobile number starting with 3."
                            )
                        }
                    }
                )

        return attrs


class OwnedCommercialPaymentMethodsQuerySerializer(
    serializers.Serializer,
):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )
