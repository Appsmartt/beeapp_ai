import logging
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
from .validation import (
    ensure_commercial_offer_image_capacity,
    validate_offer_image_file,
    validate_offer_modalities,
)

logger = logging.getLogger(__name__)


def add_commercial_offer_image(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
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
            "Archived offers cannot receive images.",
            code="COMMERCIAL_OFFER_ARCHIVED",
        )

    file_id = str(payload["file_id"])
    validate_offer_image_file(
        user_id=str(user_id),
        file_id=file_id,
    )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        ensure_commercial_offer_image_capacity(
            supabase=supabase,
            offer_id=str(offer_id),
        )

        if payload["is_primary"]:
            primary_response = (
                supabase.table("commercial_offer_images")
                .select("id")
                .eq("commercial_offer_id", str(offer_id))
                .eq("status", "active")
                .eq("is_primary", True)
                .maybe_single()
                .execute()
            )

            if getattr(primary_response, "data", None):
                raise CommercialStateError(
                    "An active primary image already exists.",
                    code="COMMERCIAL_OFFER_PRIMARY_IMAGE_EXISTS",
                )

        response = (
            supabase.table("commercial_offer_images")
            .insert(
                {
                    "commercial_offer_id": str(offer_id),
                    "file_id": file_id,
                    "sort_order": payload["sort_order"],
                    "is_primary": payload["is_primary"],
                    "status": "active",
                }
            )
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Supabase did not return the created offer image.",
                code="COMMERCIAL_OFFER_IMAGE_CREATE_FAILED",
            )

        image = response.data[0]
        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.image_added",
            entity_type="commercial_offer_image",
            entity_id=str(image["id"]),
            previous_state=None,
            new_state="active",
            metadata={
                "is_primary": bool(image["is_primary"]),
                "sort_order": image["sort_order"],
            },
            reference_type="commercial_offer_image",
            reference_id=str(image["id"]),
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
        logger.exception(
            "Commercial offer image add failed: profile_id=%s "
            "offer_id=%s file_id=%s payload_keys=%s error=%s",
            commercial_profile_id,
            offer_id,
            payload.get("file_id"),
            sorted(payload.keys()),
            str(error),
        )
        raise CommercialOperationError(
            "Could not add commercial offer image.",
            code="COMMERCIAL_OFFER_IMAGE_CREATE_FAILED",
        ) from error
