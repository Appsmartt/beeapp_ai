from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.google_calendar_provider_service import (
    GoogleCalendarProvider,
)
from apps.calendar.services.microsoft_calendar_provider_service import (
    MicrosoftCalendarProvider,
)
from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.connection.token_service import (
    get_valid_google_access_token,
    get_valid_microsoft_access_token,
)

from .client import _extract_single, _supabase
from .constants import CALENDAR_INTEGRATION_COLUMNS

def _get_calendar_provider(
    provider: str,
):
    if provider == "google":
        return GoogleCalendarProvider()

    if provider == "microsoft":
        return MicrosoftCalendarProvider()

    raise CalendarError(
        f"Unsupported calendar provider: {provider}"
    )


def _get_calendar_integration_for_user(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendar_integrations")
            .select(CALENDAR_INTEGRATION_COLUMNS)
            .eq("id", integration_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        integration = _extract_single(response)

        if not integration:
            raise CalendarError(
                "Calendar integration was not found."
            )

        return integration

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not retrieve calendar integration."
        ) from error


def _require_active_calendar_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    integration = _get_calendar_integration_for_user(
        user_id=user_id,
        integration_id=integration_id,
    )

    if integration["status"] != "active":
        message = integration.get("last_error_message")

        raise CalendarError(
            message
            or "Calendar integration requires reconnection."
        )

    if not integration.get("integration_connection_id"):
        raise CalendarError(
            "Calendar integration has no linked OAuth connection."
        )

    return integration


def _get_valid_access_token(
    *,
    user_id: str,
    integration: dict[str, Any],
) -> str:
    provider = integration["provider"]
    connection_id = str(
        integration["integration_connection_id"]
    )

    try:
        if provider == "google":
            return get_valid_google_access_token(
                user_id=user_id,
                connection_id=connection_id,
            )

        if provider == "microsoft":
            return get_valid_microsoft_access_token(
                user_id=user_id,
                connection_id=connection_id,
            )

    except IntegrationCredentialError as error:
        raise CalendarError(str(error)) from error

    raise CalendarError(
        f"Unsupported calendar provider: {provider}"
    )
