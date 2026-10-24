from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .common import UUIDListField
from .constants import CALENDAR_COLORS, EVENT_KINDS, EVENT_SOURCES
from .event_components import (
    ConferenceSerializer,
    RecurrenceSerializer,
    ReminderSerializer,
)


class CalendarEventListQuerySerializer(serializers.Serializer):
    range_start = serializers.DateTimeField()
    range_end = serializers.DateTimeField()
    calendar_ids = UUIDListField(required=False)
    source = serializers.ChoiceField(
        choices=EVENT_SOURCES,
        required=False,
    )
    event_kind = serializers.ChoiceField(
        choices=EVENT_KINDS,
        required=False,
    )
    tag_ids = UUIDListField(required=False)
    include_cancelled = serializers.BooleanField(
        required=False,
        default=False,
    )
    include_declined = serializers.BooleanField(
        required=False,
        default=True,
    )
    search = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=200,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=500,
        min_value=1,
        max_value=1000,
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["range_start"] >= attrs["range_end"]:
            raise serializers.ValidationError(
                "range_end must be after range_start."
            )

        return attrs



class BaseCalendarEventSerializer(serializers.Serializer):
    calendar_id = serializers.UUIDField()

    title = serializers.CharField(
        max_length=300,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=10000,
    )

    event_kind = serializers.ChoiceField(
        choices=EVENT_KINDS,
        required=False,
        default="in_person",
    )
    custom_type_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
        trim_whitespace=True,
    )
    color = serializers.ChoiceField(
        choices=CALENDAR_COLORS,
        required=False,
        default="#6025D2",
    )

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
    timezone = serializers.CharField(
        required=False,
        max_length=100,
        default="America/Bogota",
        trim_whitespace=True,
    )

    location_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=300,
        trim_whitespace=True,
    )
    location_address = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
        trim_whitespace=True,
    )
    location_maps_url = serializers.URLField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
    )

    is_private = serializers.BooleanField(
        required=False,
        default=False,
    )
    notifications_enabled = serializers.BooleanField(
        required=False,
        default=True,
    )

    tag_ids = UUIDListField()
    conferences = ConferenceSerializer(
        many=True,
        required=False,
    )
    attendee_ids = UUIDListField()
    reminders = ReminderSerializer(
        many=True,
        required=False,
    )
    recurrence = RecurrenceSerializer(
        required=False,
        allow_null=True,
    )

    def validate_title(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Event title cannot be empty."
            )

        return normalized

    def validate_timezone(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Timezone cannot be empty."
            )

        return normalized

    def validate_custom_type_name(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None

    def validate_location_name(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None

    def validate_location_address(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        is_all_day = attrs.get("is_all_day", False)

        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        starts_on = attrs.get("starts_on")
        ends_on = attrs.get("ends_on")

        if is_all_day:
            if (
                starts_on is None
                or ends_on is None
                or starts_at is not None
                or ends_at is not None
            ):
                raise serializers.ValidationError(
                    "All-day events require starts_on and "
                    "ends_on only."
                )

            if starts_on >= ends_on:
                raise serializers.ValidationError(
                    "ends_on must be after starts_on."
                )
        else:
            if (
                starts_at is None
                or ends_at is None
                or starts_on is not None
                or ends_on is not None
            ):
                raise serializers.ValidationError(
                    "Timed events require starts_at and "
                    "ends_at only."
                )

            if starts_at >= ends_at:
                raise serializers.ValidationError(
                    "ends_at must be after starts_at."
                )

        conferences = attrs.get("conferences") or []

        primary_count = sum(
            1
            for conference in conferences
            if conference.get("is_primary")
        )

        if primary_count > 1:
            raise serializers.ValidationError(
                {
                    "conferences": (
                        "Only one active conference can be "
                        "primary."
                    )
                }
            )

        reminder_keys: set[tuple[Any, ...]] = set()

        for reminder in attrs.get("reminders") or []:
            reminder_key = (
                reminder["channel"],
                reminder["offset_minutes"],
                str(
                    reminder.get("all_day_reminder_time")
                    or ""
                ),
            )

            if reminder_key in reminder_keys:
                raise serializers.ValidationError(
                    {
                        "reminders": (
                            "Duplicate reminders are not allowed."
                        )
                    }
                )

            reminder_keys.add(reminder_key)

        return attrs


class CreateCalendarEventSerializer(BaseCalendarEventSerializer):
    pass
