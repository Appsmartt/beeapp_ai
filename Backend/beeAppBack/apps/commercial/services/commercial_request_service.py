from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_supabase_service import (
    execute_commercial_rpc,
)


RPC_NAME = "commerce_create_request"


def _normalized_access_token(access_token: str | None) -> str:
    token = str(access_token or "").strip()

    if not token:
        raise CommercialAuthenticationError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    return token


def _normalized_idempotency_key(idempotency_key: str | None) -> str:
    key = str(idempotency_key or "").strip()

    if not key:
        raise CommercialValidationError(
            "Idempotency-Key header is required.",
            code="IDEMPOTENCY_KEY_REQUIRED",
        )

    if len(key) > 200:
        raise CommercialValidationError(
            "Idempotency-Key must have at most 200 characters.",
            code="IDEMPOTENCY_KEY_TOO_LONG",
        )

    return key


def normalize_json_payload(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, UUID):
        return str(value)

    if isinstance(value, Decimal):
        return str(value)

    if isinstance(value, (date, datetime)):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            str(key): normalize_json_payload(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple, set)):
        return [normalize_json_payload(item) for item in value]

    raise CommercialValidationError(
        "Request payload contains an unsupported JSON value.",
        code="REQUEST_PAYLOAD_INVALID",
    )


def create_commercial_request(
    *,
    access_token: str | None,
    idempotency_key: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    token = _normalized_access_token(access_token)
    key = _normalized_idempotency_key(idempotency_key)

    if not isinstance(payload, dict):
        raise CommercialValidationError(
            "Request payload must be an object.",
            code="REQUEST_PAYLOAD_INVALID",
        )

    normalized_payload = normalize_json_payload(payload)

    try:
        json.dumps(normalized_payload, ensure_ascii=False)
    except (TypeError, ValueError) as error:
        raise CommercialValidationError(
            "Request payload must be JSON serializable.",
            code="REQUEST_PAYLOAD_INVALID",
        ) from error

    data = execute_commercial_rpc(
        access_token=token,
        function_name=RPC_NAME,
        parameters={
            "p_idempotency_key": key,
            "p_request_payload": normalized_payload,
        },
    )

    if not isinstance(data, dict):
        raise CommercialValidationError(
            "Commercial request RPC returned an invalid response.",
            code="COMMERCE_REQUEST_CREATE_FAILED",
        )

    return data
