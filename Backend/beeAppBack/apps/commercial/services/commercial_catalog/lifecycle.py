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

from .audit import write_catalog_audit_event
from .client import get_user_supabase_client
from .queries import get_owned_commercial_catalog
from .serialization import serialize_catalog


def create_commercial_catalog(
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

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        catalog_payload = {
            "commercial_profile_id": str(commercial_profile_id),
            "name": payload["name"],
            "description": payload.get("description"),
            "sort_order": payload["sort_order"],
            "status": payload["status"],
        }
        response = (
            supabase.table("commercial_catalogs")
            .insert(catalog_payload)
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Supabase did not return the created catalog.",
                code="COMMERCIAL_CATALOG_CREATE_FAILED",
            )

        catalog = response.data[0]
        write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog["id"]),
            action="catalog.created",
            previous_state=None,
            new_state=catalog["status"],
            metadata={
                "name": catalog["name"],
                "sort_order": catalog["sort_order"],
            },
        )
        return serialize_catalog(catalog=catalog)
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialValidationError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not create commercial catalog.",
            code="COMMERCIAL_CATALOG_CREATE_FAILED",
        ) from error


def update_commercial_catalog(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    current_catalog = get_owned_commercial_catalog(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=str(catalog_id),
    )

    if current_catalog["status"] == "archived":
        raise CommercialStateError(
            "Archived catalogs cannot be edited.",
            code="COMMERCIAL_CATALOG_ARCHIVED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_catalogs")
            .update(payload)
            .eq("id", str(catalog_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .neq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial catalog could not be updated.",
                code="COMMERCIAL_CATALOG_UPDATE_FAILED",
            )

        catalog = response.data[0]
        write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action="catalog.updated",
            previous_state=current_catalog["status"],
            new_state=catalog["status"],
            metadata={"updated_fields": sorted(payload.keys())},
        )
        return serialize_catalog(catalog=catalog)
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not update commercial catalog.",
            code="COMMERCIAL_CATALOG_UPDATE_FAILED",
        ) from error
