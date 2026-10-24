from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)


CALENDAR_COLUMNS = (
    "id,owner_id,name,description,color,visibility,is_default,"
    "is_archived,timezone,created_at,updated_at"
)

EVENT_COLUMNS = (
    "id,calendar_id,organizer_id,source,status,event_kind,"
    "custom_type_name,title,description,color,is_all_day,"
    "starts_at,ends_at,starts_on,ends_on,timezone,location_name,"
    "location_address,location_maps_url,is_private,"
    "notifications_enabled,metadata,created_at,updated_at"
)

ATTENDEE_COLUMNS = (
    "id,event_id,attendee_kind,attendee_user_id,external_email,"
    "external_display_name,is_organizer,response_status,"
    "responded_at,invitation_sent_at,invitation_read_at,hidden_at,"
    "external_attendee_id,metadata,created_at,updated_at"
)

INVITEE_REQUEST_COLUMNS = (
    "id,event_id,requested_by_user_id,requested_user_id,status,"
    "reviewed_by_user_id,reviewed_at,note,created_at,updated_at"
)

CALENDAR_SHARE_COLUMNS = (
    "id,calendar_id,shared_with_user_id,permission,accepted_at,"
    "revoked_at,created_at,updated_at"
)


def get_supabase():
    return get_supabase_admin_client()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []
