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
    require_commercial_profile_owner,
)

from .audit import write_offer_audit_event
from .client import get_user_supabase_client
from .queries import get_owned_commercial_offer
from .validation import (
    require_owned_catalog_for_offer,
    validate_merged_offer,
    validate_offer_modalities,
)


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
    require_owned_catalog_for_offer(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=catalog_id,
    )

    modalities = payload.get("modalities", [])
    validate_offer_modalities(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        modalities=modalities,
    )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        offer_payload = {
            "commercial_profile_id": str(commercial_profile_id),
            "catalog_id": catalog_id,
            "offer_kind": payload["offer_kind"],
            "title": payload["title"],
            "description": payload.get("description"),
            "pricing_strategy": payload["pricing_strategy"],
            "base_price_amount": payload.get("base_price_amount"),
            "currency_code": payload["currency_code"],
            "is_available": payload["is_available"],
            "sort_order": payload["sort_order"],
            "status": payload["status"],
            "track_inventory": payload["track_inventory"],
            "stock_quantity": payload.get("stock_quantity"),
            "duration_minutes": payload.get("duration_minutes"),
            "requires_booking": payload["requires_booking"],
            "payment_policy": payload.get("payment_policy"),
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

            if len(modalities_response.data or []) != len(modalities):
                raise CommercialOperationError(
                    "Could not create all offer modalities.",
                    code="COMMERCIAL_OFFER_MODALITY_CREATE_FAILED",
                )

        write_offer_audit_event(
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
        require_owned_catalog_for_offer(
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

    validate_merged_offer(offer=merged_offer)

    try:
        supabase = get_user_supabase_client(
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
            .eq("commercial_profile_id", str(commercial_profile_id))
            .neq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial offer could not be updated.",
                code="COMMERCIAL_OFFER_UPDATE_FAILED",
            )

        offer = response.data[0]
        write_offer_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            offer_id=str(offer_id),
            action="offer.updated",
            previous_state=current_offer["status"],
            new_state=offer["status"],
            metadata={"updated_fields": sorted(payload.keys())},
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
