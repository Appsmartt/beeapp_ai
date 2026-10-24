from __future__ import annotations

from rest_framework import serializers

class CreateDirectConversationSerializer(serializers.Serializer):
    sender_identity_id = serializers.UUIDField()
    recipient_identity_id = serializers.UUIDField()

    def validate(self, attrs: dict) -> dict:
        if (
            attrs["sender_identity_id"]
            == attrs["recipient_identity_id"]
        ):
            raise serializers.ValidationError(
                {
                    "recipient_identity_id": (
                        "Sender and recipient identities must be different."
                    )
                }
            )

        return attrs

class ClearConversationSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()



class UpdateConversationNotificationsSerializer(
    serializers.Serializer,
):
    identity_id = serializers.UUIDField()

    notifications_enabled = serializers.BooleanField()


class UpdateConversationPinnedSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    is_pinned = serializers.BooleanField()


class ConversationDetailQuerySerializer(serializers.Serializer):
    include_participants = serializers.BooleanField(
        required=False,
        default=True,
    )


class ConversationParticipantsQuerySerializer(serializers.Serializer):
    include_inactive = serializers.BooleanField(
        required=False,
        default=False,
    )
