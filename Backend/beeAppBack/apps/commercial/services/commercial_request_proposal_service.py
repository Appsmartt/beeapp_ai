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


RPC_NAME = "commerce_create_request_proposal"


def normalize_json_value(value: Any) -> Any:
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
            str(key): normalize_json_value(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple, set)):
        return [normalize_json_value(item) for item in value]

    raise CommercialValidationError(
        "Proposal payload contains an unsupported JSON value.",
        code="PROPOSAL_PAYLOAD_INVALID",
    )


def _optional_int(value: object, *, field: str) -> int | None:
    if value is None or value == "":
        return None

    if isinstance(value, bool):
        raise CommercialValidationError(
            f"{field} must be a non-negative integer.",
            code="PRICE_INVALID",
        )

    try:
        normalized = int(value)
    except (TypeError, ValueError) as error:
        raise CommercialValidationError(
            f"{field} must be a non-negative integer.",
            code="PRICE_INVALID",
        ) from error

    if normalized < 0:
        raise CommercialValidationError(
            f"{field} must be a non-negative integer.",
            code="PRICE_INVALID",
        )

    return normalized


def create_commercial_request_proposal(
    *,
    access_token: str | None,
    request_id: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    token = str(access_token or "").strip()

    if not token:
        raise CommercialAuthenticationError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    normalized_request_id = str(request_id or "").strip()
    if not normalized_request_id:
        raise CommercialValidationError(
            "request_id is required.",
            code="REQUEST_ID_REQUIRED",
        )

    if not isinstance(payload, dict):
        raise CommercialValidationError(
            "Proposal payload must be an object.",
            code="PROPOSAL_PAYLOAD_INVALID",
        )

    terms_snapshot = (
        payload["terms_snapshot"]
        if "terms_snapshot" in payload
        else {}
    )
    if not isinstance(terms_snapshot, dict):
        raise CommercialValidationError(
            "terms_snapshot must be an object.",
            code="PROPOSAL_TERMS_INVALID",
        )

    parameters = {
        "p_request_id": normalized_request_id,
        "p_requested_modality": (
            str(payload["requested_modality"]).strip()
            if payload.get("requested_modality")
            else None
        ),
        "p_subtotal_amount": _optional_int(
            payload.get("subtotal_amount"),
            field="subtotal_amount",
        ),
        "p_delivery_fee_amount": _optional_int(
            payload.get("delivery_fee_amount"),
            field="delivery_fee_amount",
        ),
        "p_total_amount": _optional_int(
            payload.get("total_amount"),
            field="total_amount",
        ),
        "p_proposed_starts_at": (
            payload["proposed_starts_at"].isoformat()
            if payload.get("proposed_starts_at")
            else None
        ),
        "p_proposed_ends_at": (
            payload["proposed_ends_at"].isoformat()
            if payload.get("proposed_ends_at")
            else None
        ),
        "p_timezone": (
            str(payload["timezone"]).strip()
            if (
                payload.get("timezone")
                and (
                    payload.get("proposed_starts_at") is not None
                    or payload.get("proposed_ends_at") is not None
                )
            )
            else None
        ),
        "p_note": (
            str(payload["note"]).strip()
            if payload.get("note")
            else None
        ),
        "p_terms_snapshot": normalize_json_value(terms_snapshot),
    }

    data = execute_commercial_rpc(
        access_token=token,
        function_name=RPC_NAME,
        parameters=parameters,
    )

    if not isinstance(data, dict):
        raise CommercialValidationError(
            "Commercial proposal RPC returned an invalid response.",
            code="PROPOSAL_CREATE_FAILED",
        )

    return data
