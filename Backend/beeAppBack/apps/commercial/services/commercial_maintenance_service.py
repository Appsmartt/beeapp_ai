from __future__ import annotations

import logging
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.commercial.exceptions import (
    CommercialOperationError,
    CommercialValidationError,
)

logger = logging.getLogger(__name__)

DEFAULT_EXPIRATION_BATCH_SIZE = 100
MAX_EXPIRATION_BATCH_SIZE = 1000


def _validate_limit(limit: int) -> int:
    if not isinstance(limit, int) or isinstance(limit, bool):
        raise CommercialValidationError(
            "Expiration limit must be an integer.",
            code="COMMERCIAL_EXPIRATION_LIMIT_INVALID",
        )

    if limit < 1 or limit > MAX_EXPIRATION_BATCH_SIZE:
        raise CommercialValidationError(
            (
                "Expiration limit must be between 1 and "
                f"{MAX_EXPIRATION_BATCH_SIZE}."
            ),
            code="COMMERCIAL_EXPIRATION_LIMIT_INVALID",
        )

    return limit


def _rows(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)

    if data is None:
        return []

    if isinstance(data, list):
        return [
            row
            for row in data
            if isinstance(row, dict)
        ]

    if isinstance(data, dict):
        return [data]

    raise CommercialOperationError(
        "Commercial expiration RPC returned an invalid response.",
        code="COMMERCIAL_EXPIRATION_RESPONSE_INVALID",
    )


def expire_commercial_reservation_holds(
    *,
    limit: int = DEFAULT_EXPIRATION_BATCH_SIZE,
) -> list[dict[str, Any]]:
    validated_limit = _validate_limit(limit)

    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "commerce_expire_reservation_holds",
                {"p_limit": validated_limit},
            )
            .execute()
        )
    except Exception as error:
        logger.exception(
            "Commercial reservation hold expiration failed: %s",
            str(error),
        )
        raise CommercialOperationError(
            "Could not expire commercial reservation holds.",
            code="COMMERCIAL_RESERVATION_HOLD_EXPIRATION_FAILED",
        ) from error

    return _rows(response)


def expire_commercial_submitted_requests(
    *,
    limit: int = DEFAULT_EXPIRATION_BATCH_SIZE,
) -> list[dict[str, Any]]:
    validated_limit = _validate_limit(limit)

    try:
        response = (
            get_supabase_admin_client()
            .rpc(
                "commerce_expire_submitted_requests",
                {"p_limit": validated_limit},
            )
            .execute()
        )
    except Exception as error:
        logger.exception(
            "Commercial request expiration failed: %s",
            str(error),
        )
        raise CommercialOperationError(
            "Could not expire commercial requests.",
            code="COMMERCIAL_REQUEST_EXPIRATION_FAILED",
        ) from error

    return _rows(response)


def run_commercial_expirations(
    *,
    limit: int = DEFAULT_EXPIRATION_BATCH_SIZE,
) -> dict[str, Any]:
    validated_limit = _validate_limit(limit)

    expired_reservations = expire_commercial_reservation_holds(
        limit=validated_limit,
    )
    expired_requests = expire_commercial_submitted_requests(
        limit=validated_limit,
    )

    return {
        "expired_reservation_holds": expired_reservations,
        "expired_requests": expired_requests,
        "expired_reservation_hold_count": len(expired_reservations),
        "expired_request_count": len(expired_requests),
    }
