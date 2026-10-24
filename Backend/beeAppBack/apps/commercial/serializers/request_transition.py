from __future__ import annotations

from rest_framework import serializers


class CommercialRequestTransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=(
            "start_review",
            "accept",
            "reject",
            "cancel",
        )
    )
    reason_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=3000,
    )

    def validate(self, attrs: dict) -> dict:
        action = attrs["action"]
        reason_text = str(attrs.get("reason_text") or "").strip()

        if action == "reject" and not reason_text:
            raise serializers.ValidationError(
                {
                    "reason_text": (
                        "A rejection reason is required."
                    )
                }
            )

        return attrs
