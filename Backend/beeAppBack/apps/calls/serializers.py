from __future__ import annotations

from rest_framework import serializers


CALL_TYPES = (
    "voice",
    "video",
)

DEFAULT_CALL_HISTORY_LIMIT = 50
MAX_CALL_HISTORY_LIMIT = 100


class StartCallSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()

    call_type = serializers.ChoiceField(
        choices=CALL_TYPES,
    )


class CallDetailQuerySerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()


class JoinCallSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()


class ConfirmCallJoinedSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()


class CancelCallJoinAttemptSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()

    failure_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
        trim_whitespace=True,
    )

    def validate_failure_reason(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None


class DeclineDirectCallSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()


class LeaveCallSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()


class EndCallSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()


class KickCallParticipantSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()
    target_identity_id = serializers.UUIDField()

    def validate(self, attrs: dict) -> dict:
        if (
            attrs["actor_identity_id"]
            == attrs["target_identity_id"]
        ):
            raise serializers.ValidationError(
                {
                    "target_identity_id": (
                        "You cannot remove yourself from a call."
                    )
                }
            )

        return attrs


class CallHistoryQuerySerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()

    limit = serializers.IntegerField(
        required=False,
        default=DEFAULT_CALL_HISTORY_LIMIT,
        min_value=1,
        max_value=MAX_CALL_HISTORY_LIMIT,
    )

    before_created_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
