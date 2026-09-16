from __future__ import annotations

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


def _required_token(access_token: str | None) -> str:
    token = str(access_token or "").strip()
    if not token:
        raise CommercialAuthenticationError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )
    return token


def _required_id(value: str | UUID | None, *, field: str) -> str:
    normalized = str(value or "").strip()
    if not normalized:
        raise CommercialValidationError(
            f"{field} is required.",
            code=f"{field.upper()}_REQUIRED",
        )
    return normalized


def _optional_text(value: str | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _normalize_json_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {
            str(key): _normalize_json_value(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple, set)):
        return [_normalize_json_value(item) for item in value]
    raise CommercialValidationError(
        "Commercial request item payload is invalid.",
        code="COMMERCE_REQUEST_ITEM_PAYLOAD_INVALID",
    )


def _json_result(
    result: Any,
    *,
    code: str,
    message: str,
) -> dict[str, Any]:
    if isinstance(result, list):
        result = result[0] if result else None
    if not isinstance(result, dict):
        raise CommercialValidationError(message, code=code)
    return result


def create_commercial_request_item_proposal(
    *,
    access_token: str | None,
    item_id: str | UUID | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    token = _required_token(access_token)
    normalized_item_id = _required_id(
        item_id,
        field="commerce_request_item_id",
    )
    if not isinstance(payload, dict):
        raise CommercialValidationError(
            "Commercial request item proposal payload is invalid.",
            code="COMMERCE_ITEM_PROPOSAL_PAYLOAD_INVALID",
        )

    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_create_item_proposal",
        parameters={
            "p_commerce_request_item_id": normalized_item_id,
            "p_proposed_quantity": payload.get("proposed_quantity"),
            "p_proposed_unit_price_amount": payload.get(
                "proposed_unit_price_amount"
            ),
            "p_requested_modality": payload.get("requested_modality"),
            "p_proposed_starts_at": (
                payload["proposed_starts_at"].isoformat()
                if payload.get("proposed_starts_at") is not None
                else None
            ),
            "p_proposed_ends_at": (
                payload["proposed_ends_at"].isoformat()
                if payload.get("proposed_ends_at") is not None
                else None
            ),
            "p_timezone": _optional_text(payload.get("timezone")),
            "p_note": _optional_text(payload.get("note")),
        },
    )
    return _json_result(
        result,
        code="COMMERCE_ITEM_PROPOSAL_CREATE_FAILED",
        message="Commercial request item proposal returned an invalid response.",
    )


def accept_commercial_request_item_proposal(
    *,
    access_token: str | None,
    proposal_id: str | UUID | None,
) -> dict[str, Any]:
    token = _required_token(access_token)
    normalized_proposal_id = _required_id(
        proposal_id,
        field="commerce_request_proposal_id",
    )
    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_accept_item_proposal",
        parameters={
            "p_commerce_request_proposal_id": normalized_proposal_id,
        },
    )
    return _json_result(
        result,
        code="COMMERCE_ITEM_PROPOSAL_ACCEPT_FAILED",
        message="Commercial request item proposal acceptance returned an invalid response.",
    )



def accept_fixed_commercial_request_item(
    *,
    access_token: str | None,
    item_id: str | UUID | None,
) -> dict[str, Any]:
    token = _required_token(access_token)
    normalized_item_id = _required_id(
        item_id,
        field="commerce_request_item_id",
    )
    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_accept_fixed_request_item",
        parameters={
            "p_commerce_request_item_id": normalized_item_id,
        },
    )
    return _json_result(
        result,
        code="COMMERCE_FIXED_REQUEST_ITEM_ACCEPT_FAILED",
        message="Commercial fixed request item acceptance returned an invalid response.",
    )

def close_commercial_request_item(
    *,
    access_token: str | None,
    item_id: str | UUID | None,
    action: str | None,
    reason_code: str | None = None,
    reason_text: str | None = None,
) -> dict[str, Any]:
    token = _required_token(access_token)
    normalized_item_id = _required_id(
        item_id,
        field="commerce_request_item_id",
    )
    normalized_action = str(action or "").strip().lower()
    if normalized_action != "reject":
        raise CommercialValidationError(
            "Commercial request item close action is invalid.",
            code="COMMERCE_REQUEST_ITEM_CLOSE_ACTION_INVALID",
        )

    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_close_request_item",
        parameters={
            "p_commerce_request_item_id": normalized_item_id,
            "p_action": normalized_action,
            "p_reason_code": _optional_text(reason_code),
            "p_reason_text": _optional_text(reason_text),
        },
    )
    return _json_result(
        result,
        code="COMMERCE_REQUEST_ITEM_CLOSE_FAILED",
        message="Commercial request item close returned an invalid response.",
    )


def withdraw_commercial_request_item_proposal(
    *,
    access_token: str | None,
    proposal_id: str | UUID | None,
    reason_text: str | None = None,
) -> dict[str, Any]:
    token = _required_token(access_token)
    normalized_proposal_id = _required_id(
        proposal_id,
        field="commerce_request_proposal_id",
    )
    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_withdraw_item_proposal",
        parameters={
            "p_commerce_request_proposal_id": normalized_proposal_id,
            "p_reason_text": _optional_text(reason_text),
        },
    )
    return _json_result(
        result,
        code="COMMERCE_ITEM_PROPOSAL_WITHDRAW_FAILED",
        message="Commercial request item proposal withdrawal returned an invalid response.",
    )


def update_commercial_request_item_operational_status(
    *,
    access_token: str | None,
    item_id: str | UUID | None,
    next_status: str | None,
    reason_text: str | None = None,
) -> dict[str, Any]:
    token = _required_token(access_token)
    normalized_item_id = _required_id(
        item_id,
        field="commerce_request_item_id",
    )
    normalized_status = str(next_status or "").strip().lower()
    if not normalized_status:
        raise CommercialValidationError(
            "Commercial request item operational status is required.",
            code="COMMERCE_OPERATIONAL_STATUS_REQUIRED",
        )

    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_update_item_operational_status",
        parameters={
            "p_commerce_request_item_id": normalized_item_id,
            "p_next_status": normalized_status,
            "p_reason_text": _optional_text(reason_text),
        },
    )
    return _json_result(
        result,
        code="COMMERCE_ITEM_OPERATIONAL_STATUS_FAILED",
        message="Commercial request item operational status returned an invalid response.",
    )
