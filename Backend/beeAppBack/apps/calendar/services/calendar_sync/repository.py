from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.calendar.exceptions import CalendarError

from .constants import (
    CALENDAR_INTEGRATION_COLUMNS,
    EVENT_COLUMNS,
    EXTERNAL_CALENDAR_COLUMNS,
    extract_single,
    response_data,
)
from .normalization import (
    normalize_provider_event_id,
    normalize_text,
)
from .payloads import external_event_metadata


def supabase():
    return get_supabase_admin_client()


def get_external_calendars_to_sync(
    *,
    integration_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            supabase()
            .table("calendar_external_calendars")
            .select(EXTERNAL_CALENDAR_COLUMNS)
            .eq("integration_id", integration_id)
            .eq("is_selected", True)
            .execute()
        )
        return response_data(response)
    except Exception as error:
        raise CalendarError(
            "Could not retrieve selected external calendars."
        ) from error


def find_existing_external_event(
    *,
    external_calendar_id: str,
    provider_event_id: str,
) -> dict[str, Any] | None:
    try:
        response = (
            supabase()
            .table("calendar_events")
            .select(EVENT_COLUMNS)
            .eq("external_calendar_id", external_calendar_id)
            .eq("provider_event_id", provider_event_id)
            .maybe_single()
            .execute()
        )
        return extract_single(response)
    except Exception as error:
        raise CalendarError(
            "Could not locate an existing external event."
        ) from error


def mark_existing_event_cancelled(
    *,
    existing_event: dict[str, Any],
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    provider_event: dict[str, Any],
) -> str:
    metadata = existing_event.get("metadata")
    merged_metadata = (
        dict(metadata)
        if isinstance(metadata, dict)
        else {}
    )
    merged_metadata.update(
        external_event_metadata(
            integration=integration,
            external_calendar=external_calendar,
            provider_event=provider_event,
        )
    )

    payload = {
        "status": "cancelled",
        "provider_change_key": normalize_text(
            provider_event.get("provider_change_key"),
            max_length=500,
        ),
        "provider_updated_at": provider_event.get(
            "provider_updated_at"
        ),
        "metadata": merged_metadata,
    }

    try:
        response = (
            supabase()
            .table("calendar_events")
            .update(payload)
            .eq("id", existing_event["id"])
            .execute()
        )
        updated_event = extract_single(response)

        if not updated_event:
            raise CalendarError(
                "Could not cancel an existing external event."
            )

        return str(updated_event["id"])
    except CalendarError:
        raise
    except Exception as error:
        raise CalendarError(
            "Could not cancel an existing external event."
        ) from error


def persist_external_event(
    *,
    existing_event: dict[str, Any] | None,
    payload: dict[str, Any],
) -> tuple[str, bool]:
    try:
        if existing_event:
            response = (
                supabase()
                .table("calendar_events")
                .update(payload)
                .eq("id", existing_event["id"])
                .execute()
            )
            event = extract_single(response)

            if not event:
                raise CalendarError(
                    "Could not update an external event."
                )

            return str(event["id"]), False

        response = (
            supabase()
            .table("calendar_events")
            .insert(payload)
            .execute()
        )
        event = extract_single(response)

        if not event:
            raise CalendarError(
                "Could not create an external event."
            )

        return str(event["id"]), True
    except CalendarError:
        raise
    except Exception as error:
        raise CalendarError(
            "Could not persist an external event."
        ) from error


def get_due_calendar_integrations() -> list[dict[str, Any]]:
    try:
        response = (
            supabase()
            .table("calendar_integrations")
            .select(CALENDAR_INTEGRATION_COLUMNS)
            .eq("status", "active")
            .execute()
        )
        integrations = response_data(response)
        return [
            integration
            for integration in integrations
            if integration.get("integration_connection_id")
        ]
    except Exception as error:
        raise CalendarError(
            "Could not retrieve calendar integrations to sync."
        ) from error
