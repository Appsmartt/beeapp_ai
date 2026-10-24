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
from .constants import (
    COMMERCIAL_OFFER_IMAGE_COLUMNS,
    COMMERCIAL_OFFER_MODALITY_COLUMNS,
)
from .queries import get_owned_commercial_offer
from .serialization import serialize_offer_image
from .validation import validate_offer_modalities


def set_commercial_offer_primary_image(
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
        response = supabase.rpc(
            "commerce_set_offer_primary_image",
            {
                "p_commercial_profile_id": str(commercial_profile_id),
                "p_offer_id": str(offer_id),
                "p_image_id": str(image_id),
            },
        ).execute()

        returned_image_id = getattr(response, "data", None)

        if isinstance(returned_image_id, list):
            returned_image_id = (
                returned_image_id[0]
                if returned_image_id
                else None
            )

        if str(returned_image_id or "") != str(image_id):
            raise CommercialOperationError(
                "Could not set the primary offer image.",
                code="COMMERCIAL_OFFER_PRIMARY_IMAGE_UPDATE_FAILED",
            )

        image_response = (
            supabase.table("commercial_offer_images")
            .select(COMMERCIAL_OFFER_IMAGE_COLUMNS)
            .eq("id", str(image_id))
            .eq("commercial_offer_id", str(offer_id))
            .eq("status", "active")
            .eq("is_primary", True)
            .maybe_single()
            .execute()
        )
        image = image_response.data

        if not image:
            raise CommercialNotFoundError(
                "Commercial offer image was not found.",
                code="COMMERCIAL_OFFER_IMAGE_NOT_FOUND",
            )

        return serialize_offer_image(image=image)
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
            "Could not set the primary offer image.",
            code="COMMERCIAL_OFFER_PRIMARY_IMAGE_UPDATE_FAILED",
        ) from error


def update_commercial_offer_image(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    image_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    if offer["status"] == "archived":
        raise CommercialStateError(
            "Archived offers cannot update images.",
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

        if image["status"] == "archived":
            raise CommercialStateError(
                "Archived offer images cannot be edited.",
                code="COMMERCIAL_OFFER_IMAGE_ARCHIVED",
            )

        response = (
            supabase.table("commercial_offer_images")
            .update({"sort_order": payload["sort_order"]})
            .eq("id", str(image_id))
            .eq("commercial_offer_id", str(offer_id))
            .eq("status", "active")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer image could not be updated.",
                code="COMMERCIAL_OFFER_IMAGE_UPDATE_FAILED",
            )

        updated_image = response.data[0]
        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.image_updated",
            entity_type="commercial_offer_image",
            entity_id=str(image_id),
            previous_state="active",
            new_state="active",
            metadata={
                "updated_fields": ["sort_order"],
                "sort_order": updated_image["sort_order"],
            },
            reference_type="commercial_offer_image",
            reference_id=str(image_id),
        )

        return serialize_offer_image(image=updated_image)
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not update commercial offer image.",
            code="COMMERCIAL_OFFER_IMAGE_UPDATE_FAILED",
        ) from error
