from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .constants import CALENDAR_COLORS, CALENDAR_VIEWS, EVENT_KINDS
from .event_components import ReminderSerializer


class CalendarListQuerySerializer(serializers.Serializer):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class CreateCalendarSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
        trim_whitespace=True,
    )
    color = serializers.ChoiceField(
        choices=CALENDAR_COLORS,
        required=False,
        default="#6025D2",
    )
    timezone = serializers.CharField(
        required=False,
        max_length=100,
        default="America/Bogota",
        trim_whitespace=True,
    )

    def validate_name(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Calendar name cannot be empty."
            )

        return normalized

    def validate_timezone(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Timezone cannot be empty."
            )

        return normalized


class UpdateCalendarSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=120,
        trim_whitespace=True,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
        trim_whitespace=True,
    )
    color = serializers.ChoiceField(
        choices=CALENDAR_COLORS,
        required=False,
    )
    timezone = serializers.CharField(
        required=False,
        max_length=100,
        trim_whitespace=True,
    )
    is_archived = serializers.BooleanField(required=False)
    is_default = serializers.BooleanField(required=False)

    def validate_name(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Calendar name cannot be empty."
            )

        return normalized

    def validate_timezone(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Timezone cannot be empty."
            )

        return normalized

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs


class CreateCalendarTagSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=60,
        trim_whitespace=True,
    )
    color = serializers.ChoiceField(
        choices=CALENDAR_COLORS,
        required=False,
        default="#6025D2",
    )

    def validate_name(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Tag name cannot be empty."
            )

        return normalized


class UpdateCalendarTagSerializer(serializers.Serializer):
    name = serializers.CharField(
        required=False,
        max_length=60,
        trim_whitespace=True,
    )
    color = serializers.ChoiceField(
        choices=CALENDAR_COLORS,
        required=False,
    )

    def validate_name(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Tag name cannot be empty."
            )

        return normalized

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs



class UpdateCalendarPreferencesSerializer(serializers.Serializer):
    timezone = serializers.CharField(
        required=False,
        max_length=100,
        trim_whitespace=True,
    )
    week_starts_on = serializers.ChoiceField(
        choices=(0, 1),
        required=False,
    )
    show_weekends = serializers.BooleanField(required=False)
    default_view = serializers.ChoiceField(
        choices=CALENDAR_VIEWS,
        required=False,
    )
    default_event_color = serializers.ChoiceField(
        choices=CALENDAR_COLORS,
        required=False,
    )
    default_event_kind = serializers.ChoiceField(
        choices=EVENT_KINDS,
        required=False,
    )
    default_reminders = ReminderSerializer(
        many=True,
        required=False,
    )
    show_declined_events = serializers.BooleanField(required=False)
    notify_invitations = serializers.BooleanField(required=False)
    notify_rsvp_updates = serializers.BooleanField(required=False)
    notify_event_changes = serializers.BooleanField(required=False)
    notify_reminders = serializers.BooleanField(required=False)
    notify_sync_errors = serializers.BooleanField(required=False)
    notify_conflicts = serializers.BooleanField(required=False)

    def validate_timezone(self, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise serializers.ValidationError(
                "Timezone cannot be empty."
            )

        return normalized

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        default_reminders = attrs.get("default_reminders")

        if default_reminders is not None:
            reminder_keys: set[tuple[Any, ...]] = set()

            for reminder in default_reminders:
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
                            "default_reminders": (
                                "Duplicate reminders are not "
                                "allowed."
                            )
                        }
                    )

                reminder_keys.add(reminder_key)

        return attrs
