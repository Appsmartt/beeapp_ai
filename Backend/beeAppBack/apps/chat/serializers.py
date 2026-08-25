from __future__ import annotations

from rest_framework import serializers


CHAT_MESSAGE_TYPES = (
    "text",
    "image",
    "video",
    "audio",
    "document",
    "quotation",
    "order",
    "reservation",
    "invoice",
    "link",
    "system",
)

CHAT_CONVERSATION_TYPES = (
    "direct",
    "group",
)

CHAT_GROUP_POSTING_POLICIES = (
    "all_members",
    "admins_only",
)

CHAT_PARTICIPANT_ROLES = (
    "owner",
    "admin",
    "member",
)

CHAT_MANAGEABLE_PARTICIPANT_ROLES = (
    "admin",
    "member",
)

CHAT_INVITE_STATUSES = (
    "pending",
    "accepted",
    "declined",
    "cancelled",
    "expired",
)

CHAT_ATTACHMENT_MESSAGE_TYPES = (
    "image",
    "video",
    "audio",
    "document",
)

MAX_CHAT_ATTACHMENT_SIZE_BYTES = 52_428_800


class ChatBootstrapSerializer(serializers.Serializer):
    """
    No recibe campos.

    Se mantiene como serializer explícito para conservar una convención
    uniforme en los endpoints del módulo Chat.
    """


class ChatIdentityListQuerySerializer(serializers.Serializer):
    active_only = serializers.BooleanField(
        required=False,
        default=True,
    )


class ChatInboxQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )
    before_last_message_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )


class ChatRecipientSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        min_length=2,
        max_length=160,
        trim_whitespace=True,
    )

    limit = serializers.IntegerField(
        required=False,
        default=20,
        min_value=1,
        max_value=25,
    )

    def validate_q(self, value: str) -> str:
        normalized_value = value.strip()

        if len(normalized_value) < 2:
            raise serializers.ValidationError(
                "Search query must contain at least 2 characters."
            )

        return normalized_value


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


class ClearConversationSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()


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


class ChatMessageListQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )
    before_sequence = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )


class SendChatMessageSerializer(serializers.Serializer):
    sender_identity_id = serializers.UUIDField()

    message_type = serializers.ChoiceField(
        choices=CHAT_MESSAGE_TYPES,
        default="text",
        required=False,
    )

    body = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=10_000,
        trim_whitespace=True,
    )

    attachment_file_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    reference_type = serializers.CharField(
        required=False,
        allow_blank=False,
        allow_null=True,
        max_length=80,
        trim_whitespace=True,
    )

    reference_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    metadata = serializers.JSONField(
        required=False,
        default=dict,
    )

    def validate_body(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None

    def validate_reference_type(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None

    def validate_metadata(
        self,
        value,
    ):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Metadata must be a JSON object."
            )

        return value

    def validate(self, attrs: dict) -> dict:
        message_type = attrs.get("message_type", "text")
        body = attrs.get("body")
        attachment_file_id = attrs.get("attachment_file_id")
        reference_type = attrs.get("reference_type")
        reference_id = attrs.get("reference_id")

        if bool(reference_type) != bool(reference_id):
            raise serializers.ValidationError(
                {
                    "reference_id": (
                        "reference_type and reference_id must be "
                        "provided together."
                    )
                }
            )

        if message_type == "system":
            raise serializers.ValidationError(
                {
                    "message_type": (
                        "System messages cannot be sent by clients."
                    )
                }
            )

        if message_type == "text" and not body:
            raise serializers.ValidationError(
                {
                    "body": (
                        "Text messages require non-empty content."
                    )
                }
            )

        if (
            message_type in CHAT_ATTACHMENT_MESSAGE_TYPES
            and attachment_file_id is None
        ):
            raise serializers.ValidationError(
                {
                    "attachment_file_id": (
                        "This message type requires an attachment."
                    )
                }
            )

        if (
            not body
            and attachment_file_id is None
            and reference_id is None
        ):
            raise serializers.ValidationError(
                "A message requires text, an attachment, or a reference."
            )

        return attrs


class MarkConversationReadSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    last_read_message_id = serializers.UUIDField()


class CreateReactionSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    emoji = serializers.CharField(
        min_length=1,
        max_length=32,
        trim_whitespace=True,
    )

    def validate_emoji(self, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise serializers.ValidationError(
                "Emoji cannot be empty."
            )

        return normalized_value


class DeleteReactionQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()


class ChatMessageReadersQuerySerializer(serializers.Serializer):
    """
    Serializer de query vacío para mantener consistencia en endpoints
    que no requieren parámetros adicionales.
    """


class UploadChatAttachmentSerializer(serializers.Serializer):
    """
    Upload multipart para un único archivo, ligado a una identidad
    remitente propia y a una conversación existente.

    El archivo se sube bajo owner_id = auth.uid(), por lo que consume
    la cuota del usuario autenticado, como definimos para BeeApp.
    """

    sender_identity_id = serializers.UUIDField()

    message_type = serializers.ChoiceField(
        choices=CHAT_ATTACHMENT_MESSAGE_TYPES,
    )

    file = serializers.FileField(
        allow_empty_file=False,
    )

    body = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=10_000,
        trim_whitespace=True,
    )

    metadata = serializers.JSONField(
        required=False,
        default=dict,
    )

    def validate_file(self, value):
        if value.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES:
            raise serializers.ValidationError(
                "Chat attachments must be 50 MB or smaller."
            )

        if value.size <= 0:
            raise serializers.ValidationError(
                "Chat attachment cannot be empty."
            )

        return value

    def validate_body(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized_value = value.strip()
        return normalized_value or None

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Metadata must be a JSON object."
            )

        return value


class ChatAttachmentAccessQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()

    download = serializers.BooleanField(
        required=False,
        default=False,
    )
