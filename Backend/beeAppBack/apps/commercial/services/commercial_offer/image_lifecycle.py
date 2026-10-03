from datetime import UTC
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
from .constants import COMMERCIAL_OFFER_IMAGE_COLUMNS
from .queries import get_owned_commercial_offer
from .serialization import serialize_offer_image
from .validation import ensure_commercial_offer_image_capacity


def archive_commercial_offer_image(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    image_id: str,
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
        image_response = (
            supabase.table("commercial_offer_images")
            .select(COMMERCIAL_OFFER_IMAGE_COLUMNS)
            .eq("id", str(image_id))
            .eq("commercial_offer_id", str(offer_id))
            .maybe_single()
            .execute()
        )
        image = image_response.data

        if not image:
            raise CommercialNotFoundError(
                "Commercial offer image was not found.",
                code="COMMERCIAL_OFFER_IMAGE_NOT_FOUND",
            )

        if image["status"] == "archived":
            raise CommercialStateError(
                "Commercial offer image is already archived.",
                code="COMMERCIAL_OFFER_IMAGE_ALREADY_ARCHIVED",
            )

        response = (
            supabase.table("commercial_offer_images")
            .update(
                {
                    "status": "archived",
                    "archived_at": datetime.now(UTC).isoformat(),
                }
            )
            .eq("id", str(image_id))
            .eq("commercial_offer_id", str(offer_id))
            .eq("status", "active")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer image could not be archived.",
                code="COMMERCIAL_OFFER_IMAGE_ARCHIVE_FAILED",
            )

        archived_image = response.data[0]
        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.image_archived",
            entity_type="commercial_offer_image",
            entity_id=str(image_id),
            previous_state="active",
            new_state="archived",
            metadata={},
            reference_type="commercial_offer_image",
            reference_id=str(image_id),
        )

        return serialize_offer_image(image=archived_image)
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not archive commercial offer image.",
            code="COMMERCIAL_OFFER_IMAGE_ARCHIVE_FAILED",
        ) from error


def restore_commercial_offer_image(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    image_id: str,
) -> dict[str, Any]:
    offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    if offer["status"] == "archived":
        raise CommercialStateError(
            "Archived offers cannot restore images.",
            code="COMMERCIAL_OFFER_ARCHIVED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        image_response = (
            supabase.table("commercial_offer_images")
            .select(COMMERCIAL_OFFER_IMAGE_COLUMNS)
            .eq("id", str(image_id))
            .eq("commercial_offer_id", str(offer_id))
            .maybe_single()
            .execute()
        )
        image = image_response.data

        if not image:
            raise CommercialNotFoundError(
                "Commercial offer image was not found.",
                code="COMMERCIAL_OFFER_IMAGE_NOT_FOUND",
            )

        if image["status"] != "archived":
            raise CommercialStateError(
                "Only archived offer images can be restored.",
                code="COMMERCIAL_OFFER_IMAGE_NOT_ARCHIVED",
            )

        ensure_commercial_offer_image_capacity(
            supabase=supabase,
            offer_id=str(offer_id),
        )

        if image["is_primary"]:
            active_primary_response = (
                supabase.table("commercial_offer_images")
                .select("id")
                .eq("commercial_offer_id", str(offer_id))
                .eq("status", "active")
                .eq("is_primary", True)
                .maybe_single()
                .execute()
            )

            if getattr(active_primary_response, "data", None):
                raise CommercialStateError(
                    "An active primary image already exists.",
                    code="COMMERCIAL_OFFER_PRIMARY_IMAGE_EXISTS",
                )

        response = (
            supabase.table("commercial_offer_images")
            .update(
                {
                    "status": "active",
                    "archived_at": None,
                }
            )
            .eq("id", str(image_id))
            .eq("commercial_offer_id", str(offer_id))
            .eq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer image could not be restored.",
                code="COMMERCIAL_OFFER_IMAGE_RESTORE_FAILED",
            )

        restored_image = response.data[0]
        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.image_restored",
            entity_type="commercial_offer_image",
            entity_id=str(image_id),
            previous_state="archived",
            new_state="active",
            metadata={},
            reference_type="commercial_offer_image",
            reference_id=str(image_id),
        )

        return serialize_offer_image(image=restored_image)
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
            "Could not restore commercial offer image.",
            code="COMMERCIAL_OFFER_IMAGE_RESTORE_FAILED",
        ) from error
