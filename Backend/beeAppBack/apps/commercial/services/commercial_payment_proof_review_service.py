from __future__ import annotations

from typing import Any
from uuid import UUID

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_supabase_service import (
    execute_commercial_rpc,
)


REVIEW_PAYMENT_PROOF_RPC = "commerce_review_payment_proof"
REVIEW_MIXED_PAYMENT_PROOF_RPC = "commerce_review_mixed_payment_proof"
PAYMENT_PROOF_CONTEXT_RPC = "commerce_get_payment_proof_context"

ALLOWED_DECISIONS = frozenset({"confirmed", "rejected"})


def _required_token(access_token: str | None) -> str:
    token = str(access_token or "").strip()

    if not token:
        raise CommercialAuthenticationError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    return token


def _required_payment_proof_id(
    payment_proof_id: str | UUID | None,
) -> str:
    normalized = str(payment_proof_id or "").strip()

    if not normalized:
        raise CommercialValidationError(
            "payment_proof_id is required.",
            code="PAYMENT_PROOF_ID_REQUIRED",
        )

    return normalized


def _normalize_decision(decision: str | None) -> str:
    normalized = str(decision or "").strip().lower()

    if normalized not in ALLOWED_DECISIONS:
        raise CommercialValidationError(
            "Unsupported payment-proof decision.",
            code="PAYMENT_PROOF_DECISION_INVALID",
        )

    return normalized


def _normalize_rejection_reason(
    decision: str,
    rejection_reason: str | None,
) -> str | None:
    normalized = str(rejection_reason or "").strip() or None

    if decision == "rejected" and not normalized:
        raise CommercialValidationError(
            "A rejection reason is required.",
            code="PAYMENT_PROOF_REJECTION_REASON_REQUIRED",
        )

    if decision == "confirmed" and normalized:
        raise CommercialValidationError(
            "A rejection reason is not allowed when confirming a payment proof.",
            code="PAYMENT_PROOF_REJECTION_REASON_INVALID",
        )

    return normalized


def _load_payment_proof_context(
    *,
    access_token: str,
    payment_proof_id: str,
) -> dict[str, Any]:
    result = execute_commercial_rpc(
        access_token=access_token,
        function_name=PAYMENT_PROOF_CONTEXT_RPC,
        parameters={
            "p_commerce_payment_proof_id": payment_proof_id,
        },
    )

    if isinstance(result, list):
        result = result[0] if result else None

    if not isinstance(result, dict):
        raise CommercialValidationError(
            "Payment proof context returned an invalid response.",
            code="PAYMENT_PROOF_CONTEXT_INVALID",
        )

    returned_proof_id = str(
        result.get("commerce_payment_proof_id") or ""
    ).strip()

    request_type = str(result.get("request_type") or "").strip()

    if returned_proof_id != payment_proof_id or not request_type:
        raise CommercialValidationError(
            "Payment proof context returned an invalid response.",
            code="PAYMENT_PROOF_CONTEXT_INVALID",
        )

    return result


def review_commercial_payment_proof(
    *,
    access_token: str | None,
    payment_proof_id: str | UUID | None,
    decision: str | None,
    rejection_reason: str | None = None,
) -> dict[str, Any]:
    token = _required_token(access_token)
    proof_id = _required_payment_proof_id(payment_proof_id)
    normalized_decision = _normalize_decision(decision)
    normalized_rejection_reason = _normalize_rejection_reason(
        normalized_decision,
        rejection_reason,
    )

    context = _load_payment_proof_context(
        access_token=token,
        payment_proof_id=proof_id,
    )

    request_type = str(context["request_type"]).strip()

    review_rpc = (
        REVIEW_MIXED_PAYMENT_PROOF_RPC
        if request_type == "mixed_request"
        else REVIEW_PAYMENT_PROOF_RPC
    )

    result = execute_commercial_rpc(
        access_token=token,
        function_name=review_rpc,
        parameters={
            "p_commerce_payment_proof_id": proof_id,
            "p_decision": normalized_decision,
            "p_rejection_reason": normalized_rejection_reason,
        },
    )

    if request_type == "mixed_request":
        if isinstance(result, list):
            result = result[0] if result else None

        if not isinstance(result, dict):
            raise CommercialValidationError(
                "Mixed payment-proof review returned an invalid response.",
                code="PAYMENT_PROOF_REVIEW_RESPONSE_INVALID",
            )

        returned_proof_id = str(
            result.get("commerce_payment_proof_id") or ""
        ).strip()

        if returned_proof_id != proof_id:
            raise CommercialValidationError(
                "Mixed payment-proof review returned an invalid response.",
                code="PAYMENT_PROOF_REVIEW_RESPONSE_INVALID",
            )

        return {
            "payment_proof_id": returned_proof_id,
            "status": normalized_decision,
            "request_id": str(
                result.get("commerce_request_id") or ""
            ).strip() or None,
            "request_status": str(
                result.get("request_status") or ""
            ).strip() or None,
            "attempts_used": result.get("attempts_used"),
            "attempts_remaining": result.get("attempts_remaining"),
            "released_inventory_hold_count": result.get(
                "released_inventory_hold_count"
            ),
            "cancelled_reservation_count": result.get(
                "cancelled_reservation_count"
            ),
            "confirmed_item_count": result.get(
                "confirmed_item_count"
            ),
            "confirmed_reservation_count": result.get(
                "confirmed_reservation_count"
            ),
        }

    returned_proof_id = str(result or "").strip()

    if returned_proof_id != proof_id:
        raise CommercialValidationError(
            "Payment-proof review returned an invalid response.",
            code="PAYMENT_PROOF_REVIEW_RESPONSE_INVALID",
        )

    return {
        "payment_proof_id": returned_proof_id,
        "status": normalized_decision,
    }
