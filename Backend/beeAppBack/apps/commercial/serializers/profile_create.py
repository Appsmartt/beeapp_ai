from __future__ import annotations

import re

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


class CreateCommercialProfileSerializer(
    CommercialProfileFieldValidationMixin,
    serializers.Serializer,
):
    offer_type = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_TYPES,
    )
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=False,
        min_length=1,
        max_length=5,
    )
    new_category_names = serializers.ListField(
        child=serializers.CharField(
            min_length=1,
            max_length=120,
            trim_whitespace=True,
        ),
        required=False,
        allow_empty=False,
        min_length=1,
        max_length=5,
    )
    custom_activity_text = serializers.CharField(
        required=False,
        allow_blank=False,
        allow_null=True,
        max_length=255,
        trim_whitespace=True,
    )
    display_name = serializers.CharField(
        max_length=160,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        trim_whitespace=True,
    )
    country_code = serializers.CharField(
        required=False,
        default="CO",
        max_length=2,
        trim_whitespace=True,
    )
    city = serializers.CharField(
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
        default=False,
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
        default=False,
    )
    public_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    is_email_public = serializers.BooleanField(
        required=False,
        default=False,
    )
    logo_file_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    is_public = serializers.BooleanField(
        required=False,
        default=False,
    )
    is_available = serializers.BooleanField(
        required=False,
        default=True,
    )
    modalities = serializers.ListField(
        child=serializers.ChoiceField(
            choices=COMMERCIAL_PROFILE_MODALITIES,
        ),
        allow_empty=False,
        max_length=8,
    )
    hours = CommercialProfileHourSerializer(
        many=True,
        required=False,
        default=list,
    )
    social_links = CommercialProfileSocialLinkSerializer(
        many=True,
        required=False,
        default=list,
    )

    def validate_new_category_names(
        self,
        value: list[str],
    ) -> list[str]:
        normalized_names = [
            re.sub(r"\s+", " ", item.strip())
            for item in value
        ]

        if any(not item for item in normalized_names):
            raise serializers.ValidationError(
                "New category names cannot be empty."
            )

        normalized_keys = [
            item.casefold()
            for item in normalized_names
        ]

        if len(normalized_keys) != len(set(normalized_keys)):
            raise serializers.ValidationError(
                "New category names cannot be repeated."
            )

        return normalized_names

    def validate(self, attrs: dict) -> dict:
        category_ids = attrs.get("category_ids") or []
        new_category_names = (
            attrs.get("new_category_names") or []
        )
        custom_activity_text = attrs.get("custom_activity_text")

        if (
            attrs.get("offer_type") == "mixed"
            and new_category_names
        ):
            raise serializers.ValidationError(
                {
                    "new_category_names": (
                        "No se pueden crear categorías nuevas "
                        "para Servicios y productos."
                    )
                }
            )

        if len(category_ids) + len(new_category_names) > 5:
            raise serializers.ValidationError(
                {
                    "new_category_names": (
                        "You can select or add up to 5 categories "
                        "in total."
                    )
                }
            )

        if (
            not category_ids
            and not new_category_names
            and not custom_activity_text
        ):
            raise serializers.ValidationError(
                {
                    "category_ids": (
                        "Select at least one category or provide "
                        "a custom activity."
                    )
                }
            )

        if (
            (category_ids or new_category_names)
            and custom_activity_text
        ):
            raise serializers.ValidationError(
                {
                    "custom_activity_text": (
                        "Provide a custom activity only when no "
                        "category is selected."
                    )
                }
            )

        if len(category_ids) != len(set(category_ids)):
            raise serializers.ValidationError(
                {
                    "category_ids": (
                        "Categories cannot be repeated."
                    )
                }
            )

        phone_dial_code = attrs.get("phone_dial_code")
        phone_number = attrs.get("phone_number")
        is_phone_public = attrs.get("is_phone_public", False)

        if bool(phone_dial_code) != bool(phone_number):
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "Phone dial code and phone number must be "
                        "provided together."
                    )
                }
            )

        if is_phone_public and not phone_number:
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "A public phone number is required when "
                        "phone visibility is enabled."
                    )
                }
            )

        public_email = attrs.get("public_email")
        is_email_public = attrs.get("is_email_public", False)

        if is_email_public and not public_email:
            raise serializers.ValidationError(
                {
                    "public_email": (
                        "A public email is required when email "
                        "visibility is enabled."
                    )
                }
            )

        modalities = attrs["modalities"]
        requires_address = bool(
            {"at_establishment", "in_person"} & set(modalities)
        )

        if requires_address and not attrs.get("address"):
            raise serializers.ValidationError(
                {
                    "address": (
                        "Address is required for establishment or "
                        "in-person service."
                    )
                }
            )

        return attrs
