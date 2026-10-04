from datetime import UTC, datetime
from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)

from .audit import write_catalog_audit_event
from .client import get_user_supabase_client
from .constants import PUBLISHABLE_CATALOG_STATUSES
from .queries import get_owned_commercial_catalog
from .serialization import serialize_catalog


def archive_commercial_catalog(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
) -> dict[str, Any]:
    current_catalog = get_owned_commercial_catalog(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=str(catalog_id),
    )

    if current_catalog["status"] == "archived":
        raise CommercialStateError(
            "Commercial catalog is already archived.",
            code="COMMERCIAL_CATALOG_ALREADY_ARCHIVED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_catalogs")
            .update(
                {
                    "status": "archived",
                    "archived_at": datetime.now(UTC).isoformat(),
                }
            )
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
                "Commercial catalog could not be archived.",
                code="COMMERCIAL_CATALOG_ARCHIVE_FAILED",
            )

        catalog = response.data[0]
        write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action="catalog.archived",
            previous_state=current_catalog["status"],
            new_state="archived",
            metadata={},
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
            "Could not archive commercial catalog.",
            code="COMMERCIAL_CATALOG_ARCHIVE_FAILED",
        ) from error


def restore_commercial_catalog(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
) -> dict[str, Any]:
    current_catalog = get_owned_commercial_catalog(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=str(catalog_id),
    )

    if current_catalog["status"] != "archived":
        raise CommercialStateError(
            "Only archived catalogs can be restored.",
            code="COMMERCIAL_CATALOG_NOT_ARCHIVED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_catalogs")
            .update(
                {
                    "status": "paused",
                    "archived_at": None,
                }
            )
            .eq("id", str(catalog_id))
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .eq("status", "archived")
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial catalog could not be restored.",
                code="COMMERCIAL_CATALOG_RESTORE_FAILED",
            )

        catalog = response.data[0]
        write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action="catalog.restored",
            previous_state="archived",
            new_state="paused",
            metadata={},
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
            "Could not restore commercial catalog.",
            code="COMMERCIAL_CATALOG_RESTORE_FAILED",
        ) from error


def set_commercial_catalog_status(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
    target_status: str,
) -> dict[str, Any]:
    if target_status not in PUBLISHABLE_CATALOG_STATUSES:
        raise CommercialValidationError(
            "Catalog status must be published or paused.",
            code="COMMERCIAL_CATALOG_STATUS_INVALID",
        )

    current_catalog = get_owned_commercial_catalog(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=str(catalog_id),
    )
    current_status = current_catalog["status"]

    if current_status == "archived":
        raise CommercialStateError(
            "Archived catalogs cannot change publication status.",
            code="COMMERCIAL_CATALOG_ARCHIVED",
        )

    if current_status == target_status:
        raise CommercialStateError(
            "Commercial catalog is already in the requested status.",
            code="COMMERCIAL_CATALOG_STATUS_UNCHANGED",
        )

    try:
        supabase = get_user_supabase_client(
            access_token=access_token,
        )
        response = (
            supabase.table("commercial_catalogs")
            .update({"status": target_status})
            .eq("id", str(catalog_id))
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
                "Commercial catalog status could not be updated.",
                code="COMMERCIAL_CATALOG_STATUS_UPDATE_FAILED",
            )

        catalog = response.data[0]
        action = (
            "catalog.published"
            if target_status == "published"
            else "catalog.paused"
        )
        write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action=action,
            previous_state=current_status,
            new_state=target_status,
            metadata={},
        )
        return serialize_catalog(catalog=catalog)
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
            "Could not update commercial catalog status.",
            code="COMMERCIAL_CATALOG_STATUS_UPDATE_FAILED",
        ) from error


def pause_commercial_catalog(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
) -> dict[str, Any]:
    return set_commercial_catalog_status(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=str(catalog_id),
        target_status="paused",
    )


def publish_commercial_catalog(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    catalog_id: str,
) -> dict[str, Any]:
    return set_commercial_catalog_status(
        user_id=str(user_id),
        access_token=access_token,
        commercial_profile_id=str(commercial_profile_id),
        catalog_id=str(catalog_id),
        target_status="published",
    )
