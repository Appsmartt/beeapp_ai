from __future__ import annotations

from rest_framework import serializers

from .constants import (
    CHAT_GROUP_POSTING_POLICIES,
    CHAT_INVITE_STATUSES,
    CHAT_MANAGEABLE_PARTICIPANT_ROLES,
)

class CreateChatGroupSerializer(serializers.Serializer):
    creator_identity_id = serializers.UUIDField()

    name = serializers.CharField(
        max_length=120,
        trim_whitespace=True,
    )

    posting_policy = serializers.ChoiceField(
        choices=CHAT_GROUP_POSTING_POLICIES,
        required=False,
        default="all_members",
    )

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2_000,
        trim_whitespace=True,
    )

    image_file_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    def validate_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Group name cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None


class UpdateChatGroupSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()

    name = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=120,
        trim_whitespace=True,
    )

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2_000,
        trim_whitespace=True,
    )

    image_file_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    posting_policy = serializers.ChoiceField(
        choices=CHAT_GROUP_POSTING_POLICIES,
        required=False,
    )

    def validate_name(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Group name cannot be empty."
            )

        return normalized_value

    def validate_description(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None

    def validate(self, attrs: dict) -> dict:
        mutable_fields = (
            "name",
            "description",
            "image_file_id",
            "posting_policy",
        )

        if not any(field in attrs for field in mutable_fields):
            raise serializers.ValidationError(
                "At least one group field must be provided."
            )

        return attrs


class CreateChatGroupInviteSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()
    invited_identity_id = serializers.UUIDField()

    expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    def validate(self, attrs: dict) -> dict:
        if (
            attrs["actor_identity_id"]
            == attrs["invited_identity_id"]
        ):
            raise serializers.ValidationError(
                {
                    "invited_identity_id": (
                        "You cannot invite the acting identity."
                    )
                }
            )

        return attrs


class ChatGroupInviteListQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField(
        required=False,
    )

    status = serializers.ChoiceField(
        choices=CHAT_INVITE_STATUSES,
        required=False,
        default="pending",
    )

    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )

    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )


class RespondToChatGroupInviteSerializer(serializers.Serializer):
    accept = serializers.BooleanField()


class LeaveChatGroupSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()


class SetChatGroupParticipantRoleSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()

    role = serializers.ChoiceField(
        choices=CHAT_MANAGEABLE_PARTICIPANT_ROLES,
    )


class TransferChatGroupOwnershipSerializer(serializers.Serializer):
    current_owner_identity_id = serializers.UUIDField()
    new_owner_identity_id = serializers.UUIDField()

    def validate(self, attrs: dict) -> dict:
        if (
            attrs["current_owner_identity_id"]
            == attrs["new_owner_identity_id"]
        ):
            raise serializers.ValidationError(
                {
                    "new_owner_identity_id": (
                        "The new owner must be different from "
                        "the current owner."
                    )
                }
            )

        return attrs


class DeactivateChatGroupSerializer(serializers.Serializer):
    owner_identity_id = serializers.UUIDField()


class RemoveChatGroupParticipantSerializer(serializers.Serializer):
    actor_identity_id = serializers.UUIDField()
