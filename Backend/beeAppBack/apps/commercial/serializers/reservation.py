from __future__ import annotations

from rest_framework import serializers


class CreateCommercialReservationHoldSerializer(
    serializers.Serializer,
):
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
            raise serializers.ValidationError(
                "timezone is required."
            )

        return normalized
