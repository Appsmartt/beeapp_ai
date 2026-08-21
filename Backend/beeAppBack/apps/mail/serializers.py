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

MAIL_MESSAGE_ACTIONS = (
    "archive",
    "restore",
    "trash",
    "spam",
)

MAIL_BODY_CONTENT_TYPES = (
    "text",
    "html",
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
                "Debes indicar al menos un estado para actualizar."
            )

        return attrs


class MoveMailMessageSerializer(serializers.Serializer):
    folder = serializers.ChoiceField(
        choices=MAIL_FOLDERS,
    )

    def validate_folder(self, value: str) -> str:
        if value in {"sent", "drafts"}:
            raise serializers.ValidationError(
                "No puedes mover un correo a esa carpeta."
            )

        return value


class MailMessageActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=MAIL_MESSAGE_ACTIONS,
    )

    def validate_action(self, value: str) -> str:
        return value.strip().lower()


class MailRecipientSerializer(serializers.Serializer):
    email = serializers.EmailField(
        max_length=320,
    )

    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
        trim_whitespace=True,
    )

    def validate_display_name(
        self,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = value.strip()

        return normalized or None


class MailDraftContentSerializer(serializers.Serializer):
    integration_id = serializers.UUIDField()

    to = MailRecipientSerializer(
        many=True,
        required=False,
        allow_empty=True,
        default=list,
    )

    cc = MailRecipientSerializer(
        many=True,
        required=False,
        allow_empty=True,
        default=list,
    )

    bcc = MailRecipientSerializer(
        many=True,
        required=False,
        allow_empty=True,
        default=list,
    )

    subject = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=1000,
        trim_whitespace=True,
    )

    body = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=200_000,
        trim_whitespace=False,
    )

    body_content_type = serializers.ChoiceField(
        choices=MAIL_BODY_CONTENT_TYPES,
        required=False,
        default="text",
    )

    file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        default=list,
        max_length=10,
    )

    def validate_file_ids(
        self,
        value,
    ):
        normalized_ids = [str(file_id) for file_id in value]

        if len(normalized_ids) != len(set(normalized_ids)):
            raise serializers.ValidationError(
                "No puedes adjuntar el mismo archivo más de una vez."
            )

        return value

    def validate(self, attrs):
        to_recipients = attrs.get("to", [])
        cc_recipients = attrs.get("cc", [])
        bcc_recipients = attrs.get("bcc", [])

        subject = str(attrs.get("subject") or "").strip()
        body = str(attrs.get("body") or "").strip()
        file_ids = attrs.get("file_ids", [])

        if not (
            to_recipients
            or cc_recipients
            or bcc_recipients
            or subject
            or body
            or file_ids
        ):
            raise serializers.ValidationError(
                "El borrador debe tener al menos un destinatario, "
                "asunto, contenido o adjunto."
            )

        attrs["subject"] = subject or None
        attrs["body"] = attrs.get("body") or None

        return attrs


class UpdateMailDraftSerializer(MailDraftContentSerializer):
    integration_id = serializers.UUIDField(
        required=False,
    )


class SendMailDraftSerializer(serializers.Serializer):
    pass