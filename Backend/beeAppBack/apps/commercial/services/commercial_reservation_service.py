from __future__ import annotations

from typing import Any
from uuid import UUID

from django.utils.dateparse import parse_datetime

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.commercial_supabase_service import (
    execute_commercial_rpc,
)

RPC_NAME = "commerce_create_reservation_hold"


def _parse_starts_at(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CommercialValidationError(
            code="reservation_starts_at_required",
            message="starts_at is required.",
        )

    parsed = parse_datetime(value.strip())
    if parsed is None:
        raise CommercialValidationError(
            code="reservation_starts_at_invalid",
            message="starts_at must be an ISO-8601 datetime.",
        )

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise CommercialValidationError(
            code="reservation_starts_at_timezone_required",
            message="starts_at must include a timezone offset.",
        )

    return parsed.isoformat()


def _normalize_timezone(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CommercialValidationError(
            code="reservation_timezone_required",
            message="timezone is required.",
        )

    timezone = value.strip()
    if len(timezone) > 100:
        raise CommercialValidationError(
            code="reservation_timezone_invalid",
            message="timezone must not exceed 100 characters.",
        )

    return timezone


def _extract_reservation_id(value: Any) -> str | None:
    if isinstance(value, dict):
        value = value.get("reservation_id") or value.get("id")

    if value is None:
        return None

    normalized = str(value).strip()
    return normalized or None


def create_commercial_reservation_hold(
    *,
    access_token: str | None,
    commerce_request_id: str | UUID,
    starts_at: object,
    timezone: object,
) -> dict[str, str]:
    normalized_starts_at = _parse_starts_at(starts_at)
    normalized_timezone = _normalize_timezone(timezone)

    result = execute_commercial_rpc(
        access_token=access_token,
        function_name=RPC_NAME,
        parameters={
            "p_commerce_request_id": str(commerce_request_id),
            "p_starts_at": normalized_starts_at,
            "p_timezone": normalized_timezone,
        },
    )

    reservation_id = _extract_reservation_id(result)
    if reservation_id is None:
        raise CommercialValidationError(
            code="reservation_hold_response_invalid",
            message="Reservation hold RPC returned an invalid response.",
        )

    return {
        "reservation_id": reservation_id,
        "request_id": str(commerce_request_id),
        "status": "hold",
    }
