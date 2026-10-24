from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any
from uuid import UUID

from beeAppBack.core.supabase_client import get_supabase_admin_client


CALENDAR_COLUMNS = (
    "id,owner_id,name,description,color,visibility,is_default,"
    "is_archived,timezone,created_at,updated_at"
)
TAG_COLUMNS = "id,owner_id,name,color,created_at,updated_at"
PREFERENCE_COLUMNS = (
    "user_id,timezone,week_starts_on,show_weekends,default_view,"
    "default_event_color,default_event_kind,default_reminders,"
    "show_declined_events,notify_invitations,notify_rsvp_updates,"
    "notify_event_changes,notify_reminders,notify_sync_errors,"
    "notify_conflicts,created_at,updated_at"
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
REMINDER_COLUMNS = (
    "id,event_id,recipient_id,channel,offset_minutes,"
    "all_day_reminder_time,status,scheduled_for,sent_at,"
    "cancelled_at,failure_reason,created_at,updated_at"
)
CONFERENCE_COLUMNS = (
    "id,event_id,provider,label,join_url,external_conference_id,"
    "status,is_primary,metadata,created_at,updated_at"
)
RECURRENCE_COLUMNS = (
    "id,event_id,rrule,frequency,interval_count,week_days,"
    "month_day,nth_weekday,until_at,occurrence_count,timezone,"
    "created_at,updated_at"
)


def get_supabase():
    return get_supabase_admin_client()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def iso_datetime(value: datetime | str | None) -> str | None:
    if value is None or isinstance(value, str):
        return value

    return value.isoformat()


def iso_date(value: date | str | None) -> str | None:
    if value is None or isinstance(value, str):
        return value

    return value.isoformat()


def iso_time(value: time | str | None) -> str | None:
    if value is None or isinstance(value, str):
        return value

    return value.isoformat()


def to_string_list(values: list[UUID | str] | None) -> list[str]:
    return [str(value) for value in values or []]


def extract_single(response: Any) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    return data if isinstance(data, dict) else None


def response_data(response: Any) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    return [data] if isinstance(data, dict) else []
