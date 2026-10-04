from __future__ import annotations

from typing import Any

from apps.calendar.services.calendar_provider_service import (
    normalize_hex_color,
)

from .constants import (
    BEEAPP_EVENT_COLORS,
    MAX_DESCRIPTION_LENGTH,
    MAX_LOCATION_ADDRESS_LENGTH,
    MAX_LOCATION_MAPS_URL_LENGTH,
    MAX_LOCATION_NAME_LENGTH,
    MAX_PROVIDER_IDENTIFIER_LENGTH,
    MAX_TIMEZONE_LENGTH,
    MAX_TITLE_LENGTH,
)


def normalize_text(
    value: Any,
    *,
    max_length: int,
    fallback: str | None = None,
) -> str | None:
    if value is None:
        return fallback

    normalized = str(value).strip()

    if not normalized:
        return fallback

    return normalized[:max_length]


def normalize_event_status(value: Any) -> str:
    if str(value or "").strip().lower() == "cancelled":
        return "cancelled"

    return "confirmed"


def normalize_event_kind(value: Any) -> str:
    normalized = str(value or "").strip().lower()

    if normalized in {"virtual", "in_person"}:
        return normalized

    return "in_person"


def stable_color_from_seed(seed: str) -> str:
    hash_value = 0

    for character in seed:
        hash_value = (
            (hash_value * 31) + ord(character)
        ) & 0xFFFFFFFF

    return BEEAPP_EVENT_COLORS[
        hash_value % len(BEEAPP_EVENT_COLORS)
    ]


def normalize_event_color(
    *,
    external_calendar: dict[str, Any],
) -> str:
    candidate_color = (
        external_calendar.get("display_color")
        or external_calendar.get("provider_color")
    )

    normalized_color = normalize_hex_color(
        candidate_color,
        fallback="",
    )

    if normalized_color in BEEAPP_EVENT_COLORS:
        return normalized_color

    return stable_color_from_seed(
        str(external_calendar["id"])
    )


def normalize_provider_event_id(
    provider_event: dict[str, Any],
) -> str:
    provider_event_id = normalize_text(
        provider_event.get("provider_event_id"),
        max_length=MAX_PROVIDER_IDENTIFIER_LENGTH,
    )

    if not provider_event_id:
        from apps.calendar.exceptions import CalendarError

        raise CalendarError(
            "External event is missing its provider identifier."
        )

    return provider_event_id


def build_normalized_event_fields(
    provider_event: dict[str, Any],
    external_calendar: dict[str, Any],
) -> dict[str, Any]:
    timezone_name = normalize_text(
        provider_event.get("timezone"),
        max_length=MAX_TIMEZONE_LENGTH,
        fallback=(
            normalize_text(
                external_calendar.get("timezone"),
                max_length=MAX_TIMEZONE_LENGTH,
                fallback="America/Bogota",
            )
            or "America/Bogota"
        ),
    )

    return {
        "provider_event_id": normalize_provider_event_id(
            provider_event
        ),
        "title": normalize_text(
            provider_event.get("title"),
            max_length=MAX_TITLE_LENGTH,
            fallback="Sin título",
        ),
        "description": normalize_text(
            provider_event.get("description"),
            max_length=MAX_DESCRIPTION_LENGTH,
        ),
        "timezone": timezone_name,
        "location_name": normalize_text(
            provider_event.get("location_name"),
            max_length=MAX_LOCATION_NAME_LENGTH,
        ),
        "location_address": normalize_text(
            provider_event.get("location_address"),
            max_length=MAX_LOCATION_ADDRESS_LENGTH,
        ),
        "location_maps_url": normalize_text(
            provider_event.get("location_maps_url"),
            max_length=MAX_LOCATION_MAPS_URL_LENGTH,
        ),
        "provider_change_key": normalize_text(
            provider_event.get("provider_change_key"),
            max_length=MAX_PROVIDER_IDENTIFIER_LENGTH,
        ),
    }


def is_incomplete_cancelled_event(
    provider_event: dict[str, Any],
) -> bool:
    if normalize_event_status(
        provider_event.get("status")
    ) != "cancelled":
        return False

    if provider_event.get("is_all_day") is True:
        return not (
            provider_event.get("starts_on")
            and provider_event.get("ends_on")
        )

    return not (
        provider_event.get("starts_at")
        and provider_event.get("ends_at")
    )
