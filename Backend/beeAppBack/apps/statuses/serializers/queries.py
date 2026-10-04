from __future__ import annotations

from rest_framework import serializers


class StatusFeedQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        required=False,
        default=50,
        min_value=1,
        max_value=100,
    )


class StatusMineQuerySerializer(serializers.Serializer):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )


class StatusDetailQuerySerializer(serializers.Serializer):
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )
