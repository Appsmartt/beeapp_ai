from __future__ import annotations

from datetime import datetime
from typing import Any

from apps.calendar.exceptions import CalendarEventCreateError
from apps.calendar.services.calendar_service_modules.shared import (
    get_supabase,
    iso_date,
)


def delete_event_safely(
    *,
    event_id: str,
) -> None:
    try:
        get_supabase().table("calendar_events").delete().eq(
            "id",
            event_id,
        ).execute()
    except Exception:
        return


def validate_duplicate_payload(
    payload: dict[str, Any],
) -> None:
    is_all_day = payload["is_all_day"]

    if is_all_day:
        starts_on = iso_date(payload.get("starts_on"))
        ends_on = iso_date(payload.get("ends_on"))

        if (
            starts_on is None
            or ends_on is None
            or payload.get("starts_at") is not None
            or payload.get("ends_at") is not None
        ):
            raise CalendarEventCreateError(
                "All-day duplicate requires starts_on and ends_on."
            )

        if starts_on >= ends_on:
            raise CalendarEventCreateError(
                "Duplicate ends_on must be after starts_on."
            )

        return

    starts_at = as_datetime(payload.get("starts_at"))
    ends_at = as_datetime(payload.get("ends_at"))

    if (
        starts_at is None
        or ends_at is None
        or payload.get("starts_on") is not None
        or payload.get("ends_on") is not None
    ):
        raise CalendarEventCreateError(
            "Timed duplicate requires starts_at and ends_at."
        )

    if starts_at >= ends_at:
        raise CalendarEventCreateError(
            "Duplicate ends_at must be after starts_at."
        )


def as_datetime(
    value: datetime | str | None,
) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    return datetime.fromisoformat(value.replace("Z", "+00:00"))
