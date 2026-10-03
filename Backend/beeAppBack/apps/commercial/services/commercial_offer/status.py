from datetime import UTC, datetime
from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)

from .audit import write_offer_audit_event
from .client import get_user_supabase_client
from .queries import get_owned_commercial_offer


def set_commercial_offer_status(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    target_status: str,
) -> dict[str, Any]:
    if target_status not in {"published", "paused"}:
        raise CommercialValidationError(
            "Offer status must be published or paused.",
            code="COMMERCIAL_OFFER_STATUS_INVALID",
        )

    current_offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )
    current_status = current_offer["status"]

    if current_status == "archived":
        raise CommercialStateError(
            "Archived offers cannot change publication status.",
            code="COMMERCIAL_OFFER_ARCHIVED",
        )

    if current_status == target_status:
        raise CommercialStateError(
            "Commercial offer is already in the requested status.",
            code="COMMERCIAL_OFFER_STATUS_UNCHANGED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_offers")
            .update({"status": target_status})
            .eq("id", str(offer_id))
            .eq("commercial_profile_id", str(commercial_profile_id))
            .eq("status", current_status)
            .is_("archived_at", "null")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer status could not be updated.",
                code="COMMERCIAL_OFFER_STATUS_UPDATE_FAILED",
            )

        offer = response.data[0]
        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action=(
                "offer.published"
                if target_status == "published"
                else "offer.paused"
            ),
            previous_state=current_status,
            new_state=target_status,
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
        CommercialValidationError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not update commercial offer status.",
            code="COMMERCIAL_OFFER_STATUS_UPDATE_FAILED",
        ) from error


def pause_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
) -> dict[str, Any]:
    return set_commercial_offer_status(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
        target_status="paused",
    )


def publish_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
) -> dict[str, Any]:
    return set_commercial_offer_status(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
        target_status="published",
    )


def archive_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
) -> dict[str, Any]:
    current_offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    if current_offer["status"] == "archived":
        raise CommercialStateError(
            "Commercial offer is already archived.",
            code="COMMERCIAL_OFFER_ALREADY_ARCHIVED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_offers")
            .update(
                {
                    "status": "archived",
                    "archived_at": datetime.now(UTC).isoformat(),
                }
            )
            .eq("id", str(offer_id))
            .eq("commercial_profile_id", str(commercial_profile_id))
            .neq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer could not be archived.",
                code="COMMERCIAL_OFFER_ARCHIVE_FAILED",
            )

        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.archived",
            previous_state=current_offer["status"],
            new_state="archived",
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
            "Could not archive commercial offer.",
            code="COMMERCIAL_OFFER_ARCHIVE_FAILED",
        ) from error


def restore_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
) -> dict[str, Any]:
    current_offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    if current_offer["status"] != "archived":
        raise CommercialStateError(
            "Only archived offers can be restored.",
            code="COMMERCIAL_OFFER_NOT_ARCHIVED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_offers")
            .update(
                {
                    "status": "paused",
                    "archived_at": None,
                }
            )
            .eq("id", str(offer_id))
            .eq("commercial_profile_id", str(commercial_profile_id))
            .eq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer could not be restored.",
                code="COMMERCIAL_OFFER_RESTORE_FAILED",
            )

        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.restored",
            previous_state="archived",
            new_state="paused",
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
            "Could not restore commercial offer.",
            code="COMMERCIAL_OFFER_RESTORE_FAILED",
        ) from error
