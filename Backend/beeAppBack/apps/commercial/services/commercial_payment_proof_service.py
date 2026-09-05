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

SUBMIT_PAYMENT_PROOF_RPC = "commerce_submit_payment_proof"


def _normalized_access_token(access_token: str | None) -> str:
    token = str(access_token or "").strip()

    if not token:
        raise CommercialAuthenticationError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    return token


def submit_commercial_payment_proof(
    *,
    access_token: str | None,
    commerce_request_id: str | UUID,
    file_id: str | UUID,
    payment_method_id: str | UUID,
    payment_reference: str | None = None,
    note: str | None = None,
) -> dict[str, str]:
    token = _normalized_access_token(access_token)

    result = execute_commercial_rpc(
        access_token=token,
        function_name=SUBMIT_PAYMENT_PROOF_RPC,
        parameters={
            "p_commerce_request_id": str(commerce_request_id),
            "p_file_id": str(file_id),
            "p_payment_method_id": str(payment_method_id),
            "p_payment_reference": (
                str(payment_reference).strip()
                if payment_reference is not None
                else None
            ),
            "p_note": (
                str(note).strip()
                if note is not None
                else None
            ),
        },
    )

    payment_proof_id = str(result or "").strip()
    if not payment_proof_id:
        raise CommercialOperationError(
            "Payment proof RPC returned an invalid response.",
            code="COMMERCIAL_PAYMENT_PROOF_RESPONSE_INVALID",
        )

    return {
        "payment_proof_id": payment_proof_id,
        "request_id": str(commerce_request_id),
        "status": "submitted",
    }
