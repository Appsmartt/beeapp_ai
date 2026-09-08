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


def _require_uuid_result(
    result: Any,
    *,
    code: str,
    message: str,
) -> str:
    normalized = str(result or "").strip()

    if not normalized:
        raise CommercialValidationError(
            message,
            code=code,
        )

    return normalized


def list_owned_commercial_requests(
    *,
    access_token: str | None,
    commercial_profile_id: str | UUID | None,
    statuses: list[str] | None = None,
    limit: int = 25,
    offset: int = 0,
) -> list[dict[str, Any]]:
    token = _required_token(access_token)
    profile_id = _required_id(
        commercial_profile_id,
        field="commercial_profile_id",
    )
    normalized_statuses = [
        str(item).strip()
        for item in (statuses or [])
        if str(item).strip()
    ]

    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_list_requests",
        parameters={
            "p_scope": "business",
            "p_statuses": normalized_statuses or None,
            "p_limit": int(limit),
            "p_offset": int(offset),
        },
    )

    if result is None:
        return []

    if (
        not isinstance(result, list)
        or not all(isinstance(item, dict) for item in result)
    ):
        raise CommercialValidationError(
            "Commercial request list returned an invalid response.",
            code="COMMERCE_REQUEST_LIST_FAILED",
        )

    return [
        item
        for item in result
        if str(item.get("commercial_profile_id") or "") == profile_id
    ]


def get_commercial_request_timeline(
    *,
    access_token: str | None,
    request_id: str | UUID | None,
) -> dict[str, Any]:
    token = _required_token(access_token)
    normalized_request_id = _required_id(
        request_id,
        field="commerce_request_id",
    )

    result = execute_commercial_rpc(
        access_token=token,
        function_name="commerce_get_request_timeline",
        parameters={
            "p_commerce_request_id": normalized_request_id,
        },
    )

    if isinstance(result, list):
        result = result[0] if result else None

    if not isinstance(result, dict):
        raise CommercialValidationError(
            "Commercial request timeline returned an invalid response.",
            code="COMMERCE_REQUEST_TIMELINE_FAILED",
        )

    if (
        str(result.get("request_id") or "")
        != normalized_request_id
    ):
        raise CommercialValidationError(
            "Commercial request timeline identifier does not match.",
            code="COMMERCE_REQUEST_TIMELINE_FAILED",
        )

    return result


def accept_commercial_request_proposal(
    *,
    access_token: str | None,
    proposal_id: str | UUID | None,
) -> dict[str, str]:
    token = _required_token(access_token)
    normalized_proposal_id = _required_id(
        proposal_id,
        field="commerce_request_proposal_id",
    )
    request_id = _require_uuid_result(
        execute_commercial_rpc(
            access_token=token,
            function_name="commerce_accept_request_proposal",
            parameters={
                "p_commerce_request_proposal_id": normalized_proposal_id,
            },
        ),
        code="COMMERCE_PROPOSAL_ACCEPT_FAILED",
        message="Commercial proposal acceptance returned an invalid response.",
    )

    return {
        "proposal_id": normalized_proposal_id,
        "request_id": request_id,
        "status": "accepted",
    }


def reject_commercial_request_proposal(
    *,
    access_token: str | None,
    proposal_id: str | UUID | None,
    rejection_reason: str | None = None,
) -> dict[str, str]:
    token = _required_token(access_token)
    normalized_proposal_id = _required_id(
        proposal_id,
        field="commerce_request_proposal_id",
    )
    request_id = _require_uuid_result(
        execute_commercial_rpc(
            access_token=token,
            function_name="commerce_reject_request_proposal",
            parameters={
                "p_commerce_request_proposal_id": normalized_proposal_id,
                "p_rejection_reason": _optional_text(
                    rejection_reason,
                ),
            },
        ),
        code="COMMERCE_PROPOSAL_REJECT_FAILED",
        message="Commercial proposal rejection returned an invalid response.",
    )

    return {
        "proposal_id": normalized_proposal_id,
        "request_id": request_id,
        "status": "rejected",
    }


def withdraw_commercial_request_proposal(
    *,
    access_token: str | None,
    proposal_id: str | UUID | None,
    withdrawal_reason: str | None = None,
) -> dict[str, str]:
    token = _required_token(access_token)
    normalized_proposal_id = _required_id(
        proposal_id,
        field="commerce_request_proposal_id",
    )
    request_id = _require_uuid_result(
        execute_commercial_rpc(
            access_token=token,
            function_name="commerce_withdraw_request_proposal",
            parameters={
                "p_commerce_request_proposal_id": normalized_proposal_id,
                "p_withdrawal_reason": _optional_text(
                    withdrawal_reason,
                ),
            },
        ),
        code="COMMERCE_PROPOSAL_WITHDRAW_FAILED",
        message="Commercial proposal withdrawal returned an invalid response.",
    )

    return {
        "proposal_id": normalized_proposal_id,
        "request_id": request_id,
        "status": "withdrawn",
    }


def replace_commercial_payment_proof(
    *,
    access_token: str | None,
    rejected_payment_proof_id: str | UUID | None,
    file_id: str | UUID | None,
    payment_method_id: str | UUID | None = None,
    payment_reference: str | None = None,
    note: str | None = None,
) -> dict[str, str]:
    token = _required_token(access_token)
    proof_id = _required_id(
        rejected_payment_proof_id,
        field="rejected_payment_proof_id",
    )
    normalized_file_id = _required_id(file_id, field="file_id")

    result_id = _require_uuid_result(
        execute_commercial_rpc(
            access_token=token,
            function_name="commerce_replace_payment_proof",
            parameters={
                "p_rejected_payment_proof_id": proof_id,
                "p_file_id": normalized_file_id,
                "p_payment_method_id": (
                    _required_id(
                        payment_method_id,
                        field="payment_method_id",
                    )
                    if payment_method_id is not None
                    else None
                ),
                "p_payment_reference": _optional_text(
                    payment_reference,
                ),
                "p_note": _optional_text(note),
            },
        ),
        code="COMMERCIAL_PAYMENT_PROOF_REPLACE_FAILED",
        message="Payment proof replacement returned an invalid response.",
    )

    return {
        "payment_proof_id": result_id,
        "replaced_payment_proof_id": proof_id,
        "status": "submitted",
    }


def complete_commercial_request(
    *,
    access_token: str | None,
    request_id: str | UUID | None,
    completion_note: str | None = None,
) -> dict[str, str]:
    token = _required_token(access_token)
    normalized_request_id = _required_id(
        request_id,
        field="commerce_request_id",
    )
    result_id = _require_uuid_result(
        execute_commercial_rpc(
            access_token=token,
            function_name="commerce_complete_request",
            parameters={
                "p_commerce_request_id": normalized_request_id,
                "p_completion_note": _optional_text(
                    completion_note,
                ),
            },
        ),
        code="COMMERCE_REQUEST_COMPLETE_FAILED",
        message="Commercial request completion returned an invalid response.",
    )

    if result_id != normalized_request_id:
        raise CommercialValidationError(
            "Commercial request completion identifier does not match.",
            code="COMMERCE_REQUEST_COMPLETE_FAILED",
        )

    return {
        "request_id": result_id,
        "status": "completed",
    }
