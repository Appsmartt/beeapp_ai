import logging
from typing import Any

from apps.commercial.exceptions import (
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_catalog_service import (
    get_owned_commercial_catalog,
)
from apps.storage.exceptions import StorageFileNotFoundError
from apps.storage.services.storage_file_service import get_owned_file

from .client import get_user_supabase_client
from .constants import MAX_COMMERCIAL_OFFER_ACTIVE_IMAGES

logger = logging.getLogger(__name__)


def require_owned_catalog_for_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
) -> dict[str, Any]:
    catalog = get_owned_commercial_catalog(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=str(catalog_id),
    )

    if catalog["status"] == "archived":
        raise CommercialStateError(
            "Archived catalogs cannot receive offers.",
            code="COMMERCIAL_CATALOG_ARCHIVED",
        )

    return catalog


def validate_offer_modalities(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    modalities: list[str],
) -> None:
    if not modalities:
        return

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_profile_modalities")
            .select("modality")
            .eq("commercial_profile_id", str(commercial_profile_id))
            .in_("modality", modalities)
            .execute()
        )
        enabled_modalities = {
            str(item["modality"])
            for item in (response.data or [])
            if item.get("modality")
        }
        invalid_modalities = sorted(set(modalities) - enabled_modalities)

        if invalid_modalities:
            raise CommercialValidationError(
                "Offer modalities must be enabled on the profile.",
                code="COMMERCIAL_OFFER_MODALITY_NOT_ENABLED",
                details={"modalities": invalid_modalities},
            )
    except CommercialValidationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not validate offer modalities.",
            code="COMMERCIAL_OFFER_MODALITY_LOOKUP_FAILED",
        ) from error


def validate_offer_image_file(
    *,
    user_id: str,
    file_id: str,
) -> dict[str, Any]:
    try:
        file_record = get_owned_file(
            user_id=str(user_id),
            file_id=str(file_id),
            include_trashed=True,
        )

        if file_record.get("status") != "ready":
            raise CommercialValidationError(
                "The selected image file is not ready.",
                code="COMMERCIAL_OFFER_IMAGE_FILE_NOT_READY",
            )

        if file_record.get("kind") != "image":
            raise CommercialValidationError(
                "The selected file must be an image.",
                code="COMMERCIAL_OFFER_IMAGE_FILE_KIND_INVALID",
            )

        if file_record.get("trashed_at") is not None:
            raise CommercialValidationError(
                "The selected image file is in trash.",
                code="COMMERCIAL_OFFER_IMAGE_FILE_TRASHED",
            )

        return file_record
    except CommercialValidationError:
        raise
    except StorageFileNotFoundError as error:
        raise CommercialValidationError(
            "The selected image file was not found.",
            code="COMMERCIAL_OFFER_IMAGE_FILE_NOT_FOUND",
        ) from error
    except Exception as error:
        logger.exception(
            "Commercial offer image file validation failed: "
            "user_id=%s file_id=%s error=%s",
            user_id,
            file_id,
            str(error),
        )
        raise CommercialOperationError(
            "Could not validate offer image file.",
            code="COMMERCIAL_OFFER_IMAGE_FILE_LOOKUP_FAILED",
        ) from error


def count_active_commercial_offer_images(
    *,
    supabase,
    offer_id: str,
) -> int:
    response = (
        supabase.table("commercial_offer_images")
        .select("id", count="exact")
        .eq("commercial_offer_id", str(offer_id))
        .eq("status", "active")
        .is_("archived_at", "null")
        .execute()
    )
    return int(response.count or 0)


def ensure_commercial_offer_image_capacity(
    *,
    supabase,
    offer_id: str,
) -> None:
    active_image_count = count_active_commercial_offer_images(
        supabase=supabase,
        offer_id=str(offer_id),
    )

    if active_image_count >= MAX_COMMERCIAL_OFFER_ACTIVE_IMAGES:
        raise CommercialValidationError(
            "Each commercial offer can have at most 5 active images.",
            code="COMMERCIAL_OFFER_IMAGE_LIMIT_REACHED",
            details={
                "max_active_images": MAX_COMMERCIAL_OFFER_ACTIVE_IMAGES,
                "active_image_count": active_image_count,
            },
        )


def validate_merged_offer(*, offer: dict[str, Any]) -> None:
    pricing_strategy = offer["pricing_strategy"]
    base_price_amount = offer.get("base_price_amount")

    if pricing_strategy in {"fixed", "starting_at"}:
        if base_price_amount is None:
            raise CommercialValidationError(
                "Fixed and starting-at pricing require a base price.",
                code="COMMERCIAL_OFFER_PRICE_INVALID",
            )
    elif base_price_amount is not None:
        raise CommercialValidationError(
            "Free and to-be-confirmed pricing cannot include a base price.",
            code="COMMERCIAL_OFFER_PRICE_INVALID",
        )

    offer_kind = offer["offer_kind"]
    track_inventory = bool(offer["track_inventory"])
    stock_quantity = offer.get("stock_quantity")
    duration_minutes = offer.get("duration_minutes")
    requires_booking = bool(offer["requires_booking"])
    payment_policy = offer.get("payment_policy")

    if offer_kind == "product":
        if (
            requires_booking
            or duration_minutes is not None
            or payment_policy is not None
        ):
            raise CommercialValidationError(
                "Products cannot include booking, duration, or payment policy.",
                code="COMMERCIAL_OFFER_PRODUCT_SHAPE_INVALID",
            )

        if track_inventory != bool(stock_quantity is not None):
            raise CommercialValidationError(
                "Product stock quantity must match inventory tracking.",
                code="COMMERCIAL_OFFER_PRODUCT_SHAPE_INVALID",
            )
    elif offer_kind == "service":
        if track_inventory or stock_quantity is not None:
            raise CommercialValidationError(
                "Services cannot track inventory.",
                code="COMMERCIAL_OFFER_SERVICE_SHAPE_INVALID",
            )

        if payment_policy is None:
            raise CommercialValidationError(
                "Services require a payment policy.",
                code="COMMERCIAL_OFFER_SERVICE_SHAPE_INVALID",
            )

        if requires_booking != bool(duration_minutes is not None):
            raise CommercialValidationError(
                "Booked services require duration and unbooked services cannot include it.",
                code="COMMERCIAL_OFFER_SERVICE_SHAPE_INVALID",
            )
