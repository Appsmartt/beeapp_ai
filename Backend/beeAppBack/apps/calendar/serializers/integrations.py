from __future__ import annotations

from rest_framework import serializers


class CalendarIntegrationListQuerySerializer(serializers.Serializer):
    provider = serializers.ChoiceField(
        choices=("google", "microsoft"),
        required=False,
    )


class CalendarIntegrationSyncRequestSerializer(
    serializers.Serializer,
):
    """
    Valida opciones para sincronizar una integración de calendario.
    """

    force_full_sync = serializers.BooleanField(
        required=False,
        default=False,
    )


class UpdateExternalCalendarPreferencesSerializer(
    serializers.Serializer,
):
    is_selected = serializers.BooleanField(required=False)

    is_visible = serializers.ChoiceField(
        choices=("visible", "hidden"),
        required=False,
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError(
                "At least one field must be provided."
            )
