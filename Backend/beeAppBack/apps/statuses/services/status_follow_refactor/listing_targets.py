from __future__ import annotations

from collections.abc import Callable
from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.statuses.exceptions import StatusFollowError
from apps.statuses.services.status_follow_refactor.shared import (
    response_rows,
)


def serialize_follow_list(
    *,
    rows: list[dict[str, Any]],
    mode: str,
    limit: int,
    count: int,
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any]:
    normalized_limit = max(1, min(int(limit), 50))
    has_next_page = len(rows) > normalized_limit
    page_rows = rows[:normalized_limit]

    profile_ids: list[str] = []
    commercial_profile_ids: list[str] = []

    for row in page_rows:
        if mode == "following":
            if row["target_actor_type"] == "profile":
                profile_ids.append(row["target_profile_id"])
            else:
                commercial_profile_ids.append(
                    row["target_commercial_profile_id"]
                )
        elif row["follower_actor_type"] == "profile":
            profile_ids.append(row["follower_profile_id"])
        else:
            commercial_profile_ids.append(
                row["follower_commercial_profile_id"]
            )

    profiles_by_id = get_profiles_for_follow_list(
        profile_ids=profile_ids,
    )
    commercials_by_id = get_commercial_profiles_for_follow_list(
        commercial_profile_ids=commercial_profile_ids,
    )

    items: list[dict[str, Any]] = []

    for row in page_rows:
        target = serialize_follow_list_target(
            row=row,
            mode=mode,
            profiles_by_id=profiles_by_id,
            commercials_by_id=commercials_by_id,
            avatar_url_builder=avatar_url_builder,
        )

        if target is None:
            continue

        items.append(
            {
                "id": str(row["id"]),
                "state": row["state"],
                "requested_at": row["requested_at"],
                "responded_at": row.get("responded_at"),
                "accepted_at": row.get("accepted_at"),
                "rejected_at": row.get("rejected_at"),
                "target": target,
            }
        )

    next_cursor = None

    if has_next_page and page_rows:
        last_row = page_rows[-1]
        next_cursor = (
            f"{last_row['requested_at']}|{last_row['id']}"
        )

    return {
        "items": items,
        "count": count,
        "limit": normalized_limit,
        "next_cursor": next_cursor,
    }


def serialize_follow_list_target(
    *,
    row: dict[str, Any],
    mode: str,
    profiles_by_id: dict[str, dict[str, Any]],
    commercials_by_id: dict[str, dict[str, Any]],
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any] | None:
    if mode == "following":
        actor_type = row["target_actor_type"]
        actor_id = (
            row["target_profile_id"]
            if actor_type == "profile"
            else row["target_commercial_profile_id"]
        )
    else:
        actor_type = row["follower_actor_type"]
        actor_id = (
            row["follower_profile_id"]
            if actor_type == "profile"
            else row["follower_commercial_profile_id"]
        )

    if actor_type == "profile":
        profile = profiles_by_id.get(str(actor_id))

        if not profile:
            return None

        avatar_file_id = (
            str(profile["avatar_file_id"])
            if profile.get("avatar_file_id")
            else None
        )
        return {
            "actor_type": "profile",
            "profile_id": str(profile["id"]),
            "commercial_profile_id": None,
            "display_name": display_name_for_profile(profile),
            "avatar_file_id": avatar_file_id,
            "avatar_url": avatar_url_builder(
                actor_type="profile",
                actor_id=str(profile["id"]),
                avatar_file_id=avatar_file_id,
            ),
            "is_available": True,
        }

    commercial = commercials_by_id.get(str(actor_id))

    if not commercial:
        return None

    avatar_file_id = (
        str(commercial["logo_file_id"])
        if commercial.get("logo_file_id")
        else None
    )
    return {
        "actor_type": "commercial_profile",
        "profile_id": None,
        "commercial_profile_id": str(commercial["id"]),
        "display_name": commercial["display_name"],
        "avatar_file_id": avatar_file_id,
        "avatar_url": avatar_url_builder(
            actor_type="commercial_profile",
            actor_id=str(commercial["id"]),
            avatar_file_id=avatar_file_id,
        ),
        "is_available": bool(commercial.get("is_available", False)),
    }


def get_profiles_for_follow_list(
    *,
    profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    normalized_ids = sorted(
        {str(profile_id) for profile_id in profile_ids if profile_id}
    )

    if not normalized_ids:
        return {}

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("profile")
                .select("id,first_name,last_name,avatar_file_id")
                .in_("id", normalized_ids)
                .execute()
            ),
        )
        return {
            str(profile["id"]): profile
            for profile in response_rows(response)
            if profile.get("id")
        }
    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve profiles for follow list."
        ) from error


def get_commercial_profiles_for_follow_list(
    *,
    commercial_profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    normalized_ids = sorted(
        {
            str(commercial_profile_id)
            for commercial_profile_id in commercial_profile_ids
            if commercial_profile_id
        }
    )

    if not normalized_ids:
        return {}

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profiles")
                .select(
                    "id,display_name,logo_file_id,"
                    "is_public,is_available"
                )
                .in_("id", normalized_ids)
                .execute()
            ),
        )
        return {
            str(commercial["id"]): commercial
            for commercial in response_rows(response)
            if commercial.get("id")
        }
    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve commercial profiles for follow list."
        ) from error


def display_name_for_profile(profile: dict[str, Any]) -> str:
    return " ".join(
        part.strip()
        for part in (
            str(profile.get("first_name") or ""),
            str(profile.get("last_name") or ""),
        )
        if part and part.strip()
    ) or "Usuario"
