from __future__ import annotations

import logging
import re
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_user_client,
)

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialAuthenticationError,
    CommercialConflictError,
    CommercialError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)


logger = logging.getLogger(__name__)


def get_commercial_user_supabase_client(
    *,
    access_token: str,
):
    return get_supabase_user_client(
        access_token=access_token,
    )


def extract_rpc_data(response) -> Any:
    return getattr(response, "data", None) if response else None


def extract_rpc_row(
    response,
) -> dict[str, Any]:
    data = extract_rpc_data(response)

    if isinstance(data, list):
        if not data:
            raise CommercialNotFoundError(
                "Commercial resource was not found."
            )

        data = data[0]

    if not isinstance(data, dict):
        raise CommercialOperationError(
            "Unexpected response from commercial service.",
            code="COMMERCIAL_RPC_RESPONSE_INVALID",
        )

    return data


def extract_commercial_error_code(
    message: str,
) -> str | None:
    match = re.search(
        r"\b(?:COMMERCE|COMMERCIAL)_[A-Z0-9_]+\b",
        str(message or "").upper(),
    )

    return match.group(0) if match else None


def translate_commercial_rpc_error(
    error: Exception,
) -> CommercialError:
    message = str(error)
    normalized = message.upper()
    error_code = extract_commercial_error_code(message)

    if "AUTHENTICATION_REQUIRED" in normalized:
        return CommercialAuthenticationError(
            "A valid user access token is required.",
            code=error_code or "AUTHENTICATION_REQUIRED",
        )

    if any(
        marker in normalized
        for marker in (
            "NOT_OWNED_BY_USER",
            "NOT_AUTHORIZED",
            "CUSTOMER_REQUIRED",
            "OWNER_REQUIRED",
            "PARTY_REQUIRED",
            "ACTOR_NOT_ALLOWED",
            "ADMIN_REQUIRED",
            "PROFILE_MISMATCH",
            "FILE_NOT_OWNED",
            "FILE_NOT_ACCESSIBLE",
        )
    ):
        return CommercialAccessError(
            "You are not allowed to perform this commercial action.",
            code=error_code or "COMMERCIAL_NOT_AUTHORIZED",
        )

    if any(
        marker in normalized
        for marker in (
            "BOOKING_HOLD_EXPIRED",
            "INVENTORY_HOLD_EXPIRED",
            "HOLD_ACTIVE",
            "HOLD_EXPIRED",
            "SLOT_UNAVAILABLE",
            "INVENTORY_UNAVAILABLE",
            "INSUFFICIENT_STOCK",
            "CONFLICT",
            "DUPLICATE",
            "ALREADY_EXISTS",
        )
    ):
        return CommercialConflictError(
            "The commercial action conflicts with current data.",
            code=error_code or "COMMERCIAL_CONFLICT",
        )

    if any(
        marker in normalized
        for marker in (
            "EXPIRED",
            "STATE_INVALID",
            "INVALID_TRANSITION",
            "ALREADY_ACCEPTED",
            "ALREADY_COMPLETED",
            "ALREADY_CANCELLED",
            "PAYMENT_ALREADY_REPORTED",
            "PROPOSAL_NOT_PENDING",
            "PROPOSAL_ALREADY_RESOLVED",
        )
    ):
        return CommercialStateError(
            "This commercial resource is not available for that action.",
            code=error_code or "COMMERCIAL_STATE_INVALID",
        )

    if any(
        marker in normalized
        for marker in (
            "NOT_FOUND",
            "NOT_AVAILABLE",
            "NOT_PUBLIC",
            "NOT_PUBLISHED",
            "NOT_ACTIVE",
            "NOT_ELIGIBLE",
        )
    ):
        return CommercialNotFoundError(
            "Commercial resource was not found or is unavailable.",
            code=error_code or "COMMERCIAL_RESOURCE_NOT_FOUND",
        )

    if any(
        marker in normalized
        for marker in (
            "VALIDATION",
            "REQUIRED",
            "INVALID",
            "MIXED_BUSINESS",
            "QUANTITY",
            "MODALITY",
            "PRICE",
            "DURATION",
            "FILE_TYPE",
            "FILE_SIZE",
        )
    ):
        return CommercialValidationError(
            "Commercial request data is invalid.",
            code=error_code or "COMMERCIAL_VALIDATION_ERROR",
        )

    return CommercialOperationError(
        "Commercial service request failed.",
        code=error_code or "COMMERCIAL_OPERATION_FAILED",
    )


def execute_commercial_rpc(
    *,
    access_token: str,
    function_name: str,
    parameters: dict[str, Any],
) -> Any:
    normalized_token = str(access_token or "").strip()

    if not normalized_token:
        raise CommercialAuthenticationError(
            "A valid user access token is required."
        )

    try:
        response = (
            get_commercial_user_supabase_client(
                access_token=normalized_token,
            )
            .rpc(function_name, parameters)
            .execute()
        )
    except CommercialError:
        raise
    except Exception as error:
        logger.exception(
            "Supabase commercial RPC failed: function=%s error=%s",
            function_name,
            str(error),
        )
        raise translate_commercial_rpc_error(error) from error

    return extract_rpc_data(response)
