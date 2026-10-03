from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
)

from .audit import write_offer_audit_event
from .client import get_user_supabase_client
from .queries import get_owned_commercial_offer


def set_commercial_offer_availability(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    is_available: bool,
) -> dict[str, Any]:
    current_offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    if current_offer["status"] == "archived":
        raise CommercialStateError(
            "Archived offers cannot change availability.",
            code="COMMERCIAL_OFFER_ARCHIVED",
        )

    normalized_is_available = bool(is_available)

    if bool(current_offer["is_available"]) == normalized_is_available:
        raise CommercialStateError(
            "Commercial offer already has the requested availability.",
            code="COMMERCIAL_OFFER_AVAILABILITY_UNCHANGED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_offers")
            .update({"is_available": normalized_is_available})
            .eq("id", str(offer_id))
            .eq("commercial_profile_id", str(commercial_profile_id))
            .neq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer availability could not be updated.",
                code="COMMERCIAL_OFFER_AVAILABILITY_UPDATE_FAILED",
            )

        offer = response.data[0]
        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action=(
                "offer.enabled"
                if normalized_is_available
                else "offer.disabled"
            ),
            previous_state=(
                "available"
                if current_offer["is_available"]
                else "unavailable"
            ),
            new_state=(
                "available"
                if offer["is_available"]
                else "unavailable"
            ),
            metadata={},
        )

        return get_owned_commercial_offer(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            offer_id=str(offer_id),
        )
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not update commercial offer availability.",
            code="COMMERCIAL_OFFER_AVAILABILITY_UPDATE_FAILED",
        ) from error


def enable_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
) -> dict[str, Any]:
    return set_commercial_offer_availability(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
        is_available=True,
    )


def disable_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
) -> dict[str, Any]:
    return set_commercial_offer_availability(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
        is_available=False,
    )
