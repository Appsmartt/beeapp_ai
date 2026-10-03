from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import CalendarEventUpdateError
from apps.calendar.services.calendar_service_modules.shared import (
    extract_single,
    get_supabase,
    iso_datetime,
    response_data,
)
def create_event_conferences(
    *,
    event_id: str,
    conferences: list[dict[str, Any]],
) -> None:
    if not conferences:
        return

    primary_exists = any(
        conference.get("is_primary")
        for conference in conferences
    )
    rows = [
        {
            "event_id": event_id,
            "provider": conference.get("provider", "external"),
            "label": conference.get("label") or None,
            "join_url": conference["join_url"],
            "is_primary": (
                conference.get("is_primary", False)
                or (index == 0 and not primary_exists)
            ),
            "status": "active",
        }
        for index, conference in enumerate(conferences)
    ]

    try:
        response = (
            get_supabase()
            .table("calendar_event_conferences")
            .insert(rows)
            .execute()
        )

        if len(response_data(response)) != len(rows):
            raise CalendarEventUpdateError(
                "Could not save all conference links."
            )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not save conference links."
        ) from error


def replace_event_conferences(
    *,
    event_id: str,
    conferences: list[dict[str, Any]],
) -> None:
    try:
        get_supabase().table(
            "calendar_event_conferences"
        ).update(
            {
                "status": "revoked",
                "is_primary": False,
            }
        ).eq(
            "event_id",
            event_id,
        ).eq(
            "status",
            "active",
        ).execute()

        create_event_conferences(
            event_id=event_id,
            conferences=conferences,
        )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not replace conference links."
        ) from error


def create_event_recurrence(
    *,
    event_id: str,
    recurrence: dict[str, Any],
    fallback_timezone: str,
) -> None:
    payload = {
        "event_id": event_id,
        "rrule": recurrence["rrule"],
        "frequency": recurrence["frequency"],
        "interval_count": recurrence["interval_count"],
        "week_days": recurrence.get("week_days"),
        "month_day": recurrence.get("month_day"),
        "nth_weekday": recurrence.get("nth_weekday"),
        "until_at": iso_datetime(recurrence.get("until_at")),
        "occurrence_count": recurrence.get("occurrence_count"),
        "timezone": recurrence.get("timezone") or fallback_timezone,
    }

    try:
        response = (
            get_supabase()
            .table("calendar_event_recurrences")
            .insert(payload)
            .execute()
        )

        if not extract_single(response):
            raise CalendarEventUpdateError(
                "Could not save recurrence."
            )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not save recurrence."
        ) from error


def replace_event_recurrence(
    *,
    event_id: str,
    recurrence: dict[str, Any] | None,
    fallback_timezone: str,
) -> None:
    try:
        get_supabase().table(
            "calendar_event_recurrences"
        ).delete().eq(
            "event_id",
            event_id,
        ).execute()

        if recurrence is None:
            return

        create_event_recurrence(
            event_id=event_id,
            recurrence=recurrence,
            fallback_timezone=fallback_timezone,
        )

    except CalendarEventUpdateError:
        raise

    except Exception as error:
        raise CalendarEventUpdateError(
            "Could not replace recurrence."
        ) from error
