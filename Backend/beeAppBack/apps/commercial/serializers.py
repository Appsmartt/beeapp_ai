from __future__ import annotations

import re

from rest_framework import serializers


COMMERCIAL_OFFER_TYPES = (
    "services",
    "products",
    "mixed",
)

COMMERCIAL_PROFILE_MODALITIES = (
    "at_establishment",
    "in_person",
    "virtual",
    "home_visit",
    "delivery",
    "pickup",
    "phone_call",
    "buddy_chat",
)

COUNTRY_CODE_PATTERN = re.compile(r"^[A-Za-z]{2}$")
PHONE_DIAL_CODE_PATTERN = re.compile(r"^\+?[0-9]{1,9}$")
PHONE_NUMBER_PATTERN = re.compile(r"^[0-9]{4,20}$")


def normalize_optional_text(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


def normalize_country_code(value: str) -> str:
    normalized_value = value.strip().upper()

    if not COUNTRY_CODE_PATTERN.fullmatch(normalized_value):
        raise serializers.ValidationError(
            "Country code must use ISO alpha-2 format, for example CO."
        )

    return normalized_value


def normalize_phone_dial_code(value: str) -> str:
    normalized_value = (
        value.strip()
        .replace(" ", "")
        .replace("-", "")
    )

    if not PHONE_DIAL_CODE_PATTERN.fullmatch(normalized_value):
        raise serializers.ValidationError(
            "Phone dial code must contain only digits and an optional +."
        )

    return normalized_value.lstrip("+")


def normalize_phone_number(value: str) -> str:
    normalized_value = (
        value.strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if not PHONE_NUMBER_PATTERN.fullmatch(normalized_value):
        raise serializers.ValidationError(
            "Phone number must contain only digits."
        )

    return normalized_value


class CommercialCategoryQuerySerializer(serializers.Serializer):
    offer_type = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_TYPES,
        required=False,
    )
    parent_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )
    include_inactive = serializers.BooleanField(
        required=False,
        default=False,
    )


class CommercialProfileHourSerializer(serializers.Serializer):
    day_of_week = serializers.IntegerField(
        min_value=0,
        max_value=6,
    )
    opens_at = serializers.TimeField(
        required=False,
        allow_null=True,
    )
    closes_at = serializers.TimeField(
        required=False,
        allow_null=True,
    )
    is_closed = serializers.BooleanField(
        required=False,
        default=False,
    )

    def validate(self, attrs: dict) -> dict:
        is_closed = attrs.get("is_closed", False)
        opens_at = attrs.get("opens_at")
        closes_at = attrs.get("closes_at")

        if is_closed:
            if opens_at is not None or closes_at is not None:
                raise serializers.ValidationError(
                    "Closed days cannot include opening or closing times."
                )

            return attrs

        if opens_at is None or closes_at is None:
            raise serializers.ValidationError(
                "Open days require opening and closing times."
            )

        if closes_at <= opens_at:
            raise serializers.ValidationError(
                "Closing time must be later than opening time."
            )

        return attrs


class CreateCommercialProfileSerializer(serializers.Serializer):
    offer_type = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_TYPES,
    )
    category_id = serializers.UUIDField(
        required=False,
        allow_null=True,
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

    logo_file_id = serializers.UUIDField()

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

    def validate_display_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Display name cannot be empty."
            )

        return normalized_value

    def validate_description(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Description cannot be empty."
            )

        return normalized_value

    def validate_country_code(self, value: str) -> str:
        return normalize_country_code(value)

    def validate_city(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "City cannot be empty."
            )

        return normalized_value

    def validate_address(self, value: str | None) -> str | None:
        return normalize_optional_text(value)

    def validate_neighborhood(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_location_reference(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_custom_activity_text(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_phone_dial_code(
        self,
        value: str | None,
    ) -> str | None:
        normalized_value = normalize_optional_text(value)

        if normalized_value is None:
            return None

        return normalize_phone_dial_code(normalized_value)

    def validate_phone_number(
        self,
        value: str | None,
    ) -> str | None:
        normalized_value = normalize_optional_text(value)

        if normalized_value is None:
            return None

        return normalize_phone_number(normalized_value)

    def validate_public_email(
        self,
        value: str | None,
    ) -> str | None:
        normalized_value = normalize_optional_text(value)

        if normalized_value is None:
            return None

        return normalized_value.lower()

    def validate_modalities(
        self,
        value: list[str],
    ) -> list[str]:
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Modalities cannot be repeated."
            )

        return value

    def validate_hours(
        self,
        value: list[dict],
    ) -> list[dict]:
        days = [item["day_of_week"] for item in value]

        if len(days) != len(set(days)):
            raise serializers.ValidationError(
                "Only one schedule can be configured per day."
            )

        return value

    def validate(self, attrs: dict) -> dict:
        category_id = attrs.get("category_id")
        custom_activity_text = attrs.get("custom_activity_text")

        if category_id is None and not custom_activity_text:
            raise serializers.ValidationError(
                {
                    "category_id": (
                        "Select a category or provide a custom activity."
                    )
                }
            )

        if category_id is not None and custom_activity_text:
            raise serializers.ValidationError(
                {
                    "custom_activity_text": (
                        "Provide a custom activity only when no category "
                        "is selected."
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
                        "A public phone number is required when phone "
                        "visibility is enabled."
                    )
                }
            )

        public_email = attrs.get("public_email")
        is_email_public = attrs.get("is_email_public", False)

        if is_email_public and not public_email:
            raise serializers.ValidationError(
                {
                    "public_email": (
                        "A public email is required when email visibility "
                        "is enabled."
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