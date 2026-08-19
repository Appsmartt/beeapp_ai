from __future__ import annotations

from datetime import date, datetime
from typing import Any, Protocol


class CalendarProviderError(Exception):
    """Error devuelto por Google Calendar o Microsoft Graph."""


class ExternalCalendarProvider(Protocol):
    provider: str

    def list_calendars(
        self,
        *,
        access_token: str,
    ) -> list[dict[str, Any]]:
        ...

    def list_events(
        self,
        *,
        access_token: str,
        provider_calendar_id: str,
        range_start: datetime,
        range_end: datetime,
    ) -> list[dict[str, Any]]:
        ...


def normalize_hex_color(
    value: str | None,
    fallback: str = "#2563EB",
) -> str:
    if not value:
        return fallback

    normalized = value.strip()

    if (
        len(normalized) == 7
        and normalized.startswith("#")
        and all(
            character in "0123456789abcdefABCDEF"
            for character in normalized[1:]
        )
    ):
        return normalized.upper()

    return fallback


def normalize_provider_timezone(
    value: str | None,
    fallback: str = "America/Bogota",
) -> str:
    normalized = (value or "").strip()
    return normalized or fallback


def normalize_provider_datetime(
    value: str | None,
) -> str | None:
    if not value:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    if normalized.endswith("Z"):
        return normalized

    return normalized


def normalize_provider_date(
    value: str | None,
) -> str | None:
    if not value:
        return None

    normalized = value.strip()

    if len(normalized) != 10:
        return None

    try:
        date.fromisoformat(normalized)
    except ValueError:
        return None

    return normalized


def ensure_normalized_event(
    *,
    provider: str,
    raw_event: dict[str, Any],
) -> dict[str, Any]:
    """
    Contrato común para el bloque 6B.

    timed:
      is_all_day=false
      starts_at / ends_at son ISO 8601

    all-day:
      is_all_day=true
      starts_on / ends_on usan rango semiabierto [inicio, fin)
    """

    required_fields = (
        "provider_event_id",
        "title",
        "is_all_day",
    )

    for field_name in required_fields:
        if raw_event.get(field_name) in (None, ""):
            raise CalendarProviderError(
                f"{provider.title()} event missing {field_name}."
            )

    is_all_day = bool(raw_event["is_all_day"])

    if is_all_day:
        starts_on = normalize_provider_date(
            raw_event.get("starts_on")
        )
        ends_on = normalize_provider_date(
            raw_event.get("ends_on")
        )

        if not starts_on or not ends_on:
            raise CalendarProviderError(
                f"{provider.title()} all-day event has invalid dates."
            )

        return {
            **raw_event,
            "provider": provider,
            "is_all_day": True,
            "starts_at": None,
            "ends_at": None,
            "starts_on": starts_on,
            "ends_on": ends_on,
            "timezone": normalize_provider_timezone(
                raw_event.get("timezone")
            ),
        }

    starts_at = normalize_provider_datetime(
        raw_event.get("starts_at")
    )
    ends_at = normalize_provider_datetime(
        raw_event.get("ends_at")
    )

    if not starts_at or not ends_at:
        raise CalendarProviderError(
            f"{provider.title()} timed event has invalid dates."
        )

    return {
        **raw_event,
        "provider": provider,
        "is_all_day": False,
        "starts_at": starts_at,
        "ends_at": ends_at,
        "starts_on": None,
        "ends_on": None,
        "timezone": normalize_provider_timezone(
            raw_event.get("timezone")
        ),
    }