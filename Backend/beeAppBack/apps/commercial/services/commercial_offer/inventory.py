from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)

from .client import get_user_supabase_client
from .queries import get_owned_commercial_offer


def adjust_commercial_offer_inventory(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    quantity_delta: int,
    reason_code: str,
    reason_text: str | None = None,
) -> dict[str, Any]:
    get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = supabase.rpc(
            "commerce_adjust_offer_inventory",
            {
                "p_commercial_profile_id": str(commercial_profile_id),
                "p_offer_id": str(offer_id),
                "p_quantity_delta": int(quantity_delta),
                "p_reason_code": str(reason_code).strip(),
                "p_reason_text": reason_text,
            },
        ).execute()

        new_stock_quantity = getattr(response, "data", None)

        if isinstance(new_stock_quantity, list):
            new_stock_quantity = (
                new_stock_quantity[0]
                if new_stock_quantity
                else None
            )

        if (
            new_stock_quantity is None
            or isinstance(new_stock_quantity, bool)
        ):
            raise CommercialOperationError(
                "Could not adjust commercial offer inventory.",
                code="COMMERCIAL_INVENTORY_ADJUST_FAILED",
            )

        offer = get_owned_commercial_offer(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            offer_id=str(offer_id),
        )

        if int(offer.get("stock_quantity")) != int(
            new_stock_quantity
        ):
            raise CommercialOperationError(
                "Inventory adjustment result could not be verified.",
                code="COMMERCIAL_INVENTORY_ADJUST_FAILED",
            )

        return offer

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
            "Could not adjust commercial offer inventory.",
            code="COMMERCIAL_INVENTORY_ADJUST_FAILED",
        ) from error
