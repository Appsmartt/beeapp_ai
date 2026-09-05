from __future__ import annotations

import re

from rest_framework import serializers

from apps.commercial.enums import (
    CommercialBusinessOfferType,
    CommercialCatalogStatus,
    CommercialExternalPaymentType,
    CommercialModality,
    CommercialOfferKind,
    CommercialOfferStatus,
    CommercialPaymentMethodStatus,
    CommercialPaymentPolicy,
    CommercialPricingStrategy,
    CommercialProfilePublicationStatus,
    CommercialVerificationDocumentType,
    CommercialVerificationStatus,
    enum_values,
)


COMMERCIAL_OFFER_TYPES = enum_values(
    CommercialBusinessOfferType,
)

COMMERCIAL_PROFILE_MODALITIES = enum_values(
    CommercialModality,
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

PUBLIC_COMMERCIAL_PROFILE_ORDERINGS = (
    "recent",
    "name",
)


class PublicCommercialCitiesQuerySerializer(serializers.Serializer):
    country_code = serializers.CharField(
        max_length=2,
        trim_whitespace=True,
    )

    def validate_country_code(self, value: str) -> str:
        return normalize_country_code(value)


class PublicCommercialCategoriesQuerySerializer(serializers.Serializer):
    country_code = serializers.CharField(
        required=False,
        max_length=2,
        trim_whitespace=True,
    )
    city = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=120,
        trim_whitespace=True,
    )
    offer_type = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_TYPES,
        required=False,
    )

    def validate_country_code(self, value: str) -> str:
        return normalize_country_code(value)

    def validate_city(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "City cannot be empty."
            )

        return normalized_value


class PublicCommercialProfilesQuerySerializer(serializers.Serializer):
    country_code = serializers.CharField(
        required=False,
        max_length=2,
        trim_whitespace=True,
    )
    city = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=120,
        trim_whitespace=True,
    )
    category_id = serializers.UUIDField(required=False)
    offer_type = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_TYPES,
        required=False,
    )
    modality = serializers.ChoiceField(
        choices=COMMERCIAL_PROFILE_MODALITIES,
        required=False,
    )
    verified_only = serializers.BooleanField(
        required=False,
        default=False,
    )
    delivery_only = serializers.BooleanField(
        required=False,
        default=False,
    )
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=120,
        trim_whitespace=True,
    )
    ordering = serializers.ChoiceField(
        choices=PUBLIC_COMMERCIAL_PROFILE_ORDERINGS,
        required=False,
        default="recent",
    )
    limit = serializers.IntegerField(
        required=False,
        default=20,
        min_value=1,
        max_value=50,
    )
    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )

    def validate_country_code(self, value: str) -> str:
        return normalize_country_code(value)

    def validate_city(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "City cannot be empty."
            )

        return normalized_value

    def validate_search(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Search cannot be empty."
            )

        return normalized_value


COMMERCIAL_PUBLIC_OFFER_KINDS = enum_values(
    CommercialOfferKind,
)


class PublicCommercialOffersQuerySerializer(serializers.Serializer):
    catalog_id = serializers.UUIDField(required=False)
    offer_kind = serializers.ChoiceField(
        choices=COMMERCIAL_PUBLIC_OFFER_KINDS,
        required=False,
    )
    modality = serializers.ChoiceField(
        choices=COMMERCIAL_PROFILE_MODALITIES,
        required=False,
    )
    requires_booking = serializers.BooleanField(
        required=False,
    )
    limit = serializers.IntegerField(
        required=False,
        default=20,
        min_value=1,
        max_value=50,
    )
    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )


class UpdateCommercialProfileSerializer(serializers.Serializer):
    offer_type = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_TYPES,
        required=False,
    )
    category_id = serializers.UUIDField(
        required=False,
        allow_null=True,
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


COMMERCIAL_CATALOG_STATUSES = enum_values(
    CommercialCatalogStatus,
)


class OwnedCommercialCatalogsQuerySerializer(serializers.Serializer):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class CreateCommercialCatalogSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=160,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )
    status = serializers.ChoiceField(
        choices=("published", "paused"),
        required=False,
        default="published",
    )

    def validate_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Catalog name cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)


class UpdateCommercialCatalogSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=160,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
        trim_whitespace=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        min_value=0,
    )

    def validate_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Catalog name cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate(self, attrs: dict) -> dict:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs


COMMERCIAL_OFFER_KINDS = enum_values(
    CommercialOfferKind,
)

COMMERCIAL_PRICING_STRATEGIES = enum_values(
    CommercialPricingStrategy,
)

COMMERCIAL_SERVICE_PAYMENT_POLICIES = enum_values(
    CommercialPaymentPolicy,
)


class OwnedCommercialOffersQuerySerializer(serializers.Serializer):
    catalog_id = serializers.UUIDField(
        required=False,
    )
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class CreateCommercialOfferSerializer(serializers.Serializer):
    catalog_id = serializers.UUIDField()
    offer_kind = serializers.ChoiceField(
        choices=COMMERCIAL_OFFER_KINDS,
    )
    title = serializers.CharField(
        max_length=200,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=6000,
        trim_whitespace=True,
    )
    pricing_strategy = serializers.ChoiceField(
        choices=COMMERCIAL_PRICING_STRATEGIES,
        required=False,
        default="fixed",
    )
    base_price_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    currency_code = serializers.CharField(
        required=False,
        default="COP",
        max_length=3,
        trim_whitespace=True,
    )
    is_available = serializers.BooleanField(
        required=False,
        default=True,
    )
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )
    status = serializers.ChoiceField(
        choices=("published", "paused"),
        required=False,
        default="published",
    )
    track_inventory = serializers.BooleanField(
        required=False,
        default=False,
    )
    stock_quantity = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    duration_minutes = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=5,
        max_value=1440,
    )
    requires_booking = serializers.BooleanField(
        required=False,
        default=False,
    )
    payment_policy = serializers.ChoiceField(
        choices=COMMERCIAL_SERVICE_PAYMENT_POLICIES,
        required=False,
        allow_null=True,
    )
    modalities = serializers.ListField(
        child=serializers.ChoiceField(
            choices=COMMERCIAL_PROFILE_MODALITIES,
        ),
        required=False,
        allow_empty=True,
        max_length=8,
        default=list,
    )

    def validate_title(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Offer title cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_currency_code(self, value: str) -> str:
        normalized_value = value.strip().upper()

        if normalized_value != "COP":
            raise serializers.ValidationError(
                "Currency code must be COP."
            )

        return normalized_value

    def validate_modalities(
        self,
        value: list[str],
    ) -> list[str]:
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Offer modalities cannot be repeated."
            )

        return value

    def validate(self, attrs: dict) -> dict:
        _validate_offer_payload(
            attrs=attrs,
            require_all_fields=True,
        )
        return attrs


class UpdateCommercialOfferSerializer(serializers.Serializer):
    catalog_id = serializers.UUIDField(
        required=False,
    )
    title = serializers.CharField(
        required=False,
        max_length=200,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=6000,
        trim_whitespace=True,
    )
    pricing_strategy = serializers.ChoiceField(
        choices=COMMERCIAL_PRICING_STRATEGIES,
        required=False,
    )
    base_price_amount = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    currency_code = serializers.CharField(
        required=False,
        max_length=3,
        trim_whitespace=True,
    )
    is_available = serializers.BooleanField(
        required=False,
    )
    sort_order = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    track_inventory = serializers.BooleanField(
        required=False,
    )
    stock_quantity = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
    )
    duration_minutes = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=5,
        max_value=1440,
    )
    requires_booking = serializers.BooleanField(
        required=False,
    )
    payment_policy = serializers.ChoiceField(
        choices=COMMERCIAL_SERVICE_PAYMENT_POLICIES,
        required=False,
        allow_null=True,
    )

    def validate_title(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Offer title cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_currency_code(self, value: str) -> str:
        normalized_value = value.strip().upper()

        if normalized_value != "COP":
            raise serializers.ValidationError(
                "Currency code must be COP."
            )

        return normalized_value

    def validate(self, attrs: dict) -> dict:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs


class CreateCommercialOfferImageSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )
    is_primary = serializers.BooleanField(
        required=False,
        default=False,
    )


def _validate_offer_payload(
    *,
    attrs: dict,
    require_all_fields: bool,
) -> None:
    offer_kind = attrs.get("offer_kind")
    pricing_strategy = attrs.get("pricing_strategy")
    base_price_amount = attrs.get("base_price_amount")

    if pricing_strategy in {"fixed", "starting_at"}:
        if base_price_amount is None:
            raise serializers.ValidationError(
                {
                    "base_price_amount": (
                        "Fixed and starting-at pricing require "
                        "a base price amount."
                    )
                }
            )
    elif pricing_strategy in {"free", "to_be_confirmed"}:
        if base_price_amount is not None:
            raise serializers.ValidationError(
                {
                    "base_price_amount": (
                        "Free and to-be-confirmed pricing cannot "
                        "include a base price amount."
                    )
                }
            )

    track_inventory = attrs.get("track_inventory", False)
    stock_quantity = attrs.get("stock_quantity")
    duration_minutes = attrs.get("duration_minutes")
    requires_booking = attrs.get(
        "requires_booking",
        False,
    )
    payment_policy = attrs.get("payment_policy")

    if offer_kind == "product":
        if requires_booking:
            raise serializers.ValidationError(
                {
                    "requires_booking": (
                        "Products cannot require booking."
                    )
                }
            )

        if duration_minutes is not None:
            raise serializers.ValidationError(
                {
                    "duration_minutes": (
                        "Products cannot include duration."
                    )
                }
            )

        if payment_policy is not None:
            raise serializers.ValidationError(
                {
                    "payment_policy": (
                        "Products cannot include a payment policy."
                    )
                }
            )

        if track_inventory and stock_quantity is None:
            raise serializers.ValidationError(
                {
                    "stock_quantity": (
                        "Tracked products require stock quantity."
                    )
                }
            )

        if not track_inventory and stock_quantity is not None:
            raise serializers.ValidationError(
                {
                    "stock_quantity": (
                        "Stock quantity requires inventory tracking."
                    )
                }
            )

    elif offer_kind == "service":
        if track_inventory:
            raise serializers.ValidationError(
                {
                    "track_inventory": (
                        "Services cannot track inventory."
                    )
                }
            )

        if stock_quantity is not None:
            raise serializers.ValidationError(
                {
                    "stock_quantity": (
                        "Services cannot include stock quantity."
                    )
                }
            )

        if payment_policy is None:
            raise serializers.ValidationError(
                {
                    "payment_policy": (
                        "Services require a payment policy."
                    )
                }
            )

        if requires_booking and duration_minutes is None:
            raise serializers.ValidationError(
                {
                    "duration_minutes": (
                        "Booked services require duration."
                    )
                }
            )

        if not requires_booking and duration_minutes is not None:
            raise serializers.ValidationError(
                {
                    "duration_minutes": (
                        "Duration is only allowed for booked services."
                    )
                }
            )



class UpdateCommercialOfferModalitiesSerializer(
    serializers.Serializer,
):
    modalities = serializers.ListField(
        child=serializers.ChoiceField(
            choices=COMMERCIAL_PROFILE_MODALITIES,
        ),
        allow_empty=True,
        max_length=8,
    )

    def validate_modalities(
        self,
        value: list[str],
    ) -> list[str]:
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Offer modalities cannot be repeated."
            )

        return value


class UpdateCommercialOfferImageSerializer(serializers.Serializer):
    sort_order = serializers.IntegerField(
        min_value=0,
    )


class AdjustCommercialOfferInventorySerializer(
    serializers.Serializer,
):
    quantity_delta = serializers.IntegerField()
    reason_code = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=5000,
        trim_whitespace=True,
    )

    def validate_quantity_delta(self, value: int) -> int:
        if value == 0:
            raise serializers.ValidationError(
                "Quantity delta cannot be zero."
            )

        return value

    def validate_reason_code(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Reason code cannot be empty."
            )

        return normalized_value

    def validate_reason_text(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)


class CommercialAuditEventsQuerySerializer(
    serializers.Serializer,
):
    entity_type = serializers.CharField(
        required=False,
        max_length=80,
        trim_whitespace=True,
    )
    entity_id = serializers.UUIDField(
        required=False,
    )
    action = serializers.CharField(
        required=False,
        max_length=100,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )
    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )

    def validate_entity_type(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Entity type cannot be empty."
            )

        return normalized_value

    def validate_action(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Action cannot be empty."
            )

        return normalized_value
COMMERCIAL_EXTERNAL_PAYMENT_TYPES = enum_values(
    CommercialExternalPaymentType,
)

COMMERCIAL_PAYMENT_METHOD_STATUSES = enum_values(
    CommercialPaymentMethodStatus,
)

COMMERCIAL_VERIFICATION_DOCUMENT_TYPES = enum_values(
    CommercialVerificationDocumentType,
)

COMMERCIAL_VERIFICATION_STATUSES = enum_values(
    CommercialVerificationStatus,
)

COMMERCIAL_PROFILE_PUBLICATION_STATUSES = enum_values(
    CommercialProfilePublicationStatus,
)


def _normalize_json_object(value, *, field_name: str) -> dict:
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise serializers.ValidationError(
            f"{field_name} must be a JSON object."
        )

    return value


class CreateCommercialPaymentMethodSerializer(serializers.Serializer):
    payment_method_type = serializers.ChoiceField(
        choices=COMMERCIAL_EXTERNAL_PAYMENT_TYPES,
    )
    display_name = serializers.CharField(
        max_length=160,
        trim_whitespace=True,
    )
    public_details = serializers.JSONField(
        required=False,
        default=dict,
    )
    private_details = serializers.JSONField(
        required=False,
        default=dict,
    )
    public_instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
        trim_whitespace=True,
    )
    private_instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=5000,
        trim_whitespace=True,
    )
    available_before_acceptance = serializers.BooleanField(
        required=False,
        default=False,
    )
    sort_order = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )
    is_active = serializers.BooleanField(
        required=False,
        default=True,
    )

    def validate_display_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Payment method display name cannot be empty."
            )

        return normalized_value

    def validate_public_details(self, value) -> dict:
        return _normalize_json_object(
            value,
            field_name="public_details",
        )

    def validate_private_details(self, value) -> dict:
        return _normalize_json_object(
            value,
            field_name="private_details",
        )

    def validate_public_instructions(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_private_instructions(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate(self, attrs: dict) -> dict:
        payment_method_type = attrs["payment_method_type"]
        private_details = attrs["private_details"]
        private_instructions = attrs.get(
            "private_instructions"
        )

        manual_payment_types = {
            CommercialExternalPaymentType.NEQUI.value,
            CommercialExternalPaymentType.DAVIPLATA.value,
            CommercialExternalPaymentType.BREB.value,
            CommercialExternalPaymentType.BANK_ACCOUNT.value,
        }

        if payment_method_type in manual_payment_types:
            if not private_details and not private_instructions:
                raise serializers.ValidationError(
                    {
                        "private_details": (
                            "Manual payment methods require private "
                            "details or private instructions."
                        )
                    }
                )

        return attrs


class UpdateCommercialPaymentMethodSerializer(serializers.Serializer):
    display_name = serializers.CharField(
        required=False,
        max_length=160,
        trim_whitespace=True,
    )
    public_details = serializers.JSONField(
        required=False,
    )
    private_details = serializers.JSONField(
        required=False,
    )
    public_instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=3000,
        trim_whitespace=True,
    )
    private_instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=5000,
        trim_whitespace=True,
    )
    available_before_acceptance = serializers.BooleanField(
        required=False,
    )
    sort_order = serializers.IntegerField(
        required=False,
        min_value=0,
    )
    is_active = serializers.BooleanField(
        required=False,
    )

    def validate_display_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Payment method display name cannot be empty."
            )

        return normalized_value

    def validate_public_details(self, value) -> dict:
        return _normalize_json_object(
            value,
            field_name="public_details",
        )

    def validate_private_details(self, value) -> dict:
        return _normalize_json_object(
            value,
            field_name="private_details",
        )

    def validate_public_instructions(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_private_instructions(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate(self, attrs: dict) -> dict:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs


class OwnedCommercialPaymentMethodsQuerySerializer(
    serializers.Serializer,
):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class CreateCommercialVerificationRequestSerializer(
    serializers.Serializer,
):
    """
    Crea un expediente de verificación en draft.

    Los documentos se adjuntan después con el endpoint específico
    para preservar evidencia y soportar correcciones/reenvíos.
    """


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
    No recibe campos: el backend valida que el expediente tenga
    documentos válidos antes de enviarlo a pending_review.
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

        if decision in {"requires_correction", "rejected"} and not reason_text:
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


class UpdateCommercialProfilePublicationSerializer(
    serializers.Serializer,
):
    publication_status = serializers.ChoiceField(
        choices=(
            CommercialProfilePublicationStatus.PUBLISHED.value,
            CommercialProfilePublicationStatus.PAUSED.value,
            CommercialProfilePublicationStatus.ARCHIVED.value,
        ),
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
        if (
            attrs["publication_status"]
            == CommercialProfilePublicationStatus.ARCHIVED.value
            and not attrs.get("reason_text")
        ):
            raise serializers.ValidationError(
                {
                    "reason_text": (
                        "An archive reason is required."
                    )
                }
            )

        return attrs



class CreateCommercialRequestItemSerializer(serializers.Serializer):
    commercial_offer_id = serializers.UUIDField()
    quantity = serializers.IntegerField(required=False, min_value=1, default=1)


class CreateCommercialRequestSerializer(serializers.Serializer):
    request_type = serializers.ChoiceField(
        choices=(
            "product_order",
            "service_request",
            "booking_request",
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
    items = CreateCommercialRequestItemSerializer(many=True, min_length=1)

    def validate_currency_code(self, value: str) -> str:
        normalized = str(value or "").strip().upper()
        if normalized != "COP":
            raise serializers.ValidationError("Only COP is supported in V1.")
        return normalized


class CommercialRequestTransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=(
            "start_review",
            "accept",
            "reject",
            "cancel",
        )
    )
    reason_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate(self, attrs):
        action = attrs["action"]
        reason_text = str(attrs.get("reason_text") or "").strip()

        if action == "reject" and not reason_text:
            raise serializers.ValidationError(
                {
                    "reason_text": (
                        "A rejection reason is required."
                    )
                }
            )

        return attrs


class CreateCommercialRequestProposalSerializer(serializers.Serializer):
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

    def validate_terms_snapshot(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "terms_snapshot must be an object."
            )
        return value

    def validate(self, attrs):
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



class CreateCommercialReservationHoldSerializer(serializers.Serializer):
    starts_at = serializers.DateTimeField()
    timezone = serializers.CharField(max_length=100)

    def validate_starts_at(self, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise serializers.ValidationError(
                "starts_at must include a timezone offset."
            )
        return value

    def validate_timezone(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("timezone is required.")
        return normalized



class ReviewCommercialPaymentProofSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=("confirmed", "rejected")
    )
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate(self, attrs):
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
    payment_method_id = serializers.UUIDField()
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

    def validate_payment_reference(self, value):
        return value.strip()

    def validate_note(self, value):
        return value.strip()
