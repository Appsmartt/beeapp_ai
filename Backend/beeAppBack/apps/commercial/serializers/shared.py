from __future__ import annotations

import re

from rest_framework import serializers

from apps.commercial.enums import (
    CommercialBusinessOfferType,
    CommercialModality,
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
COMMERCIAL_SOCIAL_PLATFORMS = (
    "instagram",
    "facebook",
    "linkedin",
    "tiktok",
    "youtube",
    "threads",
    "website",
)


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
