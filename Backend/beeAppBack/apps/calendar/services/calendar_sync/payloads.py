from __future__ import annotations

from typing import Any

from apps.calendar.exceptions import CalendarError

from .constants import utc_now_iso
from .normalization import (
    build_normalized_event_fields,
    normalize_event_color,
    normalize_event_kind,
    normalize_event_status,
)


def get_beeapp_calendar_id(
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


def external_event_metadata(
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
            "last_synced_at": utc_now_iso(),
        }
    )

    return normalized_metadata


def build_external_event_payload(
    *,
    integration: dict[str, Any],
    external_calendar: dict[str, Any],
    provider_event: dict[str, Any],
) -> dict[str, Any]:
    normalized_fields = build_normalized_event_fields(
        provider_event,
        external_calendar,
    )

    return {
        "calendar_id": get_beeapp_calendar_id(external_calendar),
        "organizer_id": integration["user_id"],
        "source": integration["provider"],
        "status": normalize_event_status(
            provider_event.get("status")
        ),
        "event_kind": normalize_event_kind(
            provider_event.get("event_kind")
        ),
        "custom_type_name": None,
        "title": normalized_fields["title"],
        "description": normalized_fields["description"],
        "color": normalize_event_color(
            external_calendar=external_calendar,
        ),
        "is_all_day": bool(provider_event["is_all_day"]),
        "starts_at": provider_event.get("starts_at"),
        "ends_at": provider_event.get("ends_at"),
        "starts_on": provider_event.get("starts_on"),
        "ends_on": provider_event.get("ends_on"),
        "timezone": normalized_fields["timezone"],
        "location_name": normalized_fields["location_name"],
        "location_address": normalized_fields[
            "location_address"
        ],
        "location_maps_url": normalized_fields[
            "location_maps_url"
        ],
        "is_private": False,
        "notifications_enabled": False,
        "external_calendar_id": external_calendar["id"],
        "provider_event_id": normalized_fields[
            "provider_event_id"
        ],
        "provider_change_key": normalized_fields[
            "provider_change_key"
        ],
        "provider_updated_at": provider_event.get(
            "provider_updated_at"
        ),
        "metadata": external_event_metadata(
            integration=integration,
            external_calendar=external_calendar,
            provider_event=provider_event,
        ),
    }
