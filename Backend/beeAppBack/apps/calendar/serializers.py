from __future__ import annotations

from typing import Any

from rest_framework import serializers


CALENDAR_COLORS = (
    "#6025D2",
    "#2563EB",
    "#0891B2",
    "#059669",
    "#65A30D",
    "#CA8A04",
    "#EA580C",
    "#DC2626",
    "#DB2777",
    "#9333EA",
    "#475569",
)

EVENT_KINDS = (
    "virtual",
    "in_person",
    "hybrid",
)

RECURRENCE_FREQUENCIES = (
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "custom",
)

REMINDER_CHANNELS = (
    "push",
    "in_app",
)

CALENDAR_VIEWS = (
    "day",
    "week",
    "month",
    "agenda",
)


class UUIDListField(serializers.ListField):
    child = serializers.UUIDField()

    def __init__(self, **kwargs):
        kwargs.setdefault("required", False)
        kwargs.setdefault("allow_empty", True)
        super().__init__(**kwargs)


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


class CalendarEventListQuerySerializer(serializers.Serializer):
    range_start = serializers.DateTimeField()
    range_end = serializers.DateTimeField()
    calendar_ids = UUIDListField(required=False)
    source = serializers.ChoiceField(
        choices=("beeapp", "google", "microsoft", "detached"),
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

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if (
            attrs.get("until_at") is not None
            and attrs.get("occurrence_count") is not None
        ):
            raise serializers.ValidationError(
                "Use either until_at or occurrence_count, not both."
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

    def validate_custom_type_name(
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
                    "All-day events require starts_on and ends_on "
                    "only."
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
                    "Timed events require starts_at and ends_at only."
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
                        "Only one active conference can be primary."
                    )
                }
            )

        return attrs


class CreateCalendarEventSerializer(BaseCalendarEventSerializer):
    pass


class UpdateCalendarEventSerializer(serializers.Serializer):
    """
    Serializer exclusivo para PATCH.

    No hereda de BaseCalendarEventSerializer porque el serializer
    de creación contiene defaults. En una actualización parcial,
    defaults no enviados no deben sobrescribir valores existentes.
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

    def validate_custom_type_name(
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

        if not provided_time_fields:
            return attrs

        if provided_time_fields != time_fields:
            raise serializers.ValidationError(
                "When changing event timing, provide "
                "is_all_day, starts_at, ends_at, starts_on and "
                "ends_on together."
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
                    "All-day events require starts_on and ends_on "
                    "only."
                )

            if starts_on >= ends_on:
                raise serializers.ValidationError(
                    "ends_on must be after starts_on."
                )

            return attrs

        if (
            starts_at is None
            or ends_at is None
            or starts_on is not None
            or ends_on is not None
        ):
            raise serializers.ValidationError(
                "Timed events require starts_at and ends_at only."
            )

        if starts_at >= ends_at:
            raise serializers.ValidationError(
                "ends_at must be after starts_at."
            )

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

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )

        return attrs


class CalendarUserSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        min_length=3,
        max_length=200,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=20,
        min_value=1,
        max_value=20,
    )

    def validate_q(self, value: str) -> str:
        normalized = value.strip()

        if len(normalized) < 3:
            raise serializers.ValidationError(
                "Search query must contain at least 3 characters."
            )

        return normalized


class EventRsvpSerializer(serializers.Serializer):
    response_status = serializers.ChoiceField(
        choices=("accepted", "declined"),
    )


class DeclinedEventVisibilitySerializer(serializers.Serializer):
    hidden = serializers.BooleanField()


class RemoveEventAttendeeSerializer(serializers.Serializer):
    attendee_user_id = serializers.UUIDField()


class CreateInviteeRequestSerializer(serializers.Serializer):
    requested_user_id = serializers.UUIDField()
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=1000,
        trim_whitespace=True,
    )

    def validate_note(self, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None


class ReviewInviteeRequestSerializer(serializers.Serializer):
    approved = serializers.BooleanField()


class CreateCalendarShareSerializer(serializers.Serializer):
    shared_with_user_id = serializers.UUIDField()
    permission = serializers.ChoiceField(
        choices=("viewer", "editor"),
    )


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
                    "All-day conflicts require starts_on and ends_on."
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