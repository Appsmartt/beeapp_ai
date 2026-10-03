import logging
from datetime import UTC

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
)

from .audit import write_offer_audit_event
from .client import get_user_supabase_client
from .constants import COMMERCIAL_OFFER_IMAGE_COLUMNS
from .image_updates import set_commercial_offer_primary_image
from .queries import get_owned_commercial_offer

logger = logging.getLogger(__name__)


def delete_commercial_offer_image(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    image_id: str,
) -> None:
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

        was_primary = bool(image.get("is_primary"))

        if image.get("status") == "archived":
            raise CommercialStateError(
                "Commercial offer image is already archived.",
                code="COMMERCIAL_OFFER_IMAGE_ALREADY_ARCHIVED",
            )

        archive_response = (
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
        archived_rows = getattr(archive_response, "data", None) or []

        if not archived_rows:
            raise CommercialOperationError(
                "Commercial offer image could not be deleted.",
                code="COMMERCIAL_OFFER_IMAGE_DELETE_FAILED",
            )

        if was_primary:
            next_image_response = (
                supabase.table("commercial_offer_images")
                .select("id")
                .eq("commercial_offer_id", str(offer_id))
                .eq("status", "active")
                .order("sort_order")
                .order("created_at")
                .limit(1)
                .maybe_single()
                .execute()
            )
            next_image = next_image_response.data

            if next_image:
                set_commercial_offer_primary_image(
                    user_id=str(user_id),
                    access_token=access_token,
                    commercial_profile_id=str(commercial_profile_id),
                    offer_id=str(offer_id),
                    image_id=str(next_image["id"]),
                )

        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.image_deleted",
            entity_type="commercial_offer_image",
            entity_id=str(image_id),
            previous_state=str(image.get("status") or "active"),
            new_state=None,
            metadata={
                "file_id": str(image["file_id"]),
                "was_primary": was_primary,
            },
            reference_type="commercial_offer_image",
            reference_id=str(image_id),
        )
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        logger.exception(
            "Commercial offer image delete failed: profile_id=%s "
            "offer_id=%s image_id=%s error=%r",
            commercial_profile_id,
            offer_id,
            image_id,
            error,
        )
        raise CommercialOperationError(
            "Could not delete commercial offer image.",
            code="COMMERCIAL_OFFER_IMAGE_DELETE_FAILED",
        ) from error
