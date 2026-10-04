from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


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
SYNC_INTERVAL_MINUTES = 10
MAX_PROVIDER_IDENTIFIER_LENGTH = 500
MAX_TITLE_LENGTH = 300
MAX_DESCRIPTION_LENGTH = 10_000
MAX_TIMEZONE_LENGTH = 100
MAX_LOCATION_NAME_LENGTH = 300
MAX_LOCATION_ADDRESS_LENGTH = 500
MAX_LOCATION_MAPS_URL_LENGTH = 2_000


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def sync_range() -> tuple[datetime, datetime]:
    now = utc_now()
    return (
        now - timedelta(days=SYNC_PAST_DAYS),
        now + timedelta(days=SYNC_FUTURE_DAYS),
    )


def response_data(response: Any) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def extract_single(response: Any) -> dict[str, Any] | None:
    data = response_data(response)
    return data[0] if data else None
