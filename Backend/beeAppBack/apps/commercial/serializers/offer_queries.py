from __future__ import annotations

from rest_framework import serializers


class OwnedCommercialOffersQuerySerializer(serializers.Serializer):
    catalog_id = serializers.UUIDField(
        required=False,
    )
    include_archived = serializers.BooleanField(
        required=False,
        default=False,
    )
