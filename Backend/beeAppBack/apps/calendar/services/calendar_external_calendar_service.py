from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
    normalize_hex_color,
)
from apps.calendar.services.google_calendar_provider_service import (
    GoogleCalendarProvider,
)
from apps.calendar.services.microsoft_calendar_provider_service import (
    MicrosoftCalendarProvider,
)
from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.integration_connection_service import (
    get_valid_google_access_token,
    get_valid_microsoft_access_token,
)


ACCOUNT_COLOR_PALETTE = (
    "#6025D2",
    "#2563EB",
    "#0891B2",
    "#059669",
    "#65A30D",
    "#CA8A04",
    "#EA580C",
    "#DC2626",
    "#DB2777",
    "#9333EA",
    "#475569",
)

CALENDAR_INTEGRATION_COLUMNS = (
    "id,user_id,provider,provider_account_id,provider_email,"
    "provider_display_name,granted_scopes,token_expires_at,status,"
    "connected_at,last_successful_sync_at,last_attempted_sync_at,"
    "next_sync_at,reauth_required_at,disconnected_at,"
    "last_error_code,last_error_message,metadata,created_at,"
    "updated_at,integration_connection_id"
)

EXTERNAL_CALENDAR_COLUMNS = (
    "id,integration_id,provider_calendar_id,name,description,"
    "timezone,provider_color,display_color,access_level,"
    "is_primary,is_selected,is_visible,sync_cursor,"
    "last_successful_sync_at,last_attempted_sync_at,metadata,"
    "created_at,updated_at"
)

BEEAPP_CALENDAR_COLUMNS = (
    "id,owner_id,name,description,color,visibility,is_default,"
    "is_archived,timezone,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _stable_color_from_seed(
    seed: str,
) -> str:
    hash_value = 0

    for character in seed:
        hash_value = (
            (hash_value * 31) + ord(character)
        ) & 0xFFFFFFFF

    return ACCOUNT_COLOR_PALETTE[
        hash_value % len(ACCOUNT_COLOR_PALETTE)
    ]


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


def _get_account_color(
    integration: dict[str, Any],
) -> str:
    metadata = integration.get("metadata")

    if isinstance(metadata, dict):
        stored_color = metadata.get("account_color")

        if isinstance(stored_color, str):
            return normalize_hex_color(
                stored_color,
                fallback=_stable_color_from_seed(
                    str(integration["id"])
                ),
            )

    return _stable_color_from_seed(str(integration["id"]))


def _update_integration_account_color(
    *,
    integration: dict[str, Any],
    account_color: str,
) -> dict[str, Any]:
    metadata = integration.get("metadata")

    normalized_metadata = (
        dict(metadata)
        if isinstance(metadata, dict)
        else {}
    )

    if normalized_metadata.get("account_color") == account_color:
        return integration

    normalized_metadata["account_color"] = account_color
    normalized_metadata["account_color_updated_at"] = (
        _utc_now_iso()
    )

    response = (
        _supabase()
        .table("calendar_integrations")
        .update(
            {
                "metadata": normalized_metadata,
            }
        )
        .eq("id", integration["id"])
        .execute()
    )

    updated_integration = _extract_single(response)

    return updated_integration or {
        **integration,
        "metadata": normalized_metadata,
    }


def _get_existing_external_calendar(
    *,
    integration_id: str,
    provider_calendar_id: str,
) -> dict[str, Any] | None:
    response = (
        _supabase()
        .table("calendar_external_calendars")
        .select(EXTERNAL_CALENDAR_COLUMNS)
        .eq("integration_id", integration_id)
        .eq("provider_calendar_id", provider_calendar_id)
        .maybe_single()
        .execute()
    )

    return _extract_single(response)


def _get_or_create_beeapp_calendar(
    *,
    user_id: str,
    integration: dict[str, Any],
    external_calendar: dict[str, Any] | None,
    provider_calendar: dict[str, Any],
    account_color: str,
) -> dict[str, Any]:
    existing_metadata = (
        external_calendar.get("metadata")
        if external_calendar
        and isinstance(external_calendar.get("metadata"), dict)
        else {}
    )

    existing_beeapp_calendar_id = existing_metadata.get(
        "beeapp_calendar_id"
    )

    if isinstance(existing_beeapp_calendar_id, str):
        response = (
            _supabase()
            .table("calendars")
            .select(BEEAPP_CALENDAR_COLUMNS)
            .eq("id", existing_beeapp_calendar_id)
            .eq("owner_id", user_id)
            .maybe_single()
            .execute()
        )

        existing_beeapp_calendar = _extract_single(response)

        if existing_beeapp_calendar:
            return existing_beeapp_calendar

    provider_label = (
        "Google"
        if integration["provider"] == "google"
        else "Outlook"
    )

    calendar_name = (
        f"{provider_label} · {provider_calendar['name']}"
    )

    timezone_value = (
        provider_calendar.get("timezone")
        or "America/Bogota"
    )

    color = normalize_hex_color(
        provider_calendar.get("provider_color"),
        fallback=account_color,
    )

    response = (
        _supabase()
        .table("calendars")
        .insert(
            {
                "owner_id": user_id,
                "name": calendar_name[:120],
                "description": (
                    "Calendario externo vinculado a "
                    f"{provider_label}."
                ),
                "color": color,
                "visibility": "private",
                "is_default": False,
                "is_archived": False,
                "timezone": timezone_value,
            }
        )
        .execute()
    )

    beeapp_calendar = _extract_single(response)

    if not beeapp_calendar:
        raise CalendarError(
            "Could not create BeeApp calendar for external "
            "calendar."
        )

    return beeapp_calendar


def _upsert_external_calendar(
    *,
    user_id: str,
    integration: dict[str, Any],
    provider_calendar: dict[str, Any],
    account_color: str,
) -> dict[str, Any]:
    integration_id = str(integration["id"])
    provider_calendar_id = str(
        provider_calendar["provider_calendar_id"]
    )

    existing_external_calendar = _get_existing_external_calendar(
        integration_id=integration_id,
        provider_calendar_id=provider_calendar_id,
    )

    beeapp_calendar = _get_or_create_beeapp_calendar(
        user_id=user_id,
        integration=integration,
        external_calendar=existing_external_calendar,
        provider_calendar=provider_calendar,
        account_color=account_color,
    )

    existing_metadata = (
        existing_external_calendar.get("metadata")
        if existing_external_calendar
        and isinstance(
            existing_external_calendar.get("metadata"),
            dict,
        )
        else {}
    )

    provider_metadata = provider_calendar.get("metadata")

    normalized_provider_metadata = (
        provider_metadata
        if isinstance(provider_metadata, dict)
        else {}
    )

    is_selected = (
        existing_external_calendar["is_selected"]
        if existing_external_calendar
        else bool(provider_calendar.get("is_primary"))
    )

    is_visible = (
        existing_external_calendar["is_visible"]
        if existing_external_calendar
        else "visible"
    )

    external_metadata = {
        **existing_metadata,
        **normalized_provider_metadata,
        "beeapp_calendar_id": beeapp_calendar["id"],
        "account_color": account_color,
        "provider": integration["provider"],
        "provider_account_id": integration[
            "provider_account_id"
        ],
        "last_discovered_at": _utc_now_iso(),
    }

    payload = {
        "integration_id": integration_id,
        "provider_calendar_id": provider_calendar_id,
        "name": provider_calendar["name"],
        "description": provider_calendar.get("description"),
        "timezone": provider_calendar.get("timezone"),
        "provider_color": provider_calendar.get(
            "provider_color"
        ),
        "display_color": normalize_hex_color(
            provider_calendar.get("provider_color"),
            fallback=account_color,
        ),
        "access_level": provider_calendar.get(
            "access_level",
            "read_write",
        ),
        "is_primary": bool(provider_calendar.get("is_primary")),
        "is_selected": is_selected,
        "is_visible": is_visible,
        "metadata": external_metadata,
    }

    if existing_external_calendar:
        response = (
            _supabase()
            .table("calendar_external_calendars")
            .update(payload)
            .eq("id", existing_external_calendar["id"])
            .execute()
        )
    else:
        response = (
            _supabase()
            .table("calendar_external_calendars")
            .insert(payload)
            .execute()
        )

    external_calendar = _extract_single(response)

    if not external_calendar:
        raise CalendarError(
            "Could not save external calendar."
        )

    return {
        **external_calendar,
        "beeapp_calendar": beeapp_calendar,
        "account_color": account_color,
    }


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


def list_external_calendars(
    *,
    user_id: str,
    integration_id: str,
) -> list[dict[str, Any]]:
    _get_calendar_integration_for_user(
        user_id=user_id,
        integration_id=integration_id,
    )

    try:
        response = (
            _supabase()
            .table("calendar_external_calendars")
            .select(EXTERNAL_CALENDAR_COLUMNS)
            .eq("integration_id", integration_id)
            .order("is_primary", desc=True)
            .order("name")
            .execute()
        )

        return _response_data(response)

    except Exception as error:
        raise CalendarError(
            "Could not retrieve external calendars."
        ) from error


def update_external_calendar_preferences(
    *,
    user_id: str,
    external_calendar_id: str,
    is_selected: bool | None = None,
    is_visible: str | None = None,
) -> dict[str, Any]:
    try:
        external_response = (
            _supabase()
            .table("calendar_external_calendars")
            .select(EXTERNAL_CALENDAR_COLUMNS)
            .eq("id", external_calendar_id)
            .maybe_single()
            .execute()
        )

        external_calendar = _extract_single(external_response)

        if not external_calendar:
            raise CalendarError(
                "External calendar was not found."
            )

        _get_calendar_integration_for_user(
            user_id=user_id,
            integration_id=str(
                external_calendar["integration_id"]
            ),
        )

        payload: dict[str, Any] = {}

        if is_selected is not None:
            payload["is_selected"] = is_selected

        if is_visible is not None:
            if is_visible not in ("visible", "hidden"):
                raise CalendarError(
                    "External calendar visibility is invalid."
                )

            payload["is_visible"] = is_visible

        if not payload:
            raise CalendarError(
                "At least one external calendar preference "
                "must be provided."
            )

        response = (
            _supabase()
            .table("calendar_external_calendars")
            .update(payload)
            .eq("id", external_calendar_id)
            .execute()
        )

        updated_external_calendar = _extract_single(response)

        if not updated_external_calendar:
            raise CalendarError(
                "Could not update external calendar."
            )

        return updated_external_calendar

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not update external calendar preferences."
        ) from error