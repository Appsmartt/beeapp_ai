from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from apps.statuses.exceptions import (
    StatusFollowError,
    StatusFollowValidationError,
)
from apps.statuses.services.status_follow_refactor.shared import (
    response_rows,
)


logger = logging.getLogger(__name__)


def discover_follow_targets(
    *,
    user_id: str,
    access_token: str,
    query: str,
    limit: int = 20,
    cursor: str | None = None,
    get_user_client: Callable[..., Any],
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any]:
    normalized_query = str(query or "").strip().lower()

    if len(normalized_query) < 2:
        raise StatusFollowValidationError(
            "Search query must contain at least 2 characters."
        )

    normalized_limit = max(1, min(int(limit), 20))
    normalized_cursor = str(cursor).strip() if cursor else None

    try:
        response = (
            get_user_client(access_token=access_token)
            .rpc(
                "status_discover_people_targets",
                {
                    "p_follower_actor_type": "profile",
                    "p_follower_profile_id": str(user_id),
                    "p_follower_commercial_profile_id": None,
                    "p_query": normalized_query,
                    "p_limit": normalized_limit,
                    "p_cursor": normalized_cursor,
                },
            )
            .execute()
        )
        rows = response_rows(response)
    except StatusFollowValidationError:
        raise
    except Exception as error:
        message = str(error)

        if "STATUS_DISCOVER_QUERY_TOO_SHORT" in message:
            raise StatusFollowValidationError(
                "Search query must contain at least 2 characters."
            ) from error

        if "STATUS_DISCOVER_CURSOR_INVALID" in message:
            raise StatusFollowValidationError(
                "Invalid discovery cursor."
            ) from error

        logger.exception(
            "status_follow_discover_failed user_id=%s cursor_present=%s",
            user_id,
            bool(normalized_cursor),
        )
        raise StatusFollowError(
            f"Could not discover follow targets: {message}"
        ) from error

    next_cursor = rows[0].get("next_cursor") if rows else None

    items = [
        _serialize_discovery_target(
            row=row,
            avatar_url_builder=avatar_url_builder,
        )
        for row in rows
    ]

    return {
        "query": normalized_query,
        "limit": normalized_limit,
        "items": items,
        "next_cursor": next_cursor,
    }


def _serialize_discovery_target(
    *,
    row: dict[str, Any],
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any]:
    actor_type = str(row.get("actor_type") or "")
    profile_id = (
        str(row["profile_id"])
        if row.get("profile_id")
        else None
    )
    commercial_profile_id = (
        str(row["commercial_profile_id"])
        if row.get("commercial_profile_id")
        else None
    )
    avatar_file_id = (
        str(row["avatar_file_id"])
        if row.get("avatar_file_id")
        else None
    )
    actor_id = commercial_profile_id or profile_id or ""

    return {
        "actor_type": row["actor_type"],
        "profile_id": profile_id,
        "commercial_profile_id": commercial_profile_id,
        "identity_id": (
            str(row["identity_id"])
            if row.get("identity_id")
            else None
        ),
        "display_name": row["display_name"],
        "avatar_file_id": avatar_file_id,
        "avatar_url": avatar_url_builder(
            actor_type=actor_type,
            actor_id=actor_id,
            avatar_file_id=avatar_file_id,
        ),
        "follow_id": (
            str(row["follow_id"])
            if row.get("follow_id")
            else None
        ),
        "follow_state": row.get("follow_state"),
    }
