from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.statuses.exceptions import (
    StatusFollowAccessError,
    StatusFollowError,
    StatusFollowNotFoundError,
    StatusFollowValidationError,
)
from apps.statuses.services.status_follow_refactor.shared import (
    COMMERCIAL_PROFILE_COLUMNS,
    FOLLOW_COLUMNS,
    extract_first_row,
)


def normalize_actor_type(value: str) -> str:
    normalized = str(value or "").strip()

    if normalized not in {"profile", "commercial_profile"}:
        raise StatusFollowValidationError(
            "target_actor_type must be profile or commercial_profile."
        )

    return normalized


def validate_follow_target_payload(
    *,
    target_actor_type: str,
    target_profile_id: str | None,
    target_commercial_profile_id: str | None,
) -> None:
    if target_actor_type == "profile":
        if not target_profile_id or target_commercial_profile_id:
            raise StatusFollowValidationError(
                "A personal target_profile_id is required."
            )
        return

    if not target_commercial_profile_id or target_profile_id:
        raise StatusFollowValidationError(
            "A commercial target_commercial_profile_id is required."
        )


def get_follow_by_id(*, follow_id: str) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("status_follows")
                .select(FOLLOW_COLUMNS)
                .eq("id", str(follow_id))
                .maybe_single()
                .execute()
            ),
        )
        follow = extract_first_row(response)

        if not follow:
            raise StatusFollowNotFoundError(
                "Follow relationship was not found."
            )

        return follow
    except StatusFollowNotFoundError:
        raise
    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve follow relationship."
        ) from error


def get_commercial_profile(
    *,
    commercial_profile_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profiles")
                .select(COMMERCIAL_PROFILE_COLUMNS)
                .eq("id", str(commercial_profile_id))
                .maybe_single()
                .execute()
            ),
        )
        commercial = extract_first_row(response)

        if not commercial:
            raise StatusFollowNotFoundError(
                "Commercial profile was not found."
            )

        return commercial
    except StatusFollowNotFoundError:
        raise
    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve commercial profile."
        ) from error


def validate_target_exists(
    *,
    target_actor_type: str,
    target_profile_id: str | None,
    target_commercial_profile_id: str | None,
) -> None:
    if target_actor_type == "profile":
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("profile")
                .select("id")
                .eq("id", str(target_profile_id))
                .maybe_single()
                .execute()
            ),
        )

        if not extract_first_row(response):
            raise StatusFollowNotFoundError(
                "The target profile was not found."
            )
        return

    commercial = get_commercial_profile(
        commercial_profile_id=str(target_commercial_profile_id),
    )

    if not commercial.get("is_public", False):
        raise StatusFollowAccessError(
            "The commercial profile is not available for follows."
        )


def require_follow_response_owner(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    follow = get_follow_by_id(follow_id=follow_id)

    if follow["target_actor_type"] != "profile":
        raise StatusFollowValidationError(
            "Only personal follow requests can be answered."
        )

    if str(follow["target_profile_id"]) != str(user_id):
        raise StatusFollowAccessError(
            "You cannot respond to this follow request."
        )

    if follow["state"] != "pending":
        raise StatusFollowValidationError(
            "Only pending follow requests can be answered."
        )

    return follow
