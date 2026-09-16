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
MIXED_REQUEST_RPC_NAME = "commerce_create_mixed_request"
MIXED_REQUEST_SUBMIT_RPC_NAME = "commerce_submit_mixed_request"
GET_REQUEST_DETAIL_RPC_NAME = "commerce_get_request_detail"
LIST_REQUESTS_RPC_NAME = "commerce_list_requests"


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


def _build_mixed_request_items(
    normalized_payload: dict[str, Any],
) -> list[dict[str, Any]]:
    raw_items = normalized_payload.get("items")

    if not isinstance(raw_items, list) or not raw_items:
        raise CommercialValidationError(
            "At least one request item is required.",
            code="REQUEST_ITEMS_REQUIRED",
        )

    items: list[dict[str, Any]] = []

    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise CommercialValidationError(
                "Each request item must be an object.",
                code="REQUEST_ITEM_INVALID",
            )

        offer_id = str(raw_item.get("commercial_offer_id") or "").strip()

        if not offer_id:
            raise CommercialValidationError(
                "commercial_offer_id is required.",
                code="REQUEST_ITEM_OFFER_ID_REQUIRED",
            )

        quantity = raw_item.get("quantity", 1)

        if isinstance(quantity, bool) or not isinstance(quantity, int):
            raise CommercialValidationError(
                "quantity must be a positive integer.",
                code="REQUEST_ITEM_QUANTITY_INVALID",
            )

        if quantity < 1 or quantity > 999:
            raise CommercialValidationError(
                "quantity must be between 1 and 999.",
                code="REQUEST_ITEM_QUANTITY_INVALID",
            )

        customer_note = str(
            raw_item.get("line_comment") or ""
        ).strip()

        item: dict[str, Any] = {
            "commercial_offer_id": offer_id,
            "quantity": quantity,
        }

        if customer_note:
            item["customer_note"] = customer_note

        items.append(item)

    return items


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

    if normalized_payload.get("request_type") == "mixed_request":
        mixed_items = _build_mixed_request_items(normalized_payload)

        draft_data = execute_commercial_rpc(
            access_token=token,
            function_name=MIXED_REQUEST_RPC_NAME,
            parameters={
                "p_commercial_profile_id": normalized_payload.get(
                    "commercial_profile_id"
                ),
                "p_customer_note": normalized_payload.get(
                    "customer_note"
                ),
                "p_delivery_address": normalized_payload.get(
                    "delivery_address"
                ),
                "p_delivery_reference": normalized_payload.get(
                    "delivery_reference"
                ),
                "p_idempotency_key": key,
                "p_items": mixed_items,
                "p_requested_modality": normalized_payload.get(
                    "requested_modality"
                ),
            },
        )

        if not isinstance(draft_data, dict):
            raise CommercialValidationError(
                "Mixed request creation RPC returned an invalid response.",
                code="COMMERCE_REQUEST_CREATE_FAILED",
            )

        request_id = str(draft_data.get("request_id") or "").strip()

        if not request_id:
            raise CommercialValidationError(
                "Mixed request creation RPC did not return request_id.",
                code="COMMERCE_REQUEST_CREATE_FAILED",
            )

        data = execute_commercial_rpc(
            access_token=token,
            function_name=MIXED_REQUEST_SUBMIT_RPC_NAME,
            parameters={
                "p_commerce_request_id": request_id,
                "p_idempotency_key": key,
            },
        )
    else:
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

def list_commercial_requests(
    *,
    access_token: str | None,
    statuses: list[str] | None = None,
    limit: int = 25,
    offset: int = 0,
) -> list[dict[str, Any]]:
    token = _normalized_access_token(access_token)

    normalized_statuses = [
        str(item).strip()
        for item in (statuses or [])
        if str(item).strip()
    ]

    data = execute_commercial_rpc(
        access_token=token,
        function_name=LIST_REQUESTS_RPC_NAME,
        parameters={
            "p_scope": "client",
            "p_statuses": normalized_statuses or None,
            "p_limit": int(limit),
            "p_offset": int(offset),
        },
    )

    if data is None:
        return []

    if not isinstance(data, list):
        raise CommercialValidationError(
            "Commercial requests RPC returned an invalid response.",
            code="COMMERCE_REQUEST_LIST_FAILED",
        )

    if not all(isinstance(item, dict) for item in data):
        raise CommercialValidationError(
            "Commercial requests RPC returned invalid rows.",
            code="COMMERCE_REQUEST_LIST_FAILED",
        )

    return data


def get_commercial_request_detail(
    *,
    access_token: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    token = _normalized_access_token(access_token)
    normalized_request_id = str(request_id or "").strip()

    if not normalized_request_id:
        raise CommercialValidationError(
            "Request id is required.",
            code="COMMERCE_REQUEST_ID_REQUIRED",
        )

    data = execute_commercial_rpc(
        access_token=token,
        function_name=GET_REQUEST_DETAIL_RPC_NAME,
        parameters={
            "p_commerce_request_id": normalized_request_id,
        },
    )

    if isinstance(data, list):
        data = data[0] if data else None

    if not isinstance(data, dict):
        raise CommercialValidationError(
            "Commercial request detail RPC returned an invalid response.",
            code="COMMERCE_REQUEST_DETAIL_FAILED",
        )

    if not str(data.get("id") or "").strip():
        raise CommercialValidationError(
            "Commercial request detail is missing its identifier.",
            code="COMMERCE_REQUEST_DETAIL_FAILED",
        )

    return data

