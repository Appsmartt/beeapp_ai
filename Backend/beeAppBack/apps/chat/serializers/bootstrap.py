from __future__ import annotations

from rest_framework import serializers

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



class ChatTypedInboxQuerySerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    conversation_type = serializers.ChoiceField(
        choices=("direct", "group"),
    )
    limit = serializers.IntegerField(
        required=False,
        default=10,
        min_value=5,
        max_value=10,
    )
    before_sort_at = serializers.DateTimeField(required=False)
    before_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if attrs["limit"] not in (5, 10):
            raise serializers.ValidationError(
                {"limit": "Page size must be 5 or 10."}
            )
        if ("before_sort_at" in attrs) != ("before_id" in attrs):
            raise serializers.ValidationError(
                "Both cursor fields are required together."
            )
        return attrs


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

class ChatSyncBootstrapQuerySerializer(serializers.Serializer):
    """
    Parámetros de precarga de Chat ejecutada después del login.

    La aplicación debe usar los valores por defecto:
    - 10 conversaciones directas;
    - 5 grupos;
    - mensajes de los últimos 7 días;
    - máximo 100 mensajes por conversación.
    """

    direct_limit = serializers.IntegerField(
        required=False,
        default=10,
        min_value=1,
        max_value=20,
    )

    group_limit = serializers.IntegerField(
        required=False,
        default=5,
        min_value=1,
        max_value=20,
    )

    messages_since = serializers.DateTimeField(
        required=False,
        allow_null=True,
        default=None,
    )

    messages_per_conversation = serializers.IntegerField(
        required=False,
        default=100,
        min_value=1,
        max_value=200,
    )


class ChatSyncChangesQuerySerializer(serializers.Serializer):
    """
    Cursor incremental para recuperar eventos de Chat no recibidos
    por Broadcast mientras la aplicación estuvo desconectada,
    suspendida o en background.
    """

    after_event_sequence = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )

    limit = serializers.IntegerField(
        required=False,
        default=200,
        min_value=1,
        max_value=500,
    )
