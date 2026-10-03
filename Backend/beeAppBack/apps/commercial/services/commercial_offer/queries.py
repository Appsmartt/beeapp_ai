from datetime import UTC, datetime
from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_child_profile,
    require_commercial_profile_owner,
)

from .client import get_user_supabase_client
from .constants import COMMERCIAL_OFFER_COLUMNS
from .relations import get_offer_relations
from .serialization import serialize_offer
from .validation import require_owned_catalog_for_offer


def _get_inventory_summary(
    *,
    supabase,
    offer: dict[str, Any],
) -> tuple[int | None, int | None]:
    if (
        offer.get("offer_kind") != "product"
        or not bool(offer.get("track_inventory"))
    ):
        return None, None

    hold_response = (
        supabase.table("commerce_inventory_holds")
        .select("quantity")
        .eq("commercial_offer_id", str(offer["id"]))
        .eq("status", "active")
        .gt("expires_at", datetime.now(UTC).isoformat())
        .execute()
    )
    reserved_inventory = sum(
        int(row.get("quantity") or 0)
        for row in (hold_response.data or [])
    )
    available_inventory = max(
        int(offer.get("stock_quantity") or 0) - reserved_inventory,
        0,
    )
    return reserved_inventory, available_inventory


def _serialize_owned_offer(
    *,
    supabase,
    user_id: str,
    offer: dict[str, Any],
    include_archived_images: bool,
) -> dict[str, Any]:
    modalities, images = get_offer_relations(
        supabase=supabase,
        user_id=str(user_id),
        offer_id=str(offer["id"]),
        include_archived_images=include_archived_images,
    )
    reserved_inventory, available_inventory = _get_inventory_summary(
        supabase=supabase,
        offer=offer,
    )
    return serialize_offer(
        offer=offer,
        modalities=modalities,
        images=images,
        reserved_inventory=reserved_inventory,
        available_inventory=available_inventory,
    )


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
        require_owned_catalog_for_offer(
            user_id=str(user_id),
            access_token=access_token,
            commercial_profile_id=str(commercial_profile_id),
            catalog_id=str(catalog_id),
        )

    try:
        supabase = get_user_supabase_client(access_token=access_token)
        query = (
            supabase.table("commercial_offers")
            .select(COMMERCIAL_OFFER_COLUMNS)
            .eq("commercial_profile_id", str(commercial_profile_id))
            .order("sort_order")
            .order("created_at")
        )

        if catalog_id is not None:
            query = query.eq("catalog_id", str(catalog_id))

        if not include_archived:
            query = query.neq("status", "archived")

        response = query.execute()
        return [
            _serialize_owned_offer(
                supabase=supabase,
                user_id=str(user_id),
                offer=offer,
                include_archived_images=include_archived,
            )
            for offer in (response.data or [])
        ]
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
        supabase = get_user_supabase_client(access_token=access_token)
        response = (
            supabase.table("commercial_offers")
            .select(COMMERCIAL_OFFER_COLUMNS)
            .eq("id", str(offer_id))
            .eq("commercial_profile_id", str(commercial_profile_id))
            .maybe_single()
            .execute()
        )
        offer = response.data

        if not offer:
            raise CommercialNotFoundError(
                "Commercial offer was not found.",
                code="COMMERCIAL_OFFER_NOT_FOUND",
            )

        return _serialize_owned_offer(
            supabase=supabase,
            user_id=str(user_id),
            offer=offer,
            include_archived_images=True,
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
