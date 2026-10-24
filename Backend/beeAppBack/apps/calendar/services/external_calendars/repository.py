from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import CalendarError

from .client import _extract_single, _response_data, _supabase, _utc_now_iso
from .constants import (
    BEEAPP_CALENDAR_COLUMNS,
    EXTERNAL_CALENDAR_COLUMNS,
)
from .integrations import _get_calendar_integration_for_user

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

    color = account_color

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
        "display_color": account_color,
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
