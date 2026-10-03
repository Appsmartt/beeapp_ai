from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import CalendarEventCreateError
from apps.calendar.services.calendar_service_modules.shared import (
    get_supabase,
    iso_date,
    iso_datetime,
    response_data,
)


def build_event_payload(
    *,
    user_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    return {
        "calendar_id": str(payload["calendar_id"]),
        "organizer_id": user_id,
        "source": "beeapp",
        "status": "confirmed",
        "event_kind": payload["event_kind"],
        "custom_type_name": payload.get("custom_type_name"),
        "title": payload["title"],
        "description": payload.get("description") or None,
        "color": payload["color"],
        "is_all_day": payload["is_all_day"],
        "starts_at": iso_datetime(payload.get("starts_at")),
        "ends_at": iso_datetime(payload.get("ends_at")),
        "starts_on": iso_date(payload.get("starts_on")),
        "ends_on": iso_date(payload.get("ends_on")),
        "timezone": payload["timezone"],
        "location_name": payload.get("location_name") or None,
        "location_address": (
            payload.get("location_address") or None
        ),
        "location_maps_url": (
            payload.get("location_maps_url") or None
        ),
        "is_private": payload["is_private"],
        "notifications_enabled": payload[
            "notifications_enabled"
        ],
    }


def build_event_update_payload(
    *,
    payload: dict[str, Any],
) -> dict[str, Any]:
    field_names = (
        "calendar_id",
        "title",
        "description",
        "event_kind",
        "custom_type_name",
        "color",
        "is_all_day",
        "timezone",
        "location_name",
        "location_address",
        "location_maps_url",
        "is_private",
        "notifications_enabled",
    )

    event_payload = {
        field_name: (
            str(payload[field_name])
            if field_name == "calendar_id"
            else payload[field_name]
        )
        for field_name in field_names
        if field_name in payload
    }

    if "starts_at" in payload:
        event_payload["starts_at"] = iso_datetime(
            payload["starts_at"]
        )

    if "ends_at" in payload:
        event_payload["ends_at"] = iso_datetime(
            payload["ends_at"]
        )

    if "starts_on" in payload:
        event_payload["starts_on"] = iso_date(
            payload["starts_on"]
        )

    if "ends_on" in payload:
        event_payload["ends_on"] = iso_date(
            payload["ends_on"]
        )

    for field_name in (
        "description",
        "custom_type_name",
        "location_name",
        "location_address",
        "location_maps_url",
    ):
        if field_name in event_payload:
            event_payload[field_name] = (
                event_payload[field_name] or None
            )

    return event_payload


def validate_beeapp_users_exist(
    *,
    attendee_ids: list[str],
) -> None:
    normalized_ids = list(dict.fromkeys(attendee_ids))

    if not normalized_ids:
        return

    try:
        response = (
            get_supabase()
            .table("profile")
            .select("id")
            .in_("id", normalized_ids)
            .execute()
        )

        found_ids = {
            str(profile["id"])
            for profile in response_data(response)
        }

        missing_ids = set(normalized_ids).difference(found_ids)

        if missing_ids:
            raise CalendarEventCreateError(
                "One or more attendees were not found."
            )

    except CalendarEventCreateError:
        raise

    except Exception as error:
        raise CalendarEventCreateError(
            "Could not validate event attendees."
        ) from error
