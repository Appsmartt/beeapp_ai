from __future__ import annotations

from urllib.parse import urlparse

from rest_framework import serializers

from apps.commercial.serializers.shared import (
    COMMERCIAL_SOCIAL_PLATFORMS,
    normalize_country_code,
    normalize_optional_text,
    normalize_phone_dial_code,
    normalize_phone_number,
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


class CommercialProfileSocialLinkSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(
        choices=COMMERCIAL_SOCIAL_PLATFORMS,
    )
    url = serializers.CharField(
        max_length=2048,
        trim_whitespace=True,
    )

    def validate_url(self, value: str) -> str:
        normalized_value = value.strip()
        parsed_url = urlparse(normalized_value)

        if (
            parsed_url.scheme not in ("http", "https")
            or not parsed_url.netloc
        ):
            raise serializers.ValidationError(
                "A complete HTTP or HTTPS URL is required."
            )

        return normalized_value


class CommercialProfileFieldValidationMixin:
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

    def validate_social_links(
        self,
        value: list[dict],
    ) -> list[dict]:
        platforms = [link["platform"] for link in value]

        if len(platforms) != len(set(platforms)):
            raise serializers.ValidationError(
                "Only one URL is allowed for each platform."
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
