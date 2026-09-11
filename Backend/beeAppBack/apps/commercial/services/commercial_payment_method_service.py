from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from apps.commercial.enums import (
    CommercialPaymentMethodStatus,
)
from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_profile_owner,
)
from apps.commercial.services.commercial_supabase_service import (
    get_commercial_user_supabase_client,
)


PAYMENT_METHOD_UPSERT_RPC = (
    "commerce_upsert_owned_payment_method"
)

COMMERCIAL_PAYMENT_METHOD_COLUMNS = (
    "id,commercial_profile_id,payment_method_type,display_name,"
    "sort_order,status,archived_at,created_at,updated_at,"
    "commercial_mobile_payment_accounts("
    "wallet_type,payment_key,account_holder_name"
    "),"
    "commercial_bank_accounts("
    "account_holder_name,"
    "account_holder_document_type,"
    "account_holder_document_number,"
    "bank_name,"
    "account_type,"
    "account_number"
    ")"
)


def _get_user_supabase_client(*, access_token: str):
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialAccessError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    return get_commercial_user_supabase_client(
        access_token=normalized_access_token,
    )


def _first_child(
    payment_method: dict[str, Any],
    relation_name: str,
) -> dict[str, Any] | None:
    relation = payment_method.get(relation_name)

    if isinstance(relation, list):
        return relation[0] if relation else None

    if isinstance(relation, dict):
        return relation

    return None


def _serialize_owned_payment_method(
    payment_method: dict[str, Any],
) -> dict[str, Any]:
    payment_method_type = payment_method["payment_method_type"]
    mobile_account = _first_child(
        payment_method,
        "commercial_mobile_payment_accounts",
    )
    bank_account = _first_child(
        payment_method,
        "commercial_bank_accounts",
    )

    serialized_mobile_account = None
    serialized_bank_account = None

    if payment_method_type in {"nequi", "daviplata", "breb"}:
        if not mobile_account:
            raise CommercialOperationError(
                "Mobile payment account details are missing.",
                code="COMMERCIAL_PAYMENT_METHOD_DETAILS_MISSING",
            )

        serialized_mobile_account = {
            "wallet_type": mobile_account["wallet_type"],
            "payment_key": mobile_account["payment_key"],
            "account_holder_name": mobile_account.get(
                "account_holder_name"
            ),
        }

    elif payment_method_type == "bank_account":
        if not bank_account:
            raise CommercialOperationError(
                "Bank account details are missing.",
                code="COMMERCIAL_PAYMENT_METHOD_DETAILS_MISSING",
            )

        serialized_bank_account = {
            "account_holder_name": bank_account[
                "account_holder_name"
            ],
            "account_holder_document_type": bank_account[
                "account_holder_document_type"
            ],
            "account_holder_document_number": bank_account[
                "account_holder_document_number"
            ],
            "bank_name": bank_account["bank_name"],
            "account_type": bank_account["account_type"],
            "account_number": bank_account["account_number"],
        }

    else:
        raise CommercialOperationError(
            "Payment method type is not supported.",
            code="COMMERCIAL_PAYMENT_METHOD_TYPE_INVALID",
        )

    return {
        "id": str(payment_method["id"]),
        "commercial_profile_id": str(
            payment_method["commercial_profile_id"]
        ),
        "payment_method_type": payment_method_type,
        "display_name": payment_method["display_name"],
        "sort_order": int(
            payment_method.get("sort_order") or 0
        ),
        "status": payment_method["status"],
        "archived_at": payment_method.get("archived_at"),
        "created_at": payment_method.get("created_at"),
        "updated_at": payment_method.get("updated_at"),
        "mobile_account": serialized_mobile_account,
        "bank_account": serialized_bank_account,
    }


def serialize_public_payment_method(
    payment_method: dict[str, Any],
) -> dict[str, Any]:
    """
    Presentación limitada para contextos no propietarios.

    No expone teléfonos, llaves Bre-B, documentos, cuentas ni datos
    de titularidad. La RPC commerce_request_payment_methods determina
    la información autorizada para el cliente de una compra.
    """
    return {
        "id": str(payment_method["id"]),
        "commercial_profile_id": str(
            payment_method["commercial_profile_id"]
        ),
        "payment_method_type": payment_method[
            "payment_method_type"
        ],
        "display_name": payment_method["display_name"],
        "sort_order": int(
            payment_method.get("sort_order") or 0
        ),
    }


def _write_payment_method_audit_event(
    *,
    supabase,
    commercial_profile_id: str,
    actor_profile_id: str,
    payment_method_id: str,
    action: str,
    previous_state: str | None,
    new_state: str | None,
    metadata: dict[str, Any],
) -> None:
    try:
        response = (
            supabase.rpc(
                "commerce_write_audit_event",
                {
                    "p_commercial_profile_id": str(
                        commercial_profile_id
                    ),
                    "p_actor_profile_id": str(actor_profile_id),
                    "p_entity_type": (
                        "commercial_payment_method"
                    ),
                    "p_entity_id": str(payment_method_id),
                    "p_action": action,
                    "p_previous_state": previous_state,
                    "p_new_state": new_state,
                    "p_reason_code": None,
                    "p_reason_text": None,
                    "p_reference_type": None,
                    "p_reference_id": None,
                    "p_metadata": metadata,
                },
            )
            .execute()
        )

        if not getattr(response, "data", None):
            raise CommercialOperationError(
                "Could not write payment method audit event.",
                code="COMMERCIAL_PAYMENT_METHOD_AUDIT_FAILED",
            )

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not write payment method audit event.",
            code="COMMERCIAL_PAYMENT_METHOD_AUDIT_FAILED",
        ) from error


def _list_payment_methods(
    *,
    supabase,
    commercial_profile_id: str,
    payment_method_id: str | None = None,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    query = (
        supabase.table("commercial_payment_methods")
        .select(COMMERCIAL_PAYMENT_METHOD_COLUMNS)
        .eq("commercial_profile_id", str(commercial_profile_id))
        .order("sort_order")
        .order("created_at")
    )

    if payment_method_id is not None:
        query = query.eq("id", str(payment_method_id))

    if not include_archived:
        query = query.neq(
            "status",
            CommercialPaymentMethodStatus.ARCHIVED.value,
        )

    response = query.execute()
    return list(response.data or [])


def list_owned_commercial_payment_methods(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        return [
            _serialize_owned_payment_method(payment_method)
            for payment_method in _list_payment_methods(
                supabase=supabase,
                commercial_profile_id=str(commercial_profile_id),
                include_archived=include_archived,
            )
        ]

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial payment methods.",
            code="COMMERCIAL_PAYMENT_METHOD_LIST_FAILED",
        ) from error


def get_owned_commercial_payment_method(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    payment_method_id: str,
) -> dict[str, Any]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        payment_methods = _list_payment_methods(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            payment_method_id=str(payment_method_id),
            include_archived=True,
        )

        if not payment_methods:
            raise CommercialNotFoundError(
                "Commercial payment method was not found.",
                code="COMMERCIAL_PAYMENT_METHOD_NOT_FOUND",
            )

        return _serialize_owned_payment_method(payment_methods[0])

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial payment method.",
            code="COMMERCIAL_PAYMENT_METHOD_LOOKUP_FAILED",
        ) from error


def _upsert_payment_method(
    *,
    supabase,
    commercial_profile_id: str,
    payment_method_id: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    response = (
        supabase.rpc(
            PAYMENT_METHOD_UPSERT_RPC,
            {
                "p_commercial_profile_id": str(
                    commercial_profile_id
                ),
                "p_payment_method_id": (
                    str(payment_method_id)
                    if payment_method_id is not None
                    else None
                ),
                "p_payment_method_type": payload.get(
                    "payment_method_type"
                ),
                "p_display_name": payload.get("display_name"),
                "p_sort_order": payload.get("sort_order"),
                "p_mobile_account": payload.get(
                    "mobile_account"
                ),
                "p_bank_account": payload.get("bank_account"),
            },
        )
        .execute()
    )

    rows = response.data or []

    if not rows:
        raise CommercialOperationError(
            "Payment method upsert did not return a record.",
            code="COMMERCIAL_PAYMENT_METHOD_UPSERT_FAILED",
        )

    payment_method = rows[0]

    return {
        "id": str(payment_method["id"]),
        "commercial_profile_id": str(
            payment_method["commercial_profile_id"]
        ),
        "payment_method_type": payment_method[
            "payment_method_type"
        ],
        "display_name": payment_method["display_name"],
        "sort_order": int(payment_method["sort_order"]),
        "status": payment_method["status"],
        "archived_at": payment_method.get("archived_at"),
        "created_at": payment_method.get("created_at"),
        "updated_at": payment_method.get("updated_at"),
        "mobile_account": payment_method.get("mobile_account"),
        "bank_account": payment_method.get("bank_account"),
    }


def create_commercial_payment_method(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        payment_method = _upsert_payment_method(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            payment_method_id=None,
            payload=payload,
        )

        _write_payment_method_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            payment_method_id=payment_method["id"],
            action="payment_method.created",
            previous_state=None,
            new_state=payment_method["status"],
            metadata={
                "payment_method_type": payment_method[
                    "payment_method_type"
                ],
                "display_name": payment_method["display_name"],
                "sort_order": payment_method["sort_order"],
            },
        )

        return payment_method

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
        CommercialValidationError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not create commercial payment method.",
            code="COMMERCIAL_PAYMENT_METHOD_CREATE_FAILED",
        ) from error


def update_commercial_payment_method(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    payment_method_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    current_payment_method = (
        get_owned_commercial_payment_method(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            payment_method_id=str(payment_method_id),
        )
    )

    if (
        current_payment_method["status"]
        == CommercialPaymentMethodStatus.ARCHIVED.value
    ):
        raise CommercialStateError(
            "Archived payment methods cannot be edited.",
            code="COMMERCIAL_PAYMENT_METHOD_ARCHIVED",
        )

    current_type = current_payment_method[
        "payment_method_type"
    ]

    payload_for_upsert = {
        "payment_method_type": current_type,
        "display_name": payload["display_name"],
        "sort_order": payload["sort_order"],
        "mobile_account": payload.get("mobile_account"),
        "bank_account": payload.get("bank_account"),
    }

    if current_type in {"nequi", "daviplata", "breb"}:
        mobile_account = payload_for_upsert["mobile_account"]

        if not mobile_account:
            raise CommercialValidationError(
                "Mobile account data is required.",
                code="COMMERCIAL_PAYMENT_METHOD_MOBILE_ACCOUNT_REQUIRED",
            )

        if mobile_account.get("wallet_type") != current_type:
            raise CommercialValidationError(
                "wallet_type cannot change.",
                code="COMMERCIAL_PAYMENT_METHOD_TYPE_IMMUTABLE",
            )

        if payload_for_upsert["bank_account"] is not None:
            raise CommercialValidationError(
                "Bank account data is not allowed.",
                code="COMMERCIAL_PAYMENT_METHOD_ACCOUNT_TYPE_INVALID",
            )

    elif current_type == "bank_account":
        if not payload_for_upsert["bank_account"]:
            raise CommercialValidationError(
                "Bank account data is required.",
                code="COMMERCIAL_PAYMENT_METHOD_BANK_ACCOUNT_REQUIRED",
            )

        if payload_for_upsert["mobile_account"] is not None:
            raise CommercialValidationError(
                "Mobile account data is not allowed.",
                code="COMMERCIAL_PAYMENT_METHOD_ACCOUNT_TYPE_INVALID",
            )

    else:
        raise CommercialValidationError(
            "Payment method type is not supported.",
            code="COMMERCIAL_PAYMENT_METHOD_TYPE_INVALID",
        )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        payment_method = _upsert_payment_method(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            payment_method_id=str(payment_method_id),
            payload=payload_for_upsert,
        )

        _write_payment_method_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            payment_method_id=str(payment_method_id),
            action="payment_method.updated",
            previous_state=current_payment_method["status"],
            new_state=payment_method["status"],
            metadata={
                "updated_fields": sorted(payload.keys()),
            },
        )

        return payment_method

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
        CommercialValidationError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not update commercial payment method.",
            code="COMMERCIAL_PAYMENT_METHOD_UPDATE_FAILED",
        ) from error


def archive_commercial_payment_method(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    payment_method_id: str,
) -> dict[str, Any]:
    current_payment_method = (
        get_owned_commercial_payment_method(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            payment_method_id=str(payment_method_id),
        )
    )

    if (
        current_payment_method["status"]
        == CommercialPaymentMethodStatus.ARCHIVED.value
    ):
        raise CommercialStateError(
            "Commercial payment method is already archived.",
            code="COMMERCIAL_PAYMENT_METHOD_ALREADY_ARCHIVED",
        )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_payment_methods")
            .update(
                {
                    "status": (
                        CommercialPaymentMethodStatus
                        .ARCHIVED.value
                    ),
                    "archived_at": datetime.now(UTC).isoformat(),
                }
            )
            .eq("id", str(payment_method_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .neq(
                "status",
                CommercialPaymentMethodStatus.ARCHIVED.value,
            )
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial payment method could not be archived.",
                code="COMMERCIAL_PAYMENT_METHOD_ARCHIVE_FAILED",
            )

        payment_method = {
            **current_payment_method,
            "status": CommercialPaymentMethodStatus.ARCHIVED.value,
            "archived_at": response.data[0].get("archived_at"),
            "updated_at": response.data[0].get("updated_at"),
        }

        _write_payment_method_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            payment_method_id=str(payment_method_id),
            action="payment_method.archived",
            previous_state=current_payment_method["status"],
            new_state=payment_method["status"],
            metadata={},
        )

        return payment_method

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not archive commercial payment method.",
            code="COMMERCIAL_PAYMENT_METHOD_ARCHIVE_FAILED",
        ) from error
