from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_supabase_service import (
    execute_commercial_rpc,
)


RPC_NAME = "commerce_transition_request"

ALLOWED_ACTIONS = frozenset(
    {
        "start_review",
        "accept",
        "reject",
        "cancel",
    }
)


def transition_commercial_request(
    *,
    access_token: str | None,
    request_id: str | None,
    action: str | None,
    reason_code: str | None = None,
    reason_text: str | None = None,
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

    normalized_action = str(action or "").strip().lower()
    if normalized_action not in ALLOWED_ACTIONS:
        raise CommercialValidationError(
            "Unsupported request action.",
            code="ACTION_INVALID",
        )

    normalized_reason_code = str(reason_code or "").strip() or None
    normalized_reason_text = str(reason_text or "").strip() or None

    if normalized_action == "reject" and not normalized_reason_text:
        raise CommercialValidationError(
            "A rejection reason is required.",
            code="REJECTION_REASON_REQUIRED",
        )

    data = execute_commercial_rpc(
        access_token=token,
        function_name=RPC_NAME,
        parameters={
            "p_request_id": normalized_request_id,
            "p_action": normalized_action,
            "p_reason_code": normalized_reason_code,
            "p_reason_text": normalized_reason_text,
        },
    )

    if not isinstance(data, dict):
        raise CommercialValidationError(
            "Commercial request transition RPC returned an invalid response.",
            code="REQUEST_TRANSITION_FAILED",
        )

    return data
