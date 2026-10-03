from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.profile_fields import (
    CommercialProfileFieldValidationMixin,
    CommercialProfileHourSerializer,
    CommercialProfileSocialLinkSerializer,
)
from apps.commercial.serializers.shared import (
    COMMERCIAL_OFFER_TYPES,
    COMMERCIAL_PROFILE_MODALITIES,
)


class UpdateCommercialProfileSerializer(
    CommercialProfileFieldValidationMixin,
    serializers.Serializer,
):
    offer_type = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_TYPES,
        required=False,
    )
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=False,
        min_length=1,
        max_length=5,
    )
    custom_activity_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
        trim_whitespace=True,
    )
    display_name = serializers.CharField(
        required=False,
        max_length=160,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        trim_whitespace=True,
    )
    country_code = serializers.CharField(
        required=False,
        max_length=2,
        trim_whitespace=True,
    )
    city = serializers.CharField(
        required=False,
        max_length=120,
        trim_whitespace=True,
    )
    address = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        trim_whitespace=True,
    )
    neighborhood = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=120,
        trim_whitespace=True,
    )
    location_reference = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
        trim_whitespace=True,
    )
    is_address_public = serializers.BooleanField(
        required=False,
    )
    phone_dial_code = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=10,
        trim_whitespace=True,
    )
    phone_number = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=20,
        trim_whitespace=True,
    )
    is_phone_public = serializers.BooleanField(
        required=False,
    )
    public_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    is_email_public = serializers.BooleanField(
        required=False,
    )
    logo_file_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    is_available = serializers.BooleanField(
        required=False,
    )
    cash_on_delivery_enabled = serializers.BooleanField(
        required=False,
    )
    timezone = serializers.CharField(
        required=False,
        max_length=100,
        trim_whitespace=True,
    )
    booking_hold_minutes = serializers.IntegerField(
        required=False,
        min_value=5,
        max_value=240,
    )
    inventory_hold_minutes = serializers.IntegerField(
        required=False,
        min_value=5,
        max_value=240,
    )
    delivery_fee_mode = serializers.ChoiceField(
        choices=(
            "not_offered",
            "free",
            "fixed",
            "to_be_confirmed",
        ),
        required=False,
    )
    delivery_fee_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    delivery_currency_code = serializers.CharField(
        required=False,
        max_length=3,
        trim_whitespace=True,
    )
    modalities = serializers.ListField(
        child=serializers.ChoiceField(
            choices=COMMERCIAL_PROFILE_MODALITIES,
        ),
        required=False,
        allow_empty=False,
        max_length=8,
    )
    hours = CommercialProfileHourSerializer(
        many=True,
        required=False,
        allow_empty=True,
    )
    social_links = CommercialProfileSocialLinkSerializer(
        many=True,
        required=False,
        allow_empty=True,
    )

    def validate_category_ids(self, value: list) -> list:
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Categories cannot be repeated."
            )

        return value

    def validate_timezone(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Timezone cannot be empty."
            )

        return normalized_value

    def validate_delivery_currency_code(
        self,
        value: str,
    ) -> str:
        normalized_value = value.strip().upper()

        if normalized_value != "COP":
            raise serializers.ValidationError(
                "Delivery currency code must be COP."
            )

        return normalized_value

    def validate(self, attrs: dict) -> dict:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        phone_dial_code_provided = (
            "phone_dial_code" in attrs
        )
        phone_number_provided = "phone_number" in attrs

        if phone_dial_code_provided != phone_number_provided:
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "Phone dial code and phone number must be "
                        "updated together."
                    )
                }
            )

        if (
            phone_dial_code_provided
            and bool(attrs.get("phone_dial_code"))
            != bool(attrs.get("phone_number"))
        ):
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "Phone dial code and phone number must be "
                        "provided together."
                    )
                }
            )

        if (
            attrs.get("is_phone_public") is True
            and phone_number_provided
            and not attrs.get("phone_number")
        ):
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "A public phone number is required when phone "
                        "visibility is enabled."
                    )
                }
            )

        if (
            attrs.get("is_email_public") is True
            and "public_email" in attrs
            and not attrs.get("public_email")
        ):
            raise serializers.ValidationError(
                {
                    "public_email": (
                        "A public email is required when email visibility "
                        "is enabled."
                    )
                }
            )

        delivery_fee_mode = attrs.get("delivery_fee_mode")
        delivery_fee_amount_provided = (
            "delivery_fee_amount" in attrs
        )

        if delivery_fee_mode == "fixed":
            if (
                not delivery_fee_amount_provided
                or attrs.get("delivery_fee_amount") is None
            ):
                raise serializers.ValidationError(
                    {
                        "delivery_fee_amount": (
                            "A fixed delivery fee requires an amount."
                        )
                    }
                )

        elif (
            delivery_fee_mode in {
                "not_offered",
                "free",
                "to_be_confirmed",
            }
            and delivery_fee_amount_provided
            and attrs.get("delivery_fee_amount") is not None
        ):
            raise serializers.ValidationError(
                {
                    "delivery_fee_amount": (
                        "Only fixed delivery fees can include an amount."
                    )
                }
            )

        category_id = attrs.get("category_id")
        custom_activity_provided = (
            "custom_activity_text" in attrs
        )

        if (
            category_id is not None
            and custom_activity_provided
            and attrs.get("custom_activity_text")
        ):
            raise serializers.ValidationError(
                {
                    "custom_activity_text": (
                        "Provide a custom activity only when no category "
                        "is selected."
                    )
                }
            )

        return attrs
