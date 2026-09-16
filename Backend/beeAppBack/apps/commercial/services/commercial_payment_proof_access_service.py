from __future__ import annotations

from typing import Any
from uuid import UUID

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialNotFoundError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_supabase_service import (
    execute_commercial_rpc,
)


SIGNED_URL_EXPIRES_IN_SECONDS = 300
PAYMENT_PROOF_CONTEXT_RPC = "commerce_get_payment_proof_context"


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
            code="PAYMENT_PROOF_ACCESS_CONTEXT_INVALID",
        )

    returned_proof_id = str(
        result.get("commerce_payment_proof_id") or ""
    ).strip()
    file_id = str(result.get("file_id") or "").strip()

    if returned_proof_id != payment_proof_id or not file_id:
        raise CommercialValidationError(
            "Payment proof context returned an invalid response.",
            code="PAYMENT_PROOF_ACCESS_CONTEXT_INVALID",
        )

    return result


def get_commercial_payment_proof_access(
    *,
    access_token: str | None,
    payment_proof_id: str | UUID | None,
    download: bool = False,
) -> dict[str, Any]:
    token = _required_token(access_token)
    proof_id = _required_id(
        payment_proof_id,
        field="payment_proof_id",
    )

    context = _load_payment_proof_context(
        access_token=token,
        payment_proof_id=proof_id,
    )
    file_id = str(context["file_id"]).strip()

    admin_client = get_supabase_admin_client()
    response = (
        admin_client.table("files")
        .select(
            "id,bucket_id,storage_path,display_name,original_name,"
            "mime_type,size_bytes,status,trashed_at"
        )
        .eq("id", file_id)
        .eq("status", "ready")
        .is_("trashed_at", "null")
        .maybe_single()
        .execute()
    )

    file_record = getattr(response, "data", None)

    if not isinstance(file_record, dict):
        raise CommercialNotFoundError(
            "Payment proof file was not found.",
            code="PAYMENT_PROOF_FILE_NOT_FOUND",
        )

    options = (
        {"download": file_record["display_name"]}
        if download
        else {}
    )

    signed_response = (
        admin_client.storage.from_(file_record["bucket_id"])
        .create_signed_url(
            file_record["storage_path"],
            SIGNED_URL_EXPIRES_IN_SECONDS,
            options,
        )
    )

    signed_url = getattr(signed_response, "signed_url", None)

    if not signed_url and isinstance(signed_response, dict):
        signed_url = (
            signed_response.get("signedURL")
            or signed_response.get("signed_url")
        )

    if not signed_url:
        raise CommercialValidationError(
            "Could not create payment proof access URL.",
            code="PAYMENT_PROOF_ACCESS_URL_FAILED",
        )

    return {
        "payment_proof_id": proof_id,
        "file": {
            "id": str(file_record["id"]),
            "display_name": str(file_record["display_name"]),
            "original_name": str(file_record["original_name"]),
            "mime_type": str(file_record["mime_type"]),
            "size_bytes": int(file_record["size_bytes"]),
        },
        "url": str(signed_url),
        "expires_in_seconds": SIGNED_URL_EXPIRES_IN_SECONDS,
        "download": bool(download),
    }
