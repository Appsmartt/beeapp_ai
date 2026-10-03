from __future__ import annotations

from rest_framework import serializers


class CommercialChatConversationSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField()
    commercial_profile_id = serializers.UUIDField()
    client_profile_id = serializers.UUIDField()
    created = serializers.BooleanField()
