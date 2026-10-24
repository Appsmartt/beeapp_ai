from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .common import UUIDListField
from .constants import CALENDAR_COLORS, EVENT_KINDS
from .event_components import (
    ConferenceSerializer,
    RecurrenceSerializer,
    ReminderSerializer,
)


class UpdateCalendarEventSerializer(serializers.Serializer):
    """
    Serializer exclusivo para PATCH.

    Los defaults del serializer de creación no se aplican aquí:
    un campo no enviado en PATCH no debe sobrescribir un valor
    existente.
    """

    calendar_id = serializers.UUIDField(required=False)

    title = serializers.CharField(
        required=False,
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
    )

    is_all_day = serializers.BooleanField(required=False)
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

    is_private = serializers.BooleanField(required=False)
    notifications_enabled = serializers.BooleanField(required=False)

    tag_ids = UUIDListField(required=False)
    conferences = ConferenceSerializer(
        many=True,
        required=False,
    )
    attendee_ids = UUIDListField(required=False)
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
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        time_fields = {
            "is_all_day",
            "starts_at",
            "ends_at",
            "starts_on",
            "ends_on",
        }

        provided_time_fields = time_fields.intersection(attrs)

        if provided_time_fields:
            if provided_time_fields != time_fields:
                raise serializers.ValidationError(
                    "When changing event timing, provide "
                    "is_all_day, starts_at, ends_at, starts_on "
                    "and ends_on together."
                )

            is_all_day = attrs["is_all_day"]
            starts_at = attrs["starts_at"]
            ends_at = attrs["ends_at"]
            starts_on = attrs["starts_on"]
            ends_on = attrs["ends_on"]

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

        conferences = attrs.get("conferences")

        if conferences is not None:
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

        reminders = attrs.get("reminders")

        if reminders is not None:
            reminder_keys: set[tuple[Any, ...]] = set()

            for reminder in reminders:
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
                                "Duplicate reminders are not "
                                "allowed."
                            )
                        }
                    )

                reminder_keys.add(reminder_key)

        return attrs


class DuplicateCalendarEventSerializer(serializers.Serializer):
    calendar_id = serializers.UUIDField(required=False)
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
    include_attendees = serializers.BooleanField(
        required=False,
        default=False,
    )
    include_reminders = serializers.BooleanField(
        required=False,
        default=True,
    )
    include_recurrence = serializers.BooleanField(
        required=False,
        default=False,
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        timed_fields = {
            "starts_at",
            "ends_at",
        }
        all_day_fields = {
            "starts_on",
            "ends_on",
        }

        provided_timed = timed_fields.intersection(attrs)
        provided_all_day = all_day_fields.intersection(attrs)

        if provided_timed and provided_timed != timed_fields:
            raise serializers.ValidationError(
                "Provide starts_at and ends_at together."
            )

        if provided_all_day and provided_all_day != all_day_fields:
            raise serializers.ValidationError(
                "Provide starts_on and ends_on together."
            )

        if provided_timed and provided_all_day:
            raise serializers.ValidationError(
                "Use either timed or all-day fields, not both."
            )

        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")

        if (
            starts_at is not None
            and ends_at is not None
            and starts_at >= ends_at
        ):
            raise serializers.ValidationError(
                "ends_at must be after starts_at."
            )

        starts_on = attrs.get("starts_on")
        ends_on = attrs.get("ends_on")

        if (
            starts_on is not None
            and ends_on is not None
            and starts_on >= ends_on
        ):
            raise serializers.ValidationError(
                "ends_on must be after starts_on."
            )

        return attrs
