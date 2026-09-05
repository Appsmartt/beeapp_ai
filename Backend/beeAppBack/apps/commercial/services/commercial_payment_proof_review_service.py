from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_supabase_service import (
    execute_commercial_rpc,
)


REVIEW_PAYMENT_PROOF_RPC = "commerce_review_payment_proof"

ALLOWED_DECISIONS = frozenset({"confirmed", "rejected"})


def review_commercial_payment_proof(
    *,
    access_token: str | None,
    payment_proof_id: str | None,
    decision: str | None,
    rejection_reason: str | None = None,
) -> dict[str, Any]:
    token = str(access_token or "").strip()
    if not token:
        raise CommercialAuthenticationError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    normalized_payment_proof_id = str(payment_proof_id or "").strip()
    if not normalized_payment_proof_id:
        raise CommercialValidationError(
            "payment_proof_id is required.",
            code="PAYMENT_PROOF_ID_REQUIRED",
        )

    normalized_decision = str(decision or "").strip().lower()
    if normalized_decision not in ALLOWED_DECISIONS:
        raise CommercialValidationError(
            "Unsupported payment-proof decision.",
            code="PAYMENT_PROOF_DECISION_INVALID",
        )

    normalized_rejection_reason = (
        str(rejection_reason or "").strip() or None
    )

    if normalized_decision == "rejected" and not normalized_rejection_reason:
        raise CommercialValidationError(
            "A rejection reason is required.",
            code="PAYMENT_PROOF_REJECTION_REASON_REQUIRED",
        )

    payment_proof_id_result = execute_commercial_rpc(
        access_token=token,
        function_name=REVIEW_PAYMENT_PROOF_RPC,
        parameters={
            "p_commerce_payment_proof_id": normalized_payment_proof_id,
            "p_decision": normalized_decision,
            "p_rejection_reason": normalized_rejection_reason,
        },
    )

    normalized_result_id = str(payment_proof_id_result or "").strip()
    if not normalized_result_id:
        raise CommercialValidationError(
            "Payment-proof review RPC returned an invalid response.",
            code="PAYMENT_PROOF_REVIEW_RESPONSE_INVALID",
        )

    return {
        "payment_proof_id": normalized_result_id,
        "status": normalized_decision,
    }
