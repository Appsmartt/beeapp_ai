from __future__ import annotations

from rest_framework import serializers


class CalendarConflictQuerySerializer(serializers.Serializer):
    is_all_day = serializers.BooleanField(
        required=False,
        default=False,
    )
    starts_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
    ends_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
    starts_on = serializers.DateField(
        required=False,
        allow_null=True,
    )
    ends_on = serializers.DateField(
        required=False,
        allow_null=True,
    )
    exclude_event_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        is_all_day = attrs["is_all_day"]

        if is_all_day:
            if (
                attrs.get("starts_on") is None
                or attrs.get("ends_on") is None
                or attrs.get("starts_at") is not None
                or attrs.get("ends_at") is not None
            ):
                raise serializers.ValidationError(
                    "All-day conflicts require starts_on and "
                    "ends_on."
                )

            if attrs["starts_on"] >= attrs["ends_on"]:
                raise serializers.ValidationError(
                    "ends_on must be after starts_on."
                )

            return attrs

        if (
            attrs.get("starts_at") is None
            or attrs.get("ends_at") is None
            or attrs.get("starts_on") is not None
            or attrs.get("ends_on") is not None
        ):
            raise serializers.ValidationError(
                "Timed conflicts require starts_at and ends_at."
            )

        if attrs["starts_at"] >= attrs["ends_at"]:
            raise serializers.ValidationError(
                "ends_at must be after starts_at."
            )

        return attrs
