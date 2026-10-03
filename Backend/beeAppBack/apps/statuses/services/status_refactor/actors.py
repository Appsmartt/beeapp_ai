from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)
from apps.statuses.exceptions import (
    StatusAccessError,
    StatusOperationError,
    StatusValidationError,
)
from apps.statuses.services.status_refactor.response_utils import (
    extract_first_row,
    response_rows,
)


COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,display_name,logo_file_id,is_public,is_available"
)


def resolve_owned_actor(
    *,
    user_id: str,
    actor_type: str,
    actor_commercial_profile_id: str | None,
) -> tuple[str | None, str | None, str]:
    if actor_type == "profile":
        if actor_commercial_profile_id is not None:
            raise StatusValidationError(
                "Personal status stories cannot select a commercial "
                "profile."
            )

        require_profile_exists(profile_id=user_id)
        return str(user_id), None, str(user_id)

    if not actor_commercial_profile_id:
        raise StatusValidationError(
            "Commercial status stories require "
            "actor_commercial_profile_id."
        )

    commercial = get_owned_commercial_profile(
        user_id=user_id,
        commercial_profile_id=actor_commercial_profile_id,
    )

    return (
        None,
        str(commercial["id"]),
        str(commercial["owner_id"]),
    )


def require_profile_exists(*, profile_id: str) -> None:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("profile")
                .select("id")
                .eq("id", str(profile_id))
                .maybe_single()
                .execute()
            ),
        )

        if not extract_first_row(response):
            raise StatusAccessError(
                "The authenticated profile is unavailable."
            )
    except StatusAccessError:
        raise
    except Exception as error:
        raise StatusOperationError(
            "Could not verify the authenticated profile."
        ) from error


def get_owned_commercial_profile(
    *,
    user_id: str,
    commercial_profile_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profiles")
                .select(COMMERCIAL_PROFILE_COLUMNS)
                .eq("id", str(commercial_profile_id))
                .eq("owner_id", str(user_id))
                .maybe_single()
                .execute()
            ),
        )

        commercial = extract_first_row(response)

        if not commercial:
            raise StatusAccessError(
                "The commercial profile is unavailable."
            )

        return commercial
    except StatusAccessError:
        raise
    except Exception as error:
        raise StatusOperationError(
            "Could not verify the commercial profile."
        ) from error


def list_owned_commercial_profiles(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profiles")
                .select(COMMERCIAL_PROFILE_COLUMNS)
                .eq("owner_id", str(user_id))
                .order("created_at")
                .execute()
            ),
        )

        return response_rows(response)
    except Exception as error:
        raise StatusOperationError(
            "Could not retrieve owned commercial profiles."
        ) from error


def get_actor_presentation(
    *,
    actor_type: str,
    actor_id: str,
    enrich_actor,
    display_name_for_profile,
) -> dict[str, Any] | None:
    try:
        if actor_type == "profile":
            response = execute_with_supabase_admin_retry(
                lambda client: (
                    client.table("profile")
                    .select("id,first_name,last_name,avatar_file_id")
                    .eq("id", str(actor_id))
                    .maybe_single()
                    .execute()
                ),
            )
            profile = extract_first_row(response)

            if not profile:
                return None

            return enrich_actor(
                {
                    "actor_type": "profile",
                    "actor_id": str(profile["id"]),
                    "profile_id": str(profile["id"]),
                    "commercial_profile_id": None,
                    "display_name": display_name_for_profile(profile),
                    "avatar_file_id": profile.get("avatar_file_id"),
                }
            )

        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profiles")
                .select("id,display_name,logo_file_id")
                .eq("id", str(actor_id))
                .maybe_single()
                .execute()
            ),
        )
        commercial = extract_first_row(response)

        if not commercial:
            return None

        return enrich_actor(
            {
                "actor_type": "commercial_profile",
                "actor_id": str(commercial["id"]),
                "profile_id": None,
                "commercial_profile_id": str(commercial["id"]),
                "display_name": commercial["display_name"],
                "avatar_file_id": commercial.get("logo_file_id"),
            }
        )
    except Exception as error:
        raise StatusOperationError(
            "Could not retrieve status author."
        ) from error
