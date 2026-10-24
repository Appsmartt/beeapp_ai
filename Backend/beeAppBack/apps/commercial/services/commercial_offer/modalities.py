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
from .constants import COMMERCIAL_OFFER_MODALITY_COLUMNS
from .queries import get_owned_commercial_offer
from .validation import validate_offer_modalities


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

    validate_offer_modalities(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        modalities=normalized_modalities,
    )

    try:
        supabase = get_user_supabase_client(
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
        to_archive = sorted(active_modalities - desired_set)
        to_restore = sorted(archived_modalities & desired_set)
        to_create = sorted(desired_set - set(existing_by_modality))
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

            if len(insert_response.data or []) != len(to_create):
                raise CommercialOperationError(
                    "Could not create all offer modalities.",
                    code="COMMERCIAL_OFFER_MODALITY_CREATE_FAILED",
                )

        write_offer_audit_event(
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
