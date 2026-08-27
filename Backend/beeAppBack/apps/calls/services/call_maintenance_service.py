from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.calls.exceptions import CallError, CallValidationError


DEFAULT_EXPIRATION_BATCH_SIZE = 100
MAX_EXPIRATION_BATCH_SIZE = 500


def expire_ringing_direct_calls(
    *,
    limit: object = DEFAULT_EXPIRATION_BATCH_SIZE,
) -> list[dict[str, Any]]:
    try:
        normalized_limit = int(limit)
    except (TypeError, ValueError) as error:
        raise CallValidationError(
            "Expiration limit must be an integer."
        ) from error

    if (
        normalized_limit < 1
        or normalized_limit > MAX_EXPIRATION_BATCH_SIZE
    ):
        raise CallValidationError(
            "Expiration limit must be between 1 and 500."
        )

    try:
        response = execute_with_supabase_admin_retry(
            lambda supabase: supabase.rpc(
                "expire_ringing_direct_calls",
                {
                    "p_limit": normalized_limit,
                },
            ).execute()
        )
    except CallError:
        raise
    except Exception as error:
        raise CallError(
            "Could not expire ringing direct calls.",
            code="CALL_EXPIRATION_FAILED",
        ) from error

    data = getattr(response, "data", None)

    if data is None:
        return []

    if not isinstance(data, list):
        raise CallError(
            "Unexpected response while expiring direct calls.",
            code="CALL_EXPIRATION_RESPONSE_INVALID",
        )

    if not all(isinstance(row, dict) for row in data):
        raise CallError(
            "Unexpected response while expiring direct calls.",
            code="CALL_EXPIRATION_RESPONSE_INVALID",
        )

    return data
