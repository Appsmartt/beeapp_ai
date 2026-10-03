from __future__ import annotations

from rest_framework import serializers

from apps.commercial.serializers.shared import (
    COMMERCIAL_PROFILE_MODALITIES,
)


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
