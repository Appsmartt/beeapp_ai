from __future__ import annotations

from rest_framework import serializers

from apps.commercial.enums import (
    CommercialOfferKind,
    enum_values,
)
from apps.commercial.serializers.shared import (
    COMMERCIAL_OFFER_TYPES,
    COMMERCIAL_PROFILE_MODALITIES,
    normalize_country_code,
)


PUBLIC_COMMERCIAL_PROFILE_ORDERINGS = (
    "recent",
    "name",
)

COMMERCIAL_PUBLIC_OFFER_KINDS = enum_values(
    CommercialOfferKind,
)


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
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=120,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=5,
        min_value=1,
        max_value=5,
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

        if len(normalized_value) < 2:
            raise serializers.ValidationError(
                "Search must contain at least 2 characters."
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


class PublicCommercialProductFeedQuerySerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=False,
        min_length=2,
        max_length=160,
        trim_whitespace=True,
    )
    seed = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=128,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=4,
        min_value=1,
        max_value=20,
    )
    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
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
