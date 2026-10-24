from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_child_profile,
    require_commercial_profile_owner,
)

from .client import get_user_supabase_client
from .constants import COMMERCIAL_CATALOG_COLUMNS
from .serialization import serialize_catalog


def list_owned_commercial_catalogs(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        query = (
            supabase.table("commercial_catalogs")
            .select(COMMERCIAL_CATALOG_COLUMNS)
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .order("sort_order")
            .order("created_at")
        )

        if not include_archived:
            query = query.neq("status", "archived")

        response = query.execute()
        return [
            serialize_catalog(catalog=catalog)
            for catalog in (response.data or [])
        ]
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial catalogs.",
            code="COMMERCIAL_CATALOG_LIST_FAILED",
        ) from error


def get_owned_commercial_catalog(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
) -> dict[str, Any]:
    require_commercial_child_profile(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
        child_table="commercial_catalogs",
        child_id=str(catalog_id),
    )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_catalogs")
            .select(COMMERCIAL_CATALOG_COLUMNS)
            .eq("id", str(catalog_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .maybe_single()
            .execute()
        )
        catalog = response.data

        if not catalog:
            raise CommercialNotFoundError(
                "Commercial catalog was not found.",
                code="COMMERCIAL_CATALOG_NOT_FOUND",
            )

        return serialize_catalog(catalog=catalog)
    except (
        CommercialAccessError,
        CommercialNotFoundError,
        CommercialOperationError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial catalog.",
            code="COMMERCIAL_CATALOG_LOOKUP_FAILED",
        ) from error
