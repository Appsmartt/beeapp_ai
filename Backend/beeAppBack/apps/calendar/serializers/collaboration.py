from __future__ import annotations

from rest_framework import serializers


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
                "Search query must contain at least "
                "3 characters."
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

    def validate_note(
        self,
        value: str | None,
    ) -> str | None:
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
