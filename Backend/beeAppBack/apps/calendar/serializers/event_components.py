from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .constants import RECURRENCE_FREQUENCIES, REMINDER_CHANNELS


class ConferenceSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    provider = serializers.ChoiceField(
        choices=(
            "agora",
            "external",
            "google_meet",
            "microsoft_teams",
        ),
        required=False,
        default="external",
    )
    label = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=120,
        trim_whitespace=True,
    )
    join_url = serializers.URLField(max_length=2000)
    is_primary = serializers.BooleanField(
        required=False,
        default=False,
    )

    def validate_label(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None


class ReminderSerializer(serializers.Serializer):
    channel = serializers.ChoiceField(
        choices=REMINDER_CHANNELS,
    )
    offset_minutes = serializers.IntegerField(
        min_value=0,
        max_value=525600,
    )
    all_day_reminder_time = serializers.TimeField(
        required=False,
        allow_null=True,
    )


class RecurrenceSerializer(serializers.Serializer):
    rrule = serializers.CharField(
        max_length=1000,
        trim_whitespace=True,
    )
    frequency = serializers.ChoiceField(
        choices=RECURRENCE_FREQUENCIES,
    )
    interval_count = serializers.IntegerField(
        required=False,
        default=1,
        min_value=1,
        max_value=999,
    )
    week_days = serializers.ListField(
        child=serializers.IntegerField(
            min_value=1,
            max_value=7,
        ),
        required=False,
        allow_empty=False,
        max_length=7,
    )
    month_day = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=31,
    )
    nth_weekday = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=-1,
        max_value=5,
    )
    until_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
    occurrence_count = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=100000,
    )
    timezone = serializers.CharField(
        required=False,
        max_length=100,
        trim_whitespace=True,
    )

    def validate_rrule(self, value: str) -> str:
        normalized = value.strip().upper()

        if not normalized.startswith("FREQ="):
            raise serializers.ValidationError(
                "RRULE must start with FREQ=."
            )

        return normalized

    def validate_timezone(
        self,
        value: str,
    ) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Recurrence timezone cannot be empty."
            )

        return normalized

    def validate_week_days(
        self,
        value: list[int],
    ) -> list[int]:
        return list(dict.fromkeys(value))

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if (
            attrs.get("until_at") is not None
            and attrs.get("occurrence_count") is not None
        ):
            raise serializers.ValidationError(
                "Use either until_at or occurrence_count, "
                "not both."
            )

        return attrs
