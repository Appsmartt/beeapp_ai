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
from apps.commercial.services.commercial_supabase_service import (
    get_commercial_user_supabase_client,
)


COMMERCIAL_CATALOG_COLUMNS = (
    "id,commercial_profile_id,name,description,sort_order,status,"
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


def _serialize_catalog(
    catalog: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(catalog["id"]),
        "commercial_profile_id": str(
            catalog["commercial_profile_id"]
        ),
        "name": catalog["name"],
        "description": catalog.get("description"),
        "sort_order": catalog["sort_order"],
        "status": catalog["status"],
        "archived_at": catalog.get("archived_at"),
        "created_at": catalog.get("created_at"),
        "updated_at": catalog.get("updated_at"),
    }


def _write_catalog_audit_event(
    *,
    supabase,
    commercial_profile_id: str,
    actor_profile_id: str,
    catalog_id: str,
    action: str,
    previous_state: str | None,
    new_state: str | None,
    metadata: dict[str, Any],
) -> None:
    try:
        response = (
            supabase.rpc(
                "commerce_write_audit_event",
                {
                    "p_commercial_profile_id": str(
                        commercial_profile_id
                    ),
                    "p_actor_profile_id": str(
                        actor_profile_id
                    ),
                    "p_entity_type": "commercial_catalog",
                    "p_entity_id": str(catalog_id),
                    "p_action": action,
                    "p_previous_state": previous_state,
                    "p_new_state": new_state,
                    "p_reason_code": None,
                    "p_reason_text": None,
                    "p_reference_type": None,
                    "p_reference_id": None,
                    "p_metadata": metadata,
                },
            )
            .execute()
        )

        if not getattr(response, "data", None):
            raise CommercialOperationError(
                "Could not write catalog audit event.",
                code="COMMERCIAL_CATALOG_AUDIT_FAILED",
            )

    except CommercialOperationError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not write catalog audit event.",
            code="COMMERCIAL_CATALOG_AUDIT_FAILED",
        ) from error


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
        supabase = _get_user_supabase_client(
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
            _serialize_catalog(catalog)
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
        supabase = _get_user_supabase_client(
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

        return _serialize_catalog(catalog)

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
        supabase = _get_user_supabase_client(
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

        _write_catalog_audit_event(
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

        return _serialize_catalog(catalog)

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
        supabase = _get_user_supabase_client(
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

        _write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action="catalog.updated",
            previous_state=current_catalog["status"],
            new_state=catalog["status"],
            metadata={
                "updated_fields": sorted(payload.keys()),
            },
        )

        return _serialize_catalog(catalog)

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
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_catalogs")
            .update(
                {
                    "status": "archived",
                    "archived_at": datetime.now(
                        UTC
                    ).isoformat(),
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

        _write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action="catalog.archived",
            previous_state=current_catalog["status"],
            new_state="archived",
            metadata={},
        )

        return _serialize_catalog(catalog)

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
        supabase = _get_user_supabase_client(
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

        _write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action="catalog.restored",
            previous_state="archived",
            new_state="paused",
            metadata={},
        )

        return _serialize_catalog(catalog)

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
    allowed_target_statuses = {
        "published",
        "paused",
    }

    if target_status not in allowed_target_statuses:
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
        supabase = _get_user_supabase_client(
            access_token=access_token,
        )

        response = (
            supabase.table("commercial_catalogs")
            .update(
                {
                    "status": target_status,
                }
            )
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

        _write_catalog_audit_event(
            supabase=supabase,
            commercial_profile_id=str(commercial_profile_id),
            actor_profile_id=str(user_id),
            catalog_id=str(catalog_id),
            action=action,
            previous_state=current_status,
            new_state=target_status,
            metadata={},
        )

        return _serialize_catalog(catalog)

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
