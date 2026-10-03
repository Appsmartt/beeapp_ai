from __future__ import annotations

from typing import Any, Callable

from apps.commercial.exceptions import (
    CommercialNotFoundError,
    CommercialOperationError,
)

from .shared import PUBLIC_CATALOG_COLUMNS, _extract_first_row, _response_rows


def require_public_catalog_for_profile(
    *,
    commercial_profile_id: str,
    catalog_id: str,
    execute: Callable,
) -> dict[str, Any]:
    try:
        response = execute(
            lambda client: client.table("commercial_catalogs")
            .select(PUBLIC_CATALOG_COLUMNS)
            .eq("id", str(catalog_id))
            .eq("commercial_profile_id", str(commercial_profile_id))
            .eq("status", "published")
            .is_("archived_at", "null")
            .maybe_single()
            .execute()
        )
        catalog = _extract_first_row(response)
        if not catalog:
            raise CommercialNotFoundError(
                "Commercial catalog was not found or is unavailable.",
                code="COMMERCIAL_PUBLIC_CATALOG_NOT_FOUND",
            )
        return catalog
    except CommercialNotFoundError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not verify public commercial catalog.",
            code="COMMERCIAL_PUBLIC_CATALOG_LOOKUP_FAILED",
        ) from error


def list_public_commercial_catalogs(
    *,
    commercial_profile_id: str,
    execute: Callable,
    require_public_profile: Callable,
) -> list[dict[str, Any]]:
    require_public_profile(
        commercial_profile_id=str(commercial_profile_id)
    )
    try:
        response = execute(
            lambda client: client.table("commercial_catalogs")
            .select(PUBLIC_CATALOG_COLUMNS)
            .eq("commercial_profile_id", str(commercial_profile_id))
            .eq("status", "published")
            .is_("archived_at", "null")
            .order("sort_order")
            .order("created_at")
            .execute()
        )
        return [
            {
                "id": str(catalog["id"]),
                "commercial_profile_id": str(
                    catalog["commercial_profile_id"]
                ),
                "name": catalog["name"],
                "description": catalog.get("description"),
                "sort_order": catalog.get("sort_order"),
                "created_at": catalog.get("created_at"),
                "updated_at": catalog.get("updated_at"),
            }
            for catalog in _response_rows(response)
        ]
    except CommercialNotFoundError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve public commercial catalogs.",
            code="COMMERCIAL_PUBLIC_CATALOGS_LOOKUP_FAILED",
        ) from error
