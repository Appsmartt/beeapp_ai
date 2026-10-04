from typing import Any

from apps.commercial.enums import CommercialPaymentMethodStatus
from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_profile_owner,
)

from .client import get_user_supabase_client
from .constants import COMMERCIAL_PAYMENT_METHOD_COLUMNS
from .serialization import serialize_owned_payment_method


def list_payment_method_rows(
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
        supabase = get_user_supabase_client(access_token=access_token)
        payment_methods = list_payment_method_rows(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            include_archived=include_archived,
        )
        return [
            serialize_owned_payment_method(payment_method)
            for payment_method in payment_methods
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
        supabase = get_user_supabase_client(access_token=access_token)
        payment_methods = list_payment_method_rows(
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

        return serialize_owned_payment_method(payment_methods[0])
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
