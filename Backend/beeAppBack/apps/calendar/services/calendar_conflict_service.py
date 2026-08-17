from __future__ import annotations

from datetime import datetime
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.calendar.exceptions import CalendarError


EVENT_COLUMNS = (
    "id,calendar_id,organizer_id,source,status,event_kind,"
    "is_all_day,starts_at,ends_at,starts_on,ends_on,timezone,"
    "is_private"
)


def _supabase():
    return get_supabase_admin_client()


def _as_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value

    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _event_overlaps(
    *,
    event: dict[str, Any],
    starts_at: datetime | None,
    ends_at: datetime | None,
    starts_on: str | None,
    ends_on: str | None,
    is_all_day: bool,
) -> bool:
    if is_all_day:
        if starts_on is None or ends_on is None:
            return False

        if event["is_all_day"]:
            return (
                event["starts_on"] < ends_on
                and event["ends_on"] > starts_on
            )

        event_start = _as_datetime(event["starts_at"]).date()
        event_end = _as_datetime(event["ends_at"]).date()

        return (
            event_start.isoformat() < ends_on
            and event_end.isoformat() >= starts_on
        )

    if starts_at is None or ends_at is None:
        return False

    if event["is_all_day"]:
        requested_start_date = starts_at.date().isoformat()
        requested_end_date = ends_at.date().isoformat()

        return (
            event["starts_on"] < requested_end_date
            and event["ends_on"] > requested_start_date
        )

    event_start = _as_datetime(event["starts_at"])
    event_end = _as_datetime(event["ends_at"])

    return event_start < ends_at and event_end > starts_at


def find_calendar_conflicts(
    *,
    user_id: str,
    starts_at: datetime | None,
    ends_at: datetime | None,
    starts_on: str | None,
    ends_on: str | None,
    is_all_day: bool,
    exclude_event_id: str | None = None,
) -> dict[str, Any]:
    try:
        supabase = _supabase()

        owned_calendars_response = (
            supabase.table("calendars")
            .select("id,name,color")
            .eq("owner_id", user_id)
            .eq("is_archived", False)
            .execute()
        )

        calendar_map = {
            calendar["id"]: calendar
            for calendar in (
                owned_calendars_response.data or []
            )
        }

        calendar_ids = list(calendar_map)

        events_by_id: dict[str, dict[str, Any]] = {}

        if calendar_ids:
            events_response = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("calendar_id", calendar_ids)
                .eq("status", "confirmed")
                .execute()
            )

            for event in events_response.data or []:
                events_by_id[event["id"]] = event

        attendee_response = (
            supabase.table("calendar_event_attendees")
            .select("event_id,response_status")
            .eq("attendee_user_id", user_id)
            .in_("response_status", ["pending", "accepted"])
            .execute()
        )

        attendee_event_ids = [
            row["event_id"]
            for row in attendee_response.data or []
            if row.get("event_id")
        ]

        if attendee_event_ids:
            attendee_events_response = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("id", attendee_event_ids)
                .eq("status", "confirmed")
                .execute()
            )

            for event in attendee_events_response.data or []:
                events_by_id[event["id"]] = event

        conflicts = []

        for event in events_by_id.values():
            if exclude_event_id and event["id"] == exclude_event_id:
                continue

            if not _event_overlaps(
                event=event,
                starts_at=starts_at,
                ends_at=ends_at,
                starts_on=starts_on,
                ends_on=ends_on,
                is_all_day=is_all_day,
            ):
                continue

            calendar = calendar_map.get(event["calendar_id"])

            conflicts.append(
                {
                    "event_id": event["id"],
                    "calendar_id": event["calendar_id"],
                    "calendar_name": (
                        calendar["name"]
                        if calendar
                        else "Calendario vinculado"
                    ),
                    "calendar_color": (
                        calendar["color"]
                        if calendar
                        else "#475569"
                    ),
                    "source": event["source"],
                    "event_kind": event["event_kind"],
                    "is_all_day": event["is_all_day"],
                    "starts_at": event["starts_at"],
                    "ends_at": event["ends_at"],
                    "starts_on": event["starts_on"],
                    "ends_on": event["ends_on"],
                    "details_hidden": True,
                }
            )

        conflicts.sort(
            key=lambda conflict: (
                conflict["starts_at"]
                or conflict["starts_on"]
                or ""
            )
        )

        return {
            "has_conflicts": bool(conflicts),
            "conflicts": conflicts,
            "count": len(conflicts),
        }

    except Exception as error:
        raise CalendarError(
            f"Could not detect calendar conflicts: {error}"
        ) from error