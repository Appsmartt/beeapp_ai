from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_profile_owner,
)


VERIFICATION_REQUEST_COLUMNS = (
    "id,commercial_profile_id,status,submitted_by_profile_id,"
    "submitted_at,reviewed_by_profile_id,reviewed_at,"
    "review_reason_code,review_reason_text,applicant_type,"
    "legal_name,tax_id,tax_id_normalized,business_address,"
    "review_note,declaration_accepted_at,declaration_version,"
    "created_at,updated_at"
)

VERIFICATION_DOCUMENT_COLUMNS = (
    "id,commercial_verification_request_id,file_id,"
    "uploaded_by_profile_id,status,note,replaced_by_document_id,"
    "archived_at,created_at,updated_at"
)

EDITABLE_STATUSES = {"draft", "requires_correction", "rejected"}


def _first_row(response) -> dict[str, Any] | None:
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return data[0] if data else None
    return data if isinstance(data, dict) else None


def _serialize_request(
    request_row: dict[str, Any],
    document: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "id": str(request_row["id"]),
        "commercial_profile_id": str(
            request_row["commercial_profile_id"]
        ),
        "status": request_row["status"],
        "submitted_at": request_row.get("submitted_at"),
        "reviewed_at": request_row.get("reviewed_at"),
        "review_reason_code": request_row.get(
            "review_reason_code"
        ),
        "review_reason_text": request_row.get(
            "review_reason_text"
        ),
        "applicant_type": request_row.get("applicant_type"),
        "legal_name": request_row.get("legal_name"),
        "tax_id": request_row.get("tax_id"),
        "tax_id_normalized": request_row.get(
            "tax_id_normalized"
        ),
        "business_address": request_row.get(
            "business_address"
        ),
        "review_note": request_row.get("review_note"),
        "declaration_accepted_at": request_row.get(
            "declaration_accepted_at"
        ),
        "declaration_version": request_row.get(
            "declaration_version"
        ),
        "is_editable": request_row["status"] in EDITABLE_STATUSES,
        "document": (
            {
                "id": str(document["id"]),
                "file_id": str(document["file_id"]),
                "note": document.get("note"),
                "status": document["status"],
                "created_at": document.get("created_at"),
            }
            if document
            else None
        ),
        "created_at": request_row.get("created_at"),
        "updated_at": request_row.get("updated_at"),
    }


def _get_current_request(
    *,
    commercial_profile_id: str,
) -> dict[str, Any] | None:
    response = (
        get_supabase_admin_client()
        .table("commercial_verification_requests")
        .select(VERIFICATION_REQUEST_COLUMNS)
        .eq("commercial_profile_id", str(commercial_profile_id))
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    return _first_row(response)


def _get_active_document(
    *,
    verification_request_id: str,
) -> dict[str, Any] | None:
    response = (
        get_supabase_admin_client()
        .table("commercial_verification_documents")
        .select(VERIFICATION_DOCUMENT_COLUMNS)
        .eq(
            "commercial_verification_request_id",
            str(verification_request_id),
        )
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    return _first_row(response)


def get_owned_commercial_verification(
    *,
    user_id: str,
    commercial_profile_id: str,
) -> dict[str, Any]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        request_row = _get_current_request(
            commercial_profile_id=str(commercial_profile_id),
        )
        if not request_row:
            return {
                "request": None,
                "verification_status": "not_requested",
            }

        document = _get_active_document(
            verification_request_id=str(request_row["id"]),
        )
        return {
            "request": _serialize_request(request_row, document),
            "verification_status": request_row["status"],
        }
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial verification."
        ) from error


def save_owned_commercial_verification(
    *,
    user_id: str,
    commercial_profile_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        request_row = _get_current_request(
            commercial_profile_id=str(commercial_profile_id),
        )
        request_payload = {
            "applicant_type": payload["applicant_type"],
            "legal_name": payload["legal_name"],
            "tax_id": payload["tax_id"],
            "business_address": payload["business_address"],
            "review_note": payload.get("review_note"),
            "declaration_accepted_at": datetime.now(UTC).isoformat(),
            "declaration_version": payload["declaration_version"],
        }
        client = get_supabase_admin_client()

        if request_row:
            if request_row["status"] not in EDITABLE_STATUSES:
                raise CommercialStateError(
                    "This verification request is currently locked.",
                    code="COMMERCIAL_VERIFICATION_NOT_EDITABLE",
                )

            updated = (
                client.table("commercial_verification_requests")
                .update(request_payload)
                .eq("id", str(request_row["id"]))
                .select(VERIFICATION_REQUEST_COLUMNS)
                .execute()
            )
            saved_request = _first_row(updated)
        else:
            created = (
                client.table("commercial_verification_requests")
                .insert(
                    {
                        **request_payload,
                        "commercial_profile_id": str(
                            commercial_profile_id
                        ),
                        "submitted_by_profile_id": str(user_id),
                        "status": "draft",
                    }
                )
                .select(VERIFICATION_REQUEST_COLUMNS)
                .execute()
            )
            saved_request = _first_row(created)

            if not saved_request:
                raise CommercialOperationError(
                    "Could not create verification request."
                )

            client.table("commercial_verification_events").insert(
                {
                    "commercial_verification_request_id": str(
                        saved_request["id"]
                    ),
                    "event_type": "draft_created",
                    "new_status": "draft",
                    "actor_profile_id": str(user_id),
                }
            ).execute()

        document = _get_active_document(
            verification_request_id=str(saved_request["id"]),
        )
        return _serialize_request(saved_request, document)
    except CommercialStateError:
        raise
    except Exception as error:
        print(
            "[commercial:verification:save] original error:",
            repr(error),
        )
        raise CommercialOperationError(
            "Could not save commercial verification."
        ) from error


def attach_owned_commercial_verification_document(
    *,
    user_id: str,
    commercial_profile_id: str,
    file_id: str,
    note: str | None,
) -> dict[str, Any]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        request_row = _get_current_request(
            commercial_profile_id=str(commercial_profile_id),
        )
        if not request_row:
            raise CommercialNotFoundError(
                "Create the verification request before attaching a PDF.",
                code="COMMERCIAL_VERIFICATION_REQUEST_NOT_FOUND",
            )

        if request_row["status"] not in EDITABLE_STATUSES:
            raise CommercialStateError(
                "This verification request is currently locked.",
                code="COMMERCIAL_VERIFICATION_NOT_EDITABLE",
            )

        client = get_supabase_admin_client()
        active_document = _get_active_document(
            verification_request_id=str(request_row["id"]),
        )

        if active_document:
            client.table("commercial_verification_documents").update(
                {
                    "status": "replaced",
                    "archived_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", str(active_document["id"])).execute()

        created = (
            client.table("commercial_verification_documents")
            .insert(
                {
                    "commercial_verification_request_id": str(
                        request_row["id"]
                    ),
                    "file_id": str(file_id),
                    "uploaded_by_profile_id": str(user_id),
                    "status": "active",
                    "note": note,
                }
            )
            .select(VERIFICATION_DOCUMENT_COLUMNS)
            .execute()
        )
        document = _first_row(created)

        if not document:
            raise CommercialOperationError(
                "Could not create verification PDF record."
            )

        if active_document:
            client.table("commercial_verification_documents").update(
                {
                    "replaced_by_document_id": str(document["id"]),
                }
            ).eq(
                "id",
                str(active_document["id"]),
            ).execute()

        client.table("commercial_verification_events").insert(
            {
                "commercial_verification_request_id": str(
                    request_row["id"]
                ),
                "event_type": (
                    "document_replaced"
                    if active_document
                    else "document_added"
                ),
                "previous_status": request_row["status"],
                "new_status": request_row["status"],
                "actor_profile_id": str(user_id),
                "reference_document_id": str(document["id"]),
            }
        ).execute()

        return _serialize_request(request_row, document)
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not attach verification PDF."
        ) from error


def submit_owned_commercial_verification(
    *,
    user_id: str,
    commercial_profile_id: str,
) -> dict[str, Any]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        request_row = _get_current_request(
            commercial_profile_id=str(commercial_profile_id),
        )
        if not request_row:
            raise CommercialNotFoundError(
                "Verification request was not found.",
                code="COMMERCIAL_VERIFICATION_REQUEST_NOT_FOUND",
            )

        if request_row["status"] not in EDITABLE_STATUSES:
            raise CommercialStateError(
                "This verification request is currently locked.",
                code="COMMERCIAL_VERIFICATION_NOT_EDITABLE",
            )

        client = get_supabase_admin_client()
        updated = (
            client.table("commercial_verification_requests")
            .update(
                {
                    "status": "pending_review",
                    "submitted_at": datetime.now(UTC).isoformat(),
                    "submitted_by_profile_id": str(user_id),
                    "reviewed_by_profile_id": None,
                    "reviewed_at": None,
                    "review_reason_code": None,
                    "review_reason_text": None,
                }
            )
            .eq("id", str(request_row["id"]))
            .select(VERIFICATION_REQUEST_COLUMNS)
            .execute()
        )
        submitted = _first_row(updated)

        client.table("commercial_verification_events").insert(
            {
                "commercial_verification_request_id": str(
                    submitted["id"]
                ),
                "event_type": "submitted_for_review",
                "previous_status": request_row["status"],
                "new_status": "pending_review",
                "actor_profile_id": str(user_id),
            }
        ).execute()

        document = _get_active_document(
            verification_request_id=str(submitted["id"]),
        )
        return _serialize_request(submitted, document)
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not submit commercial verification."
        ) from error
