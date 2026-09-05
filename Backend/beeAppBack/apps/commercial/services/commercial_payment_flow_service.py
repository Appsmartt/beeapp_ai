from __future__ import annotations

from typing import Any
from uuid import UUID

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialOperationError,
)
from apps.commercial.services.commercial_supabase_service import (
    execute_commercial_rpc,
)

REQUEST_PAYMENT_RPC = "commerce_request_payment"
REQUEST_PAYMENT_METHODS_RPC = "commerce_request_payment_methods"


def _normalized_access_token(access_token: str | None) -> str:
    token = str(access_token or "").strip()

    if not token:
        raise CommercialAuthenticationError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    return token


def _normalize_payment_method(row: Any) -> dict[str, Any]:
    if not isinstance(row, dict):
        raise CommercialOperationError(
            "Payment methods RPC returned an invalid response.",
            code="COMMERCIAL_PAYMENT_METHODS_RESPONSE_INVALID",
        )

    return {
        "id": str(row.get("id") or ""),
        "payment_method_type": row.get("payment_method_type"),
        "display_name": row.get("display_name"),
        "public_details": row.get("public_details") or {},
        "public_instructions": row.get("public_instructions"),
        "sort_order": row.get("sort_order"),
    }


def request_commercial_payment(
    *,
    access_token: str | None,
    commerce_request_id: str | UUID,
) -> dict[str, str]:
    token = _normalized_access_token(access_token)

    result = execute_commercial_rpc(
        access_token=token,
        function_name=REQUEST_PAYMENT_RPC,
        parameters={
            "p_commerce_request_id": str(commerce_request_id),
        },
    )

    request_id = str(result or "").strip()
    if not request_id:
        raise CommercialOperationError(
            "Payment request RPC returned an invalid response.",
            code="COMMERCIAL_PAYMENT_REQUEST_RESPONSE_INVALID",
        )

    return {
        "request_id": request_id,
        "status": "payment_pending",
    }


def list_commercial_request_payment_methods(
    *,
    access_token: str | None,
    commerce_request_id: str | UUID,
) -> dict[str, Any]:
    token = _normalized_access_token(access_token)

    result = execute_commercial_rpc(
        access_token=token,
        function_name=REQUEST_PAYMENT_METHODS_RPC,
        parameters={
            "p_commerce_request_id": str(commerce_request_id),
        },
    )

    if result is None:
        result = []

    if not isinstance(result, list):
        raise CommercialOperationError(
            "Payment methods RPC returned an invalid response.",
            code="COMMERCIAL_PAYMENT_METHODS_RESPONSE_INVALID",
        )

    return {
        "request_id": str(commerce_request_id),
        "payment_methods": [
            _normalize_payment_method(row)
            for row in result
        ],
    }
