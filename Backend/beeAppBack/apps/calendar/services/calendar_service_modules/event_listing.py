from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from apps.calendar.exceptions import CalendarError
from apps.calendar.services.calendar_service_modules.access import (
    get_user_attendee_row,
)
from apps.calendar.services.calendar_service_modules.calendar_management import (
    list_calendar_tags,
    list_calendars,
)
from apps.calendar.services.calendar_service_modules.calendar_preferences import (
    get_calendar_preferences,
)
from apps.calendar.services.calendar_service_modules.shared import (
    EVENT_COLUMNS,
    get_supabase,
    iso_datetime,
    response_data,
    to_string_list,
)

def list_calendar_events(
    *,
    user_id: str,
    range_start: datetime,
    range_end: datetime,
    calendar_ids: list[UUID] | None = None,
    source: str | None = None,
    event_kind: str | None = None,
    tag_ids: list[UUID] | None = None,
    include_cancelled: bool = False,
    include_declined: bool = True,
    search: str | None = None,
    limit: int = 500,
) -> dict[str, Any]:
    try:
        if range_start >= range_end:
            raise CalendarError(
                "range_end must be after range_start."
            )

        supabase = get_supabase()
        calendars = list_calendars(
            user_id=user_id,
            include_archived=False,
        )
        calendars_by_id = {
            calendar["id"]: calendar for calendar in calendars
        }
        available_calendar_ids = set(calendars_by_id)

        if calendar_ids:
            requested_calendar_ids = set(to_string_list(calendar_ids))
            selected_calendar_ids = list(
                available_calendar_ids.intersection(
                    requested_calendar_ids
                )
            )
        else:
            selected_calendar_ids = list(available_calendar_ids)

        events_by_id: dict[str, dict[str, Any]] = {}
        attendee_rows_by_event_id: dict[str, dict[str, Any]] = {}

        if selected_calendar_ids:
            timed_query = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("calendar_id", selected_calendar_ids)
                .eq("is_all_day", False)
                .lt("starts_at", iso_datetime(range_end))
                .gt("ends_at", iso_datetime(range_start))
            )
            all_day_query = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("calendar_id", selected_calendar_ids)
                .eq("is_all_day", True)
                .lt("starts_on", range_end.date().isoformat())
                .gt("ends_on", range_start.date().isoformat())
            )

            if not include_cancelled:
                timed_query = timed_query.eq("status", "confirmed")
                all_day_query = all_day_query.eq(
                    "status",
                    "confirmed",
                )

            if source:
                timed_query = timed_query.eq("source", source)
                all_day_query = all_day_query.eq("source", source)

            if event_kind:
                timed_query = timed_query.eq("event_kind", event_kind)
                all_day_query = all_day_query.eq(
                    "event_kind",
                    event_kind,
                )

            timed_response = (
                timed_query.order("starts_at").limit(limit).execute()
            )
            all_day_response = (
                all_day_query.order("starts_on").limit(limit).execute()
            )

            for event in (
                response_data(timed_response)
                + response_data(all_day_response)
            ):
                calendar = calendars_by_id.get(event["calendar_id"])

                if not calendar:
                    continue

                permission = calendar["share_permission"]

                if (
                    event["is_private"]
                    and permission != "owner"
                    and str(event["organizer_id"]) != str(user_id)
                ):
                    attendee = get_user_attendee_row(
                        event_id=event["id"],
                        user_id=user_id,
                    )

                    if not attendee:
                        continue

                    attendee_rows_by_event_id[event["id"]] = attendee

                events_by_id[event["id"]] = event

        attendee_rows_response = (
            supabase.table("calendar_event_attendees")
            .select(
                "event_id,response_status,hidden_at,"
                "attendee_kind,attendee_user_id"
            )
            .eq("attendee_user_id", user_id)
            .eq("attendee_kind", "beeapp_user")
            .neq("response_status", "removed")
            .execute()
        )

        for row in response_data(attendee_rows_response):
            event_id = row.get("event_id")

            if event_id:
                attendee_rows_by_event_id[event_id] = row

        attendee_event_ids = list(attendee_rows_by_event_id)

        if attendee_event_ids:
            attendee_events_response = (
                supabase.table("calendar_events")
                .select(EVENT_COLUMNS)
                .in_("id", attendee_event_ids)
                .execute()
            )

            for event in response_data(attendee_events_response):
                if not event_overlaps_range(
                    event=event,
                    range_start=range_start,
                    range_end=range_end,
                ):
                    continue

                if (
                    not include_cancelled
                    and event["status"] != "confirmed"
                ):
                    continue

                if source and event["source"] != source:
                    continue

                if event_kind and event["event_kind"] != event_kind:
                    continue

                events_by_id[event["id"]] = event

        events = list(events_by_id.values())
        visible_events: list[dict[str, Any]] = []

        for event in events:
            attendee = attendee_rows_by_event_id.get(event["id"])

            if (
                attendee
                and attendee.get("response_status") == "declined"
            ):
                if attendee.get("hidden_at") is not None:
                    continue

                if not include_declined:
                    continue

            visible_events.append(event)

        events = visible_events

        if tag_ids and events:
            requested_tag_ids = set(to_string_list(tag_ids))
            assignments_response = (
                supabase.table("calendar_event_tag_assignments")
                .select("event_id,tag_id")
                .in_("event_id", [event["id"] for event in events])
                .in_("tag_id", list(requested_tag_ids))
                .execute()
            )
            matching_event_ids = {
                assignment["event_id"]
                for assignment in response_data(assignments_response)
            }
            events = [
                event
                for event in events
                if event["id"] in matching_event_ids
            ]

        if search:
            normalized_search = search.lower().strip()
            events = [
                event
                for event in events
                if event_matches_search(
                    event=event,
                    search=normalized_search,
                )
            ]

        events.sort(
            key=lambda event: (
                event["starts_at"] or event["starts_on"],
                event["created_at"],
            )
        )

        return {
            "events": events[:limit],
            "count": min(len(events), limit),
            "range_start": iso_datetime(range_start),
            "range_end": iso_datetime(range_end),
        }

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            f"Could not retrieve calendar events: {error}"
        ) from error


def get_calendar_bootstrap(
    *,
    user_id: str,
    range_start: datetime,
    range_end: datetime,
) -> dict[str, Any]:
    preferences = get_calendar_preferences(user_id=user_id)
    calendars = list_calendars(user_id=user_id)
    tags = list_calendar_tags(user_id=user_id)
    events = list_calendar_events(
        user_id=user_id,
        range_start=range_start,
        range_end=range_end,
        include_declined=preferences["show_declined_events"],
    )

    return {
        "preferences": preferences,
        "calendars": calendars,
        "tags": tags,
        **events,
    }


def event_overlaps_range(
    *,
    event: dict[str, Any],
    range_start: datetime,
    range_end: datetime,
) -> bool:
    if event["is_all_day"]:
        starts_on = as_date(event.get("starts_on"))
        ends_on = as_date(event.get("ends_on"))

        if starts_on is None or ends_on is None:
            return False

        return (
            starts_on < range_end.date()
            and ends_on > range_start.date()
        )

    starts_at = as_datetime(event.get("starts_at"))
    ends_at = as_datetime(event.get("ends_at"))

    if starts_at is None or ends_at is None:
        return False

    return starts_at < range_end and ends_at > range_start


def event_matches_search(
    *,
    event: dict[str, Any],
    search: str,
) -> bool:
    values = (
        event.get("title"),
        event.get("description"),
        event.get("custom_type_name"),
        event.get("location_name"),
        event.get("location_address"),
    )

    return any(
        search in str(value).lower()
        for value in values
        if value
    )


def as_datetime(
    value: datetime | str | None,
) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def as_date(
    value: date | datetime | str | None,
) -> date | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    return date.fromisoformat(value)
