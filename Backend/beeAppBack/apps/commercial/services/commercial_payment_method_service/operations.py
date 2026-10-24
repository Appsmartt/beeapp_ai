from datetime import UTC, datetime
from typing import Any

from apps.commercial.enums import CommercialPaymentMethodStatus
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

from .audit import write_payment_method_audit_event
from .client import get_user_supabase_client
from .constants import PAYMENT_METHOD_UPSERT_RPC
from .queries import get_owned_commercial_payment_method
from .serialization import serialize_upserted_payment_method
from .validation import build_update_payload


def upsert_payment_method(
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
                "p_commercial_profile_id": str(commercial_profile_id),
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
                "p_mobile_account": payload.get("mobile_account"),
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

    return serialize_upserted_payment_method(rows[0])


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
        supabase = get_user_supabase_client(access_token=access_token)
        payment_method = upsert_payment_method(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            payment_method_id=None,
            payload=payload,
        )
        write_payment_method_audit_event(
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
    current_payment_method = get_owned_commercial_payment_method(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        payment_method_id=str(payment_method_id),
    )

    if (
        current_payment_method["status"]
        == CommercialPaymentMethodStatus.ARCHIVED.value
    ):
        raise CommercialStateError(
            "Archived payment methods cannot be edited.",
            code="COMMERCIAL_PAYMENT_METHOD_ARCHIVED",
        )

    payload_for_upsert = build_update_payload(
        current_payment_method=current_payment_method,
        payload=payload,
    )

    try:
        supabase = get_user_supabase_client(access_token=access_token)
        payment_method = upsert_payment_method(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            payment_method_id=str(payment_method_id),
            payload=payload_for_upsert,
        )
        write_payment_method_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            payment_method_id=str(payment_method_id),
            action="payment_method.updated",
            previous_state=current_payment_method["status"],
            new_state=payment_method["status"],
            metadata={"updated_fields": sorted(payload.keys())},
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
    current_payment_method = get_owned_commercial_payment_method(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        payment_method_id=str(payment_method_id),
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
        supabase = get_user_supabase_client(access_token=access_token)
        response = (
            supabase.table("commercial_payment_methods")
            .update(
                {
                    "status": (
                        CommercialPaymentMethodStatus.ARCHIVED.value
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
        write_payment_method_audit_event(
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
