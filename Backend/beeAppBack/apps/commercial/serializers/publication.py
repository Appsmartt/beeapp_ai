from __future__ import annotations

from rest_framework import serializers

from apps.commercial.enums import (
    CommercialProfilePublicationStatus,
)
from apps.commercial.serializers.shared import (
    normalize_optional_text,
)


class UpdateCommercialProfilePublicationSerializer(
    serializers.Serializer,
):
    publication_status = serializers.ChoiceField(
        choices=(
            CommercialProfilePublicationStatus.PUBLISHED.value,
            CommercialProfilePublicationStatus.PAUSED.value,
            CommercialProfilePublicationStatus.ARCHIVED.value,
        ),
    )
    reason_code = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
        trim_whitespace=True,
    )
    reason_text = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
        trim_whitespace=True,
    )

    def validate_reason_code(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate_reason_text(
        self,
        value: str | None,
    ) -> str | None:
        return normalize_optional_text(value)

    def validate(self, attrs: dict) -> dict:
        if (
            attrs["publication_status"]
            == CommercialProfilePublicationStatus.ARCHIVED.value
            and not attrs.get("reason_text")
        ):
            raise serializers.ValidationError(
                {
                    "reason_text": (
                        "An archive reason is required."
                    )
                }
            )

        return attrs
