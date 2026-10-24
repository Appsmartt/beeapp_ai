from __future__ import annotations

from rest_framework import serializers


class RejectCommercialRequestProposalSerializer(
    serializers.Serializer,
):
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate_rejection_reason(
        self,
        value: str,
    ) -> str | None:
        normalized = value.strip()
        return normalized or None


class WithdrawCommercialRequestProposalSerializer(
    serializers.Serializer,
):
    withdrawal_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate_withdrawal_reason(
        self,
        value: str,
    ) -> str | None:
        normalized = value.strip()
        return normalized or None


class CompleteCommercialRequestSerializer(serializers.Serializer):
    completion_note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate_completion_note(
        self,
        value: str,
    ) -> str | None:
        normalized = value.strip()
        return normalized or None
