from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_external_calendar_service import (
    _get_calendar_provider,
    _get_valid_access_token,
    _require_active_calendar_integration,
)
from apps.calendar.services.calendar_provider_service import (
    CalendarProviderError,
    normalize_hex_color,
)
from apps.integrations.services.calendar_integration_link_service import (
    sync_calendar_integration_from_connection,
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

EVENT_COLUMNS = (
    "id,calendar_id,organizer_id,source,status,event_kind,"
    "custom_type_name,title,description,color,is_all_day,"
    "starts_at,ends_at,starts_on,ends_on,timezone,location_name,"
    "location_address,location_maps_url,is_private,"
    "notifications_enabled,external_calendar_id,"
    "provider_event_id,provider_change_key,"
    "provider_updated_at,metadata,created_at,updated_at"
)

BEEAPP_EVENT_COLORS = (
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

SYNC_PAST_DAYS = 90
SYNC_FUTURE_DAYS = 365
MAX_TITLE_LENGTH = 300
MAX_DESCRIPTION_LENGTH = 10_000
MAX_TIMEZONE_LENGTH = 100
MAX_LOCATION_NAME_LENGTH = 300
MAX_LOCATION_ADDRESS_LENGTH = 500
MAX_LOCATION_MAPS_URL_LENGTH = 2_000


def _supabase():
    return get_supabase_admin_client()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return _utc_now().isoformat()


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


def _sync_range() -> tuple[datetime, datetime]:
    now = _utc_now()

    return (
        now - timedelta(days=SYNC_PAST_DAYS),
        now + timedelta(days=SYNC_FUTURE_DAYS),
    )


def _normalize_text(
    value: Any,
    *,
    max_length: int,
    fallback: str | None = None,
) -> str | None:
    if value is None:
        return fallback

    normalized = str(value).strip()

    if not normalized:
        return fallback

    return normalized[:max_length]


def _normalize_event_status(
    value: Any,
) -> str:
    if str(value or "").strip().lower() == "cancelled":
        return "cancelled"

    return "confirmed"


def _normalize_event_kind(
    value: Any,
) -> str:
    normalized = str(value or "").strip().lower()

    if normalized in {"virtual", "in_person"}:
        return normalized

    return "in_person"


def _stable_color_from_seed(
    seed: str,
) -> str:
    hash_value = 0

    for character in seed:
        hash_value = (
            (hash_value * 31) + ord(character)
        ) & 0xFFFFFFFF

    return BEEAPP_EVENT_COLORS[
        hash_value % len(BEEAPP_EVENT_COLORS)
    ]


def _normalize_event_color(
    *,
    external_calendar: dict[str, Any],
) -> str:
    candidate_color = (
        external_calendar.get("display_color")
        or external_calendar.get("provider_color")
    )

    normalized_color = normalize_hex_color(
        candidate_color,
        fallback="",
    )

    if normalized_color in BEEAPP_EVENT_COLORS:
        return normalized_color

    return _stable_color_from_seed(
        str(external_calendar["id"])
    )


def _get_external_calendars_to_sync(
    *,
    integration_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            _supabase()
            .table("calendar_external_calendars")
            .select(EXTERNAL_CALENDAR_COLUMNS)
            .eq("integration_id", integration_id)
            .eq("is_selected", True)
            .execute()
        )

        return _response_data(response)

    except Exception as error:
        raise CalendarError(
            "Could not retrieve selected external calendars."
        ) from error


def _get_beeapp_calendar_id(
    external_calendar: dict[str, Any],
) -> str:
    metadata = external_calendar.get("metadata")

    if not isinstance(metadata, dict):
        raise CalendarError(
            "External calendar is not linked to a BeeApp calendar."
        )

    beeapp_calendar_id = metadata.get("beeapp_calendar_id")

    if not isinstance(beeapp_calendar_id, str):
        raise CalendarError(
            "External calendar is not linked to a BeeApp calendar."
        )

    normalized_id = beeapp_calendar_id.strip()

    if not normalized_id:
        raise CalendarError(
            "External calendar is not linked to a BeeApp calendar."
        )

    return normalized_id


def _external_event_metadata(
    *,
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    provider_event: dict[str, Any],
) -> dict[str, Any]:
    existing_metadata = provider_event.get("metadata")

    normalized_metadata = (
        dict(existing_metadata)
        if isinstance(existing_metadata, dict)
        else {}
    )

    normalized_metadata.update(
        {
            "calendar_integration_id": integration["id"],
            "external_calendar_id": external_calendar["id"],
            "provider": integration["provider"],
            "provider_calendar_id": (
                external_calendar["provider_calendar_id"]
            ),
            "provider_event_id": provider_event[
                "provider_event_id"
            ],
            "provider_change_key": provider_event.get(
                "provider_change_key"
            ),
            "provider_etag": provider_event.get(
                "provider_etag"
            ),
            "provider_updated_at": provider_event.get(
                "provider_updated_at"
            ),
            "provider_web_link": provider_event.get(
                "provider_web_link"
            ),
            "last_synced_at": _utc_now_iso(),
        }
    )

    return normalized_metadata


def _find_existing_external_event(
    *,
    external_calendar_id: str,
    provider_event_id: str,
) -> dict[str, Any] | None:
    try:
        response = (
            _supabase()
            .table("calendar_events")
            .select(EVENT_COLUMNS)
            .eq(
                "external_calendar_id",
                external_calendar_id,
            )
            .eq(
                "provider_event_id",
                provider_event_id,
            )
            .maybe_single()
            .execute()
        )

        return _extract_single(response)

    except Exception as error:
        raise CalendarError(
            "Could not locate an existing external event."
        ) from error


def _mark_existing_event_cancelled(
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
        _external_event_metadata(
            integration=integration,
            external_calendar=external_calendar,
            provider_event=provider_event,
        )
    )

    payload = {
        "status": "cancelled",
        "provider_change_key": _normalize_text(
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
            _supabase()
            .table("calendar_events")
            .update(payload)
            .eq("id", existing_event["id"])
            .execute()
        )

        updated_event = _extract_single(response)

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


def _is_incomplete_cancelled_event(
    provider_event: dict[str, Any],
) -> bool:
    if _normalize_event_status(
        provider_event.get("status")
    ) != "cancelled":
        return False

    if provider_event.get("is_all_day") is True:
        return not (
            provider_event.get("starts_on")
            and provider_event.get("ends_on")
        )

    return not (
        provider_event.get("starts_at")
        and provider_event.get("ends_at")
    )


def _build_external_event_payload(
    *,
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    provider_event: dict[str, Any],
) -> dict[str, Any]:
    beeapp_calendar_id = _get_beeapp_calendar_id(
        external_calendar,
    )

    provider_event_id = _normalize_text(
        provider_event.get("provider_event_id"),
        max_length=500,
    )

    if not provider_event_id:
        raise CalendarError(
            "External event is missing its provider identifier."
        )

    title = _normalize_text(
        provider_event.get("title"),
        max_length=MAX_TITLE_LENGTH,
        fallback="Sin título",
    )

    timezone_name = _normalize_text(
        provider_event.get("timezone"),
        max_length=MAX_TIMEZONE_LENGTH,
        fallback=(
            _normalize_text(
                external_calendar.get("timezone"),
                max_length=MAX_TIMEZONE_LENGTH,
                fallback="America/Bogota",
            )
            or "America/Bogota"
        ),
    )

    return {
        "calendar_id": beeapp_calendar_id,
        "organizer_id": integration["user_id"],
        "source": integration["provider"],
        "status": _normalize_event_status(
            provider_event.get("status")
        ),
        "event_kind": _normalize_event_kind(
            provider_event.get("event_kind")
        ),
        "custom_type_name": None,
        "title": title,
        "description": _normalize_text(
            provider_event.get("description"),
            max_length=MAX_DESCRIPTION_LENGTH,
        ),
        "color": _normalize_event_color(
            external_calendar=external_calendar,
        ),
        "is_all_day": bool(provider_event["is_all_day"]),
        "starts_at": provider_event.get("starts_at"),
        "ends_at": provider_event.get("ends_at"),
        "starts_on": provider_event.get("starts_on"),
        "ends_on": provider_event.get("ends_on"),
        "timezone": timezone_name,
        "location_name": _normalize_text(
            provider_event.get("location_name"),
            max_length=MAX_LOCATION_NAME_LENGTH,
        ),
        "location_address": _normalize_text(
            provider_event.get("location_address"),
            max_length=MAX_LOCATION_ADDRESS_LENGTH,
        ),
        "location_maps_url": _normalize_text(
            provider_event.get("location_maps_url"),
            max_length=MAX_LOCATION_MAPS_URL_LENGTH,
        ),
        "is_private": False,
        "notifications_enabled": False,
        "external_calendar_id": external_calendar["id"],
        "provider_event_id": provider_event_id,
        "provider_change_key": _normalize_text(
            provider_event.get("provider_change_key"),
            max_length=500,
        ),
        "provider_updated_at": provider_event.get(
            "provider_updated_at"
        ),
        "metadata": _external_event_metadata(
            integration=integration,
            external_calendar=external_calendar,
            provider_event=provider_event,
        ),
    }


def _upsert_external_event(
    *,
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    provider_event: dict[str, Any],
) -> tuple[str | None, bool, bool]:
    provider_event_id = _normalize_text(
        provider_event.get("provider_event_id"),
        max_length=500,
    )

    if not provider_event_id:
        raise CalendarError(
            "External event is missing its provider identifier."
        )

    existing_event = _find_existing_external_event(
        external_calendar_id=external_calendar["id"],
        provider_event_id=provider_event_id,
    )

    if _is_incomplete_cancelled_event(provider_event):
        if not existing_event:
            return None, False, True

        event_id = _mark_existing_event_cancelled(
            existing_event=existing_event,
            integration=integration,
            external_calendar=external_calendar,
            provider_event=provider_event,
        )

        return event_id, False, False

    payload = _build_external_event_payload(
        integration=integration,
        external_calendar=external_calendar,
        provider_event=provider_event,
    )

    try:
        if existing_event:
            response = (
                _supabase()
                .table("calendar_events")
                .update(payload)
                .eq("id", existing_event["id"])
                .execute()
            )

            updated_event = _extract_single(response)

            if not updated_event:
                raise CalendarError(
                    "Could not update an external event."
                )

            return str(updated_event["id"]), False, False

        response = (
            _supabase()
            .table("calendar_events")
            .insert(payload)
            .execute()
        )

        created_event = _extract_single(response)

        if not created_event:
            raise CalendarError(
                "Could not create an external event."
            )

        return str(created_event["id"]), True, False

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not persist an external event."
        ) from error


def _mark_external_calendar_sync_success(
    *,
    external_calendar_id: str,
    synced_at: str,
) -> None:
    try:
        (
            _supabase()
            .table("calendar_external_calendars")
            .update(
                {
                    "last_attempted_sync_at": synced_at,
                    "last_successful_sync_at": synced_at,
                }
            )
            .eq("id", external_calendar_id)
            .execute()
        )
    except Exception as error:
        raise CalendarError(
            "Could not update external calendar sync status."
        ) from error


def _mark_external_calendar_sync_failure(
    *,
    external_calendar_id: str,
    attempted_at: str,
) -> None:
    try:
        (
            _supabase()
            .table("calendar_external_calendars")
            .update(
                {
                    "last_attempted_sync_at": attempted_at,
                }
            )
            .eq("id", external_calendar_id)
            .execute()
        )
    except Exception:
        return


def _mark_integration_sync_success(
    *,
    integration_id: str,
    synced_at: str,
) -> None:
    try:
        (
            _supabase()
            .table("calendar_integrations")
            .update(
                {
                    "status": "active",
                    "last_attempted_sync_at": synced_at,
                    "last_successful_sync_at": synced_at,
                    "next_sync_at": (
                        _utc_now()
                        + timedelta(minutes=10)
                    ).isoformat(),
                    "last_error_code": None,
                    "last_error_message": None,
                }
            )
            .eq("id", integration_id)
            .execute()
        )
    except Exception as error:
        raise CalendarError(
            "Could not update calendar integration sync status."
        ) from error


def _mark_integration_sync_failure(
    *,
    integration_id: str,
    attempted_at: str,
    error: str,
) -> None:
    try:
        (
            _supabase()
            .table("calendar_integrations")
            .update(
                {
                    "last_attempted_sync_at": attempted_at,
                    "next_sync_at": (
                        _utc_now()
                        + timedelta(minutes=10)
                    ).isoformat(),
                    "last_error_code": "calendar_sync_failed",
                    "last_error_message": error[:500],
                }
            )
            .eq("id", integration_id)
            .execute()
        )
    except Exception:
        return


def _sync_selected_external_calendar(
    *,
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    access_token: str,
    range_start: datetime,
    range_end: datetime,
) -> dict[str, int]:
    attempted_at = _utc_now_iso()

    try:
        provider = _get_calendar_provider(
            integration["provider"]
        )

        provider_events = provider.list_events(
            access_token=access_token,
            provider_calendar_id=external_calendar[
                "provider_calendar_id"
            ],
            range_start=range_start,
            range_end=range_end,
        )

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for provider_event in provider_events:
            _, created, skipped = _upsert_external_event(
                integration=integration,
                external_calendar=external_calendar,
                provider_event=provider_event,
            )

            if skipped:
                skipped_count += 1
            elif created:
                created_count += 1
            else:
                updated_count += 1

        _mark_external_calendar_sync_success(
            external_calendar_id=external_calendar["id"],
            synced_at=attempted_at,
        )

        return {
            "fetched": len(provider_events),
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
        }

    except (
        CalendarError,
        CalendarProviderError,
    ):
        _mark_external_calendar_sync_failure(
            external_calendar_id=external_calendar["id"],
            attempted_at=attempted_at,
        )
        raise

    except Exception as error:
        _mark_external_calendar_sync_failure(
            external_calendar_id=external_calendar["id"],
            attempted_at=attempted_at,
        )

        raise CalendarError(
            "Could not synchronize an external calendar."
        ) from error


def sync_calendar_integration(
    *,
    user_id: str,
    integration_id: str,
    force_full_sync: bool = False,
) -> dict[str, Any]:
    del force_full_sync

    attempted_at = _utc_now_iso()

    try:
        integration = _require_active_calendar_integration(
            user_id=user_id,
            integration_id=integration_id,
        )

        access_token = _get_valid_access_token(
            user_id=user_id,
            integration=integration,
        )

        selected_external_calendars = (
            _get_external_calendars_to_sync(
                integration_id=integration_id,
            )
        )

        range_start, range_end = _sync_range()

        fetched_count = 0
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for external_calendar in selected_external_calendars:
            result = _sync_selected_external_calendar(
                integration=integration,
                external_calendar=external_calendar,
                access_token=access_token,
                range_start=range_start,
                range_end=range_end,
            )

            fetched_count += result["fetched"]
            created_count += result["created"]
            updated_count += result["updated"]
            skipped_count += result["skipped"]

        refreshed_integration = (
            sync_calendar_integration_from_connection(
                connection_id=integration[
                    "integration_connection_id"
                ],
            )
        )

        _mark_integration_sync_success(
            integration_id=integration_id,
            synced_at=attempted_at,
        )

        return {
            "integration_id": integration_id,
            "provider": integration["provider"],
            "synced_external_calendar_count": len(
                selected_external_calendars
            ),
            "fetched_event_count": fetched_count,
            "created_event_count": created_count,
            "updated_event_count": updated_count,
            "skipped_event_count": skipped_count,
            "synced_events_count": (
                created_count + updated_count
            ),
            "integration": refreshed_integration
            or integration,
        }

    except CalendarError as error:
        _mark_integration_sync_failure(
            integration_id=integration_id,
            attempted_at=attempted_at,
            error=str(error),
        )
        raise

    except Exception as error:
        _mark_integration_sync_failure(
            integration_id=integration_id,
            attempted_at=attempted_at,
            error=str(error),
        )

        raise CalendarError(
            "Could not synchronize calendar integration."
        ) from error


def _get_due_calendar_integrations() -> list[dict[str, Any]]:
    try:
        response = (
            _supabase()
            .table("calendar_integrations")
            .select(CALENDAR_INTEGRATION_COLUMNS)
            .eq("status", "active")
            .execute()
        )

        integrations = _response_data(response)

        return [
            integration
            for integration in integrations
            if integration.get("integration_connection_id")
        ]

    except Exception as error:
        raise CalendarError(
            "Could not retrieve calendar integrations to sync."
        ) from error


def sync_due_calendar_integrations() -> dict[str, int]:
    integrations = _get_due_calendar_integrations()

    synced_integration_count = 0
    failed_integration_count = 0
    synced_event_count = 0

    for integration in integrations:
        try:
            result = sync_calendar_integration(
                user_id=str(integration["user_id"]),
                integration_id=str(integration["id"]),
            )

            synced_integration_count += 1
            synced_event_count += result["synced_events_count"]

        except CalendarError:
            failed_integration_count += 1

    return {
        "processed_integration_count": len(integrations),
        "synced_integration_count": synced_integration_count,
        "failed_integration_count": failed_integration_count,
        "synced_event_count": synced_event_count,
    }