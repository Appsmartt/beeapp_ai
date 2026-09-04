from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_child_profile,
    require_commercial_profile_owner,
)
from apps.commercial.services.commercial_catalog_service import (
    get_owned_commercial_catalog,
)
from apps.commercial.services.commercial_supabase_service import (
    get_commercial_user_supabase_client,
)
from apps.storage.exceptions import (
    StorageFileNotFoundError,
)
from apps.storage.services.storage_file_service import (
    get_owned_file,
)


COMMERCIAL_OFFER_COLUMNS = (
    "id,commercial_profile_id,catalog_id,offer_kind,title,"
    "description,pricing_strategy,base_price_amount,currency_code,"
    "is_available,sort_order,status,archived_at,track_inventory,"
    "stock_quantity,duration_minutes,requires_booking,payment_policy,"
    "created_at,updated_at"
)

COMMERCIAL_OFFER_MODALITY_COLUMNS = (
    "id,commercial_offer_id,modality,status,archived_at,created_at,"
    "updated_at"
)

COMMERCIAL_OFFER_IMAGE_COLUMNS = (
    "id,commercial_offer_id,file_id,sort_order,is_primary,status,"
    "archived_at,created_at,updated_at"
)


def _get_user_supabase_client(
    *,
    access_token: str,
):
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialAccessError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    return get_commercial_user_supabase_client(
        access_token=normalized_access_token,
    )


def _serialize_offer(
    *,
    offer: dict[str, Any],
    modalities: list[dict[str, Any]] | None = None,
    images: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "id": str(offer["id"]),
        "commercial_profile_id": str(
            offer["commercial_profile_id"]
        ),
        "catalog_id": str(offer["catalog_id"]),
        "offer_kind": offer["offer_kind"],
        "title": offer["title"],
        "description": offer.get("description"),
        "pricing_strategy": offer["pricing_strategy"],
        "base_price_amount": offer.get("base_price_amount"),
        "currency_code": offer["currency_code"],
        "is_available": bool(offer["is_available"]),
        "sort_order": offer["sort_order"],
        "status": offer["status"],
        "archived_at": offer.get("archived_at"),
        "track_inventory": bool(offer["track_inventory"]),
        "stock_quantity": offer.get("stock_quantity"),
        "duration_minutes": offer.get("duration_minutes"),
        "requires_booking": bool(offer["requires_booking"]),
        "payment_policy": offer.get("payment_policy"),
        "modalities": modalities or [],
        "images": images or [],
        "created_at": offer.get("created_at"),
        "updated_at": offer.get("updated_at"),
    }


def _get_offer_relations(
    *,
    supabase,
    offer_id: str,
    include_archived_images: bool = True,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    modalities_query = (
        supabase.table("commercial_offer_modalities")
        .select(COMMERCIAL_OFFER_MODALITY_COLUMNS)
        .eq("commercial_offer_id", str(offer_id))
        .order("created_at")
    )

    if not include_archived_images:
        modalities_query = modalities_query.eq("status", "active")

    modalities_response = modalities_query.execute()

    images_query = (
        supabase.table("commercial_offer_images")
        .select(COMMERCIAL_OFFER_IMAGE_COLUMNS)
        .eq("commercial_offer_id", str(offer_id))
        .order("is_primary", desc=True)
        .order("sort_order")
        .order("created_at")
    )

    if not include_archived_images:
        images_query = images_query.eq("status", "active")

    images_response = images_query.execute()

    return (
        modalities_response.data or [],
        images_response.data or [],
    )


def _write_offer_audit_event(
    *,
    supabase,
    commercial_profile_id: str,
    actor_profile_id: str,
    offer_id: str,
    action: str,
    previous_state: str | None,
    new_state: str | None,
    metadata: dict[str, Any],
    entity_type: str = "commercial_offer",
    entity_id: str | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
) -> None:
    try:
        response = (
            supabase.rpc(
                "commerce_write_audit_event",
                {
                    "p_commercial_profile_id": str(
                        commercial_profile_id
                    ),
                    "p_actor_profile_id": str(actor_profile_id),
                    "p_entity_type": str(entity_type),
                    "p_entity_id": str(entity_id or offer_id),
                    "p_action": action,
                    "p_previous_state": previous_state,
                    "p_new_state": new_state,
                    "p_reason_code": None,
                    "p_reason_text": None,
                    "p_reference_type": reference_type,
                    "p_reference_id": (
                        str(reference_id)
                        if reference_id is not None
                        else None
                    ),
                    "p_metadata": metadata,
                },
            )
            .execute()
        )

        if not getattr(response, "data", None):
            raise CommercialOperationError(
                "Could not write offer audit event.",
                code="COMMERCIAL_OFFER_AUDIT_FAILED",
            )

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not write offer audit event.",
            code="COMMERCIAL_OFFER_AUDIT_FAILED",
        ) from error


def _require_owned_catalog_for_offer(
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


def _validate_offer_modalities(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    modalities: list[str],
) -> None:
    if not modalities:
        return

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_profile_modalities")
            .select("modality")
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .in_("modality", modalities)
            .execute()
        )

        enabled_modalities = {
            str(item["modality"])
            for item in (response.data or [])
            if item.get("modality")
        }

        invalid_modalities = sorted(
            set(modalities) - enabled_modalities
        )

        if invalid_modalities:
            raise CommercialValidationError(
                "Offer modalities must be enabled on the profile.",
                code="COMMERCIAL_OFFER_MODALITY_NOT_ENABLED",
                details={
                    "modalities": invalid_modalities,
                },
            )

    except CommercialValidationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not validate offer modalities.",
            code="COMMERCIAL_OFFER_MODALITY_LOOKUP_FAILED",
        ) from error


def _validate_offer_image_file(
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
        raise CommercialOperationError(
            "Could not validate offer image file.",
            code="COMMERCIAL_OFFER_IMAGE_FILE_LOOKUP_FAILED",
        ) from error


def list_owned_commercial_offers(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str | None = None,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    if catalog_id is not None:
        _require_owned_catalog_for_offer(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            catalog_id=str(catalog_id),
        )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        query = (
            supabase.table("commercial_offers")
            .select(COMMERCIAL_OFFER_COLUMNS)
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .order("sort_order")
            .order("created_at")
        )

        if catalog_id is not None:
            query = query.eq("catalog_id", str(catalog_id))

        if not include_archived:
            query = query.neq("status", "archived")

        response = query.execute()
        offers = response.data or []

        result = []

        for offer in offers:
            modalities, images = _get_offer_relations(
                supabase=supabase,
                offer_id=str(offer["id"]),
                include_archived_images=include_archived,
            )
            result.append(
                _serialize_offer(
                    offer=offer,
                    modalities=modalities,
                    images=images,
                )
            )

        return result

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial offers.",
            code="COMMERCIAL_OFFER_LIST_FAILED",
        ) from error


def get_owned_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
) -> dict[str, Any]:
    require_commercial_child_profile(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
        child_table="commercial_offers",
        child_id=str(offer_id),
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_offers")
            .select(COMMERCIAL_OFFER_COLUMNS)
            .eq("id", str(offer_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .maybe_single()
            .execute()
        )

        offer = response.data

        if not offer:
            raise CommercialNotFoundError(
                "Commercial offer was not found.",
                code="COMMERCIAL_OFFER_NOT_FOUND",
            )

        modalities, images = _get_offer_relations(
            supabase=supabase,
            offer_id=str(offer_id),
            include_archived_images=True,
        )

        return _serialize_offer(
            offer=offer,
            modalities=modalities,
            images=images,
        )

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial offer.",
            code="COMMERCIAL_OFFER_LOOKUP_FAILED",
        ) from error


def create_commercial_offer(
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

    catalog_id = str(payload["catalog_id"])

    _require_owned_catalog_for_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=catalog_id,
    )

    modalities = payload.get("modalities", [])
    _validate_offer_modalities(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        modalities=modalities,
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        offer_payload = {
            "commercial_profile_id": str(
                commercial_profile_id
            ),
            "catalog_id": catalog_id,
            "offer_kind": payload["offer_kind"],
            "title": payload["title"],
            "description": payload.get("description"),
            "pricing_strategy": payload["pricing_strategy"],
            "base_price_amount": payload.get(
                "base_price_amount"
            ),
            "currency_code": payload["currency_code"],
            "is_available": payload["is_available"],
            "sort_order": payload["sort_order"],
            "status": payload["status"],
            "track_inventory": payload["track_inventory"],
            "stock_quantity": payload.get("stock_quantity"),
            "duration_minutes": payload.get(
                "duration_minutes"
            ),
            "requires_booking": payload["requires_booking"],
            "payment_policy": payload.get(
                "payment_policy"
            ),
        }

        response = (
            supabase.table("commercial_offers")
            .insert(offer_payload)
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Supabase did not return the created offer.",
                code="COMMERCIAL_OFFER_CREATE_FAILED",
            )

        offer = response.data[0]
        offer_id = str(offer["id"])

        if modalities:
            modalities_response = (
                supabase.table("commercial_offer_modalities")
                .insert(
                    [
                        {
                            "commercial_offer_id": offer_id,
                            "modality": modality,
                        }
                        for modality in modalities
                    ]
                )
                .execute()
            )

            if len(modalities_response.data or []) != len(
                modalities
            ):
                raise CommercialOperationError(
                    "Could not create all offer modalities.",
                    code="COMMERCIAL_OFFER_MODALITY_CREATE_FAILED",
                )

        _write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=offer_id,
            action="offer.created",
            previous_state=None,
            new_state=offer["status"],
            metadata={
                "catalog_id": catalog_id,
                "offer_kind": offer["offer_kind"],
                "title": offer["title"],
            },
        )

        return get_owned_commercial_offer(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            offer_id=offer_id,
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
            "Could not create commercial offer.",
            code="COMMERCIAL_OFFER_CREATE_FAILED",
        ) from error


def update_commercial_offer(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    current_offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    if current_offer["status"] == "archived":
        raise CommercialStateError(
            "Archived offers cannot be edited.",
            code="COMMERCIAL_OFFER_ARCHIVED",
        )

    updated_catalog_id = payload.get("catalog_id")

    if updated_catalog_id is not None:
        _require_owned_catalog_for_offer(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            catalog_id=str(updated_catalog_id),
        )

    merged_offer = {
        **current_offer,
        **{
            key: value
            for key, value in payload.items()
            if key != "catalog_id"
        },
    }

    if updated_catalog_id is not None:
        merged_offer["catalog_id"] = str(updated_catalog_id)

    _validate_merged_offer(
        offer=merged_offer,
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        normalized_payload = {
            key: (
                str(value)
                if key == "catalog_id"
                else value
            )
            for key, value in payload.items()
        }

        response = (
            supabase.table("commercial_offers")
            .update(normalized_payload)
            .eq("id", str(offer_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .neq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer could not be updated.",
                code="COMMERCIAL_OFFER_UPDATE_FAILED",
            )

        offer = response.data[0]

        _write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.updated",
            previous_state=current_offer["status"],
            new_state=offer["status"],
            metadata={
                "updated_fields": sorted(payload.keys()),
            },
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
            "Could not update commercial offer.",
            code="COMMERCIAL_OFFER_UPDATE_FAILED",
        ) from error


def _validate_merged_offer(
    *,
    offer: dict[str, Any],
) -> None:
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

        if track_inventory != bool(
            stock_quantity is not None
        ):
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

        if requires_booking != bool(
            duration_minutes is not None
        ):
            raise CommercialValidationError(
                "Booked services require duration and unbooked services cannot include it.",
                code="COMMERCIAL_OFFER_SERVICE_SHAPE_INVALID",
            )


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
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_offers")
            .update(
                {
                    "status": target_status,
                }
            )
            .eq("id", str(offer_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
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

        _write_offer_audit_event(
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
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_offers")
            .update(
                {
                    "status": "archived",
                    "archived_at": datetime.now(
                        UTC
                    ).isoformat(),
                }
            )
            .eq("id", str(offer_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .neq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer could not be archived.",
                code="COMMERCIAL_OFFER_ARCHIVE_FAILED",
            )

        offer = response.data[0]

        _write_offer_audit_event(
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
        supabase = _get_user_supabase_client(
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
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .eq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer could not be restored.",
                code="COMMERCIAL_OFFER_RESTORE_FAILED",
            )

        offer = response.data[0]

        _write_offer_audit_event(
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
    _validate_offer_image_file(
        user_id=str(user_id),
        file_id=file_id,
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
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

            if primary_response.data:
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

        _write_offer_audit_event(
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

        return {
            "id": str(image["id"]),
            "commercial_offer_id": str(
                image["commercial_offer_id"]
            ),
            "file_id": str(image["file_id"]),
            "sort_order": image["sort_order"],
            "is_primary": bool(image["is_primary"]),
            "status": image["status"],
            "archived_at": image.get("archived_at"),
            "created_at": image.get("created_at"),
            "updated_at": image.get("updated_at"),
        }

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
            "Could not add commercial offer image.",
            code="COMMERCIAL_OFFER_IMAGE_CREATE_FAILED",
        ) from error


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
        supabase = _get_user_supabase_client(
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
                    "archived_at": datetime.now(
                        UTC
                    ).isoformat(),
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

        _write_offer_audit_event(
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

        return {
            "id": str(archived_image["id"]),
            "commercial_offer_id": str(
                archived_image["commercial_offer_id"]
            ),
            "file_id": str(archived_image["file_id"]),
            "sort_order": archived_image["sort_order"],
            "is_primary": bool(
                archived_image["is_primary"]
            ),
            "status": archived_image["status"],
            "archived_at": archived_image.get("archived_at"),
            "created_at": archived_image.get("created_at"),
            "updated_at": archived_image.get("updated_at"),
        }

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
        supabase = _get_user_supabase_client(
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

            if active_primary_response.data:
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

        _write_offer_audit_event(
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

        return {
            "id": str(restored_image["id"]),
            "commercial_offer_id": str(
                restored_image["commercial_offer_id"]
            ),
            "file_id": str(restored_image["file_id"]),
            "sort_order": restored_image["sort_order"],
            "is_primary": bool(
                restored_image["is_primary"]
            ),
            "status": restored_image["status"],
            "archived_at": restored_image.get("archived_at"),
            "created_at": restored_image.get("created_at"),
            "updated_at": restored_image.get("updated_at"),
        }

    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not restore commercial offer image.",
            code="COMMERCIAL_OFFER_IMAGE_RESTORE_FAILED",
        ) from error


def update_commercial_offer_modalities(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    offer_id: str,
    modalities: list[str],
) -> dict[str, Any]:
    offer = get_owned_commercial_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        offer_id=str(offer_id),
    )

    if offer["status"] == "archived":
        raise CommercialStateError(
            "Archived offers cannot update modalities.",
            code="COMMERCIAL_OFFER_ARCHIVED",
        )

    normalized_modalities = list(
        dict.fromkeys(str(modality) for modality in modalities)
    )

    _validate_offer_modalities(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        modalities=normalized_modalities,
    )

    try:
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_offer_modalities")
            .select(COMMERCIAL_OFFER_MODALITY_COLUMNS)
            .eq("commercial_offer_id", str(offer_id))
            .execute()
        )

        existing_rows = response.data or []
        existing_by_modality = {
            str(row["modality"]): row
            for row in existing_rows
        }

        desired_set = set(normalized_modalities)
        active_modalities = {
            str(row["modality"])
            for row in existing_rows
            if row.get("status") == "active"
        }
        archived_modalities = {
            str(row["modality"])
            for row in existing_rows
            if row.get("status") == "archived"
        }

        to_archive = sorted(
            active_modalities - desired_set
        )
        to_restore = sorted(
            archived_modalities & desired_set
        )
        to_create = sorted(
            desired_set - set(existing_by_modality)
        )

        archived_at = datetime.now(UTC).isoformat()

        for modality in to_archive:
            (
                supabase.table("commercial_offer_modalities")
                .update(
                    {
                        "status": "archived",
                        "archived_at": archived_at,
                    }
                )
                .eq("commercial_offer_id", str(offer_id))
                .eq("modality", modality)
                .eq("status", "active")
                .execute()
            )

        for modality in to_restore:
            (
                supabase.table("commercial_offer_modalities")
                .update(
                    {
                        "status": "active",
                        "archived_at": None,
                    }
                )
                .eq("commercial_offer_id", str(offer_id))
                .eq("modality", modality)
                .eq("status", "archived")
                .execute()
            )

        if to_create:
            insert_response = (
                supabase.table("commercial_offer_modalities")
                .insert(
                    [
                        {
                            "commercial_offer_id": str(offer_id),
                            "modality": modality,
                            "status": "active",
                        }
                        for modality in to_create
                    ]
                )
                .execute()
            )

            if len(insert_response.data or []) != len(
                to_create
            ):
                raise CommercialOperationError(
                    "Could not create all offer modalities.",
                    code="COMMERCIAL_OFFER_MODALITY_CREATE_FAILED",
                )

        _write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.modalities_updated",
            previous_state=offer["status"],
            new_state=offer["status"],
            metadata={
                "modalities": normalized_modalities,
                "archived_modalities": to_archive,
                "restored_modalities": to_restore,
                "created_modalities": to_create,
            },
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
            "Could not update commercial offer modalities.",
            code="COMMERCIAL_OFFER_MODALITIES_UPDATE_FAILED",
        ) from error


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
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.rpc(
                "commerce_set_offer_primary_image",
                {
                    "p_commercial_profile_id": str(
                        commercial_profile_id
                    ),
                    "p_offer_id": str(offer_id),
                    "p_image_id": str(image_id),
                },
            )
            .execute()
        )

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

        return {
            "id": str(image["id"]),
            "commercial_offer_id": str(
                image["commercial_offer_id"]
            ),
            "file_id": str(image["file_id"]),
            "sort_order": image["sort_order"],
            "is_primary": bool(image["is_primary"]),
            "status": image["status"],
            "archived_at": image.get("archived_at"),
            "created_at": image.get("created_at"),
            "updated_at": image.get("updated_at"),
        }

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
        supabase = _get_user_supabase_client(
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
            .update(
                {
                    "sort_order": payload["sort_order"],
                }
            )
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

        _write_offer_audit_event(
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

        return {
            "id": str(updated_image["id"]),
            "commercial_offer_id": str(
                updated_image["commercial_offer_id"]
            ),
            "file_id": str(updated_image["file_id"]),
            "sort_order": updated_image["sort_order"],
            "is_primary": bool(updated_image["is_primary"]),
            "status": updated_image["status"],
            "archived_at": updated_image.get("archived_at"),
            "created_at": updated_image.get("created_at"),
            "updated_at": updated_image.get("updated_at"),
        }

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
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_offers")
            .update(
                {
                    "is_available": normalized_is_available,
                }
            )
            .eq("id", str(offer_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .neq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer availability could not be updated.",
                code="COMMERCIAL_OFFER_AVAILABILITY_UPDATE_FAILED",
            )

        offer = response.data[0]

        _write_offer_audit_event(
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
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.rpc(
                "commerce_adjust_offer_inventory",
                {
                    "p_commercial_profile_id": str(
                        commercial_profile_id
                    ),
                    "p_offer_id": str(offer_id),
                    "p_quantity_delta": int(quantity_delta),
                    "p_reason_code": str(reason_code).strip(),
                    "p_reason_text": reason_text,
                },
            )
            .execute()
        )

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
