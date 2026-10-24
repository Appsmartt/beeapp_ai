from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
)

from .colors import _get_account_color, _update_integration_account_color
from .integrations import (
    _get_calendar_integration_for_user,
    _get_calendar_provider,
    _get_valid_access_token,
    _require_active_calendar_integration,
)
from .repository import (
    _upsert_external_calendar,
    list_external_calendars,
    update_external_calendar_preferences,
)

def discover_external_calendars(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    integration = _require_active_calendar_integration(
        user_id=user_id,
        integration_id=integration_id,
    )

    access_token = _get_valid_access_token(
        user_id=user_id,
        integration=integration,
    )

    provider = _get_calendar_provider(
        integration["provider"]
    )

    try:
        provider_calendars = provider.list_calendars(
            access_token=access_token,
        )
    except CalendarProviderError as error:
        raise CalendarError(str(error)) from error

    account_color = _get_account_color(integration)

    integration = _update_integration_account_color(
        integration=integration,
        account_color=account_color,
    )

    external_calendars = [
        _upsert_external_calendar(
            user_id=user_id,
            integration=integration,
            provider_calendar=provider_calendar,
            account_color=account_color,
        )
        for provider_calendar in provider_calendars
    ]

    return {
        "integration_id": integration["id"],
        "provider": integration["provider"],
        "account_color": account_color,
        "discovered_count": len(external_calendars),
        "external_calendars": external_calendars,
    }
