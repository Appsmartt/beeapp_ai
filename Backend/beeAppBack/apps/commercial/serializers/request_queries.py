from __future__ import annotations

from rest_framework import serializers


class ListCommercialRequestsQuerySerializer(serializers.Serializer):
    status = serializers.ListField(
        child=serializers.ChoiceField(
            choices=(
                "draft",
                "submitted",
                "under_review",
                "proposal_sent",
                "accepted",
                "payment_pending",
                "payment_submitted",
                "confirmed",
                "completed",
                "rejected",
                "cancelled",
                "expired",
                "disputed",
            )
        ),
        required=False,
        allow_empty=True,
    )
    limit = serializers.IntegerField(
        required=False,
        default=25,
        min_value=1,
        max_value=100,
    )
    offset = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
    )


class ListOwnedCommercialRequestsQuerySerializer(
    ListCommercialRequestsQuerySerializer,
):
    pass
