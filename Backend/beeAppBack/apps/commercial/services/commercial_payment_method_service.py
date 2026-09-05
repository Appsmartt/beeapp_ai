from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from apps.commercial.enums import (
    CommercialPaymentMethodStatus,
)
from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialConflictError,
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


COMMERCIAL_PAYMENT_METHOD_COLUMNS = (
    "id,commercial_profile_id,payment_method_type,display_name,"
    "public_details,private_details,public_instructions,"
    "private_instructions,available_before_acceptance,sort_order,"
    "status,archived_at,created_at,updated_at"
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


def _serialize_owned_payment_method(
    payment_method: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(payment_method["id"]),
        "commercial_profile_id": str(
            payment_method["commercial_profile_id"]
        ),
        "payment_method_type": payment_method[
            "payment_method_type"
        ],
        "display_name": payment_method["display_name"],
        "public_details": payment_method.get(
            "public_details"
        ) or {},
        "private_details": payment_method.get(
            "private_details"
        ) or {},
        "public_instructions": payment_method.get(
            "public_instructions"
        ),
        "private_instructions": payment_method.get(
            "private_instructions"
        ),
        "available_before_acceptance": bool(
            payment_method.get(
                "available_before_acceptance"
            )
        ),
        "sort_order": int(
            payment_method.get("sort_order") or 0
        ),
        "status": payment_method["status"],
        "archived_at": payment_method.get("archived_at"),
        "created_at": payment_method.get("created_at"),
        "updated_at": payment_method.get("updated_at"),
    }


def serialize_public_payment_method(
    payment_method: dict[str, Any],
) -> dict[str, Any]:
    """
    Presentación limitada para contextos no propietarios.

    Nunca incluye private_details ni private_instructions.
    No debe sustituir el RPC commerce_request_payment_methods,
    que decide cuándo el cliente puede ver instrucciones.
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
        "public_details": payment_method.get(
            "public_details"
        ) or {},
        "public_instructions": payment_method.get(
            "public_instructions"
        ),
        "available_before_acceptance": bool(
            payment_method.get(
                "available_before_acceptance"
            )
        ),
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
                    "p_actor_profile_id": str(
                        actor_profile_id
                    ),
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

        query = (
            supabase.table("commercial_payment_methods")
            .select(COMMERCIAL_PAYMENT_METHOD_COLUMNS)
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .order("sort_order")
            .order("created_at")
        )

        if not include_archived:
            query = query.neq(
                "status",
                CommercialPaymentMethodStatus.ARCHIVED.value,
            )

        response = query.execute()

        return [
            _serialize_owned_payment_method(payment_method)
            for payment_method in (response.data or [])
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

        response = (
            supabase.table("commercial_payment_methods")
            .select(COMMERCIAL_PAYMENT_METHOD_COLUMNS)
            .eq("id", str(payment_method_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .maybe_single()
            .execute()
        )

        payment_method = response.data

        if not payment_method:
            raise CommercialNotFoundError(
                "Commercial payment method was not found.",
                code="COMMERCIAL_PAYMENT_METHOD_NOT_FOUND",
            )

        return _serialize_owned_payment_method(payment_method)

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

        payment_method_payload = {
            "commercial_profile_id": str(
                commercial_profile_id
            ),
            "payment_method_type": payload[
                "payment_method_type"
            ],
            "display_name": payload["display_name"],
            "public_details": payload["public_details"],
            "private_details": payload["private_details"],
            "public_instructions": payload.get(
                "public_instructions"
            ),
            "private_instructions": payload.get(
                "private_instructions"
            ),
            "available_before_acceptance": payload[
                "available_before_acceptance"
            ],
            "sort_order": payload["sort_order"],
            "status": (
                CommercialPaymentMethodStatus.ACTIVE.value
                if payload["is_active"]
                else CommercialPaymentMethodStatus.INACTIVE.value
            ),
            "archived_at": None,
        }

        response = (
            supabase.table("commercial_payment_methods")
            .insert(payment_method_payload)
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Supabase did not return the created payment method.",
                code="COMMERCIAL_PAYMENT_METHOD_CREATE_FAILED",
            )

        payment_method = response.data[0]

        _write_payment_method_audit_event(
            supabase=supabase,
            commercial_profile_id=str(
                commercial_profile_id
            ),
            actor_profile_id=str(user_id),
            payment_method_id=str(payment_method["id"]),
            action="payment_method.created",
            previous_state=None,
            new_state=payment_method["status"],
            metadata={
                "payment_method_type": payment_method[
                    "payment_method_type"
                ],
                "display_name": payment_method[
                    "display_name"
                ],
                "available_before_acceptance": bool(
                    payment_method.get(
                        "available_before_acceptance"
                    )
                ),
                "sort_order": payment_method["sort_order"],
            },
        )

        return _serialize_owned_payment_method(payment_method)

    except (
        CommercialAccessError,
        CommercialConflictError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
        CommercialValidationError,
    ):
        raise

    except Exception as error:
        error_message = str(error).lower()

        if (
            "commercial_payment_methods_one_active_type_idx"
            in error_message
            or "duplicate key" in error_message
            or "unique constraint" in error_message
        ):
            raise CommercialConflictError(
                "An active payment method of this type already exists "
                "for this commercial profile.",
                code="COMMERCIAL_PAYMENT_METHOD_TYPE_ALREADY_ACTIVE",
            ) from error

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
            commercial_profile_id=str(
                commercial_profile_id
            ),
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

    mutable_fields = {
        "display_name",
        "public_details",
        "private_details",
        "public_instructions",
        "private_instructions",
        "available_before_acceptance",
        "sort_order",
    }

    update_payload = {
        key: value
        for key, value in payload.items()
        if key in mutable_fields
    }

    if "is_active" in payload:
        update_payload["status"] = (
            CommercialPaymentMethodStatus.ACTIVE.value
            if payload["is_active"]
            else CommercialPaymentMethodStatus.INACTIVE.value
        )

    if not update_payload:
        raise CommercialValidationError(
            "No mutable payment method field was provided.",
            code="COMMERCIAL_PAYMENT_METHOD_UPDATE_EMPTY",
        )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_payment_methods")
            .update(update_payload)
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
                "Commercial payment method could not be updated.",
                code="COMMERCIAL_PAYMENT_METHOD_UPDATE_FAILED",
            )

        payment_method = response.data[0]

        _write_payment_method_audit_event(
            supabase=supabase,
            commercial_profile_id=str(
                commercial_profile_id
            ),
            actor_profile_id=str(user_id),
            payment_method_id=str(payment_method_id),
            action="payment_method.updated",
            previous_state=current_payment_method[
                "status"
            ],
            new_state=payment_method["status"],
            metadata={
                "updated_fields": sorted(
                    update_payload.keys()
                ),
            },
        )

        return _serialize_owned_payment_method(payment_method)

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
            commercial_profile_id=str(
                commercial_profile_id
            ),
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
                    "archived_at": datetime.now(
                        UTC
                    ).isoformat(),
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

        payment_method = response.data[0]

        _write_payment_method_audit_event(
            supabase=supabase,
            commercial_profile_id=str(
                commercial_profile_id
            ),
            actor_profile_id=str(user_id),
            payment_method_id=str(payment_method_id),
            action="payment_method.archived",
            previous_state=current_payment_method[
                "status"
            ],
            new_state=payment_method["status"],
            metadata={},
        )

        return _serialize_owned_payment_method(payment_method)

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
