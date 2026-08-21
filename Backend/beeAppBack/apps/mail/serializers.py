from __future__ import annotations

from rest_framework import serializers


MAIL_FOLDERS = (
    "inbox",
    "sent",
    "drafts",
    "archived",
    "spam",
    "trash",
)

MAIL_PROVIDERS = (
    "google",
    "microsoft",
)


class MailIntegrationListQuerySerializer(serializers.Serializer):
    provider = serializers.ChoiceField(
        choices=MAIL_PROVIDERS,
        required=False,
    )

    include_inactive = serializers.BooleanField(
        required=False,
        default=True,
    )


class MailSyncRequestSerializer(serializers.Serializer):
    integration_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        max_length=50,
    )

    force_full_sync = serializers.BooleanField(
        required=False,
        default=False,
    )


class MailMessageListQuerySerializer(serializers.Serializer):
    integration_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    folder = serializers.ChoiceField(
        choices=MAIL_FOLDERS,
        required=False,
        allow_null=True,
    )

    unread_only = serializers.BooleanField(
        required=False,
        default=False,
    )

    starred_only = serializers.BooleanField(
        required=False,
        default=False,
    )

    search = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=200,
        trim_whitespace=True,
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


class UpdateMailMessageStateSerializer(serializers.Serializer):
    is_read = serializers.BooleanField(
        required=False,
    )

    is_starred = serializers.BooleanField(
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one state field."
            )

        return attrs


class MoveMailMessageSerializer(serializers.Serializer):
    folder = serializers.ChoiceField(
        choices=MAIL_FOLDERS,
    )