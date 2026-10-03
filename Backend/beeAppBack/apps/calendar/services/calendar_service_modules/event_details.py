from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_service_modules.access import (
    get_event_access,
    get_user_attendee_row,
)
from apps.calendar.services.calendar_service_modules.shared import (
    ATTENDEE_COLUMNS,
    CONFERENCE_COLUMNS,
    RECURRENCE_COLUMNS,
    REMINDER_COLUMNS,
    extract_single,
    get_supabase,
    response_data,
)


def get_calendar_event_details(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    return get_event_details(user_id=user_id, event_id=event_id)


def get_event_details(
    *,
    user_id: str,
    event_id: str,
) -> dict[str, Any]:
    access = get_event_access(user_id=user_id, event_id=event_id)
    event = access["event"]
    supabase = get_supabase()

    attendees_response = (
        supabase.table("calendar_event_attendees")
        .select(ATTENDEE_COLUMNS)
        .eq("event_id", event_id)
        .neq("response_status", "removed")
        .order("is_organizer", desc=True)
        .order("created_at")
        .execute()
    )
    conferences_response = (
        supabase.table("calendar_event_conferences")
        .select(CONFERENCE_COLUMNS)
        .eq("event_id", event_id)
        .eq("status", "active")
        .order("is_primary", desc=True)
        .order("created_at")
        .execute()
    )
    reminders_response = (
        supabase.table("calendar_event_reminders")
        .select(REMINDER_COLUMNS)
        .eq("event_id", event_id)
        .eq("recipient_id", user_id)
        .neq("status", "cancelled")
        .order("offset_minutes")
        .execute()
    )
    tags_response = (
        supabase.table("calendar_event_tag_assignments")
        .select(
            "tag_id,calendar_tags("
            "id,owner_id,name,color,created_at,updated_at"
            ")"
        )
        .eq("event_id", event_id)
        .execute()
    )
    recurrence_response = (
        supabase.table("calendar_event_recurrences")
        .select(RECURRENCE_COLUMNS)
        .eq("event_id", event_id)
        .maybe_single()
        .execute()
    )

    tags = [
        assignment["calendar_tags"]
        for assignment in response_data(tags_response)
        if assignment.get("calendar_tags")
    ]
    current_user_attendee = access["attendee"]

    return {
        **event,
        "attendees": response_data(attendees_response),
        "conferences": response_data(conferences_response),
        "reminders": response_data(reminders_response),
        "tags": tags,
        "recurrence": extract_single(recurrence_response),
        "viewer_permission": access["share_permission"],
        "can_edit": access["can_edit"],
        "can_delete": access["can_delete"],
        "can_manage_attendees": access["can_manage_attendees"],
        "current_user_attendee": current_user_attendee,
        "current_user_response": (
            current_user_attendee.get("response_status")
            if current_user_attendee
            else None
        ),
    }
