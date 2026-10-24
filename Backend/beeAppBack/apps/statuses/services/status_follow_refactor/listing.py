from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from postgrest import CountMethod

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.statuses.exceptions import (
    StatusFollowAccessError,
    StatusFollowError,
    StatusFollowValidationError,
)
from apps.statuses.services.status_follow_refactor.access import (
    get_commercial_profile,
    normalize_actor_type,
)
from apps.statuses.services.status_follow_refactor.listing_targets import (
    serialize_follow_list,
)
from apps.statuses.services.status_follow_refactor.shared import (
    FOLLOW_COLUMNS,
    response_rows,
)


logger = logging.getLogger(__name__)


def list_following(
    *,
    user_id: str,
    actor_type: str = "profile",
    commercial_profile_id: str | None = None,
    limit: int = 20,
    cursor: str | None = None,
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any]:
    normalized_actor_type = normalize_actor_type(actor_type)

    if normalized_actor_type == "profile":
        follower_profile_id = str(user_id)
        follower_commercial_profile_id = None
    else:
        commercial = get_commercial_profile(
            commercial_profile_id=str(commercial_profile_id),
        )

        if str(commercial["owner_id"]) != str(user_id):
            raise StatusFollowAccessError(
                "You cannot access following of this commercial profile."
            )

        follower_profile_id = None
        follower_commercial_profile_id = str(commercial_profile_id)

    return _list_and_serialize_follow_list(
        user_id=user_id,
        mode="following",
        actor_type=normalized_actor_type,
        commercial_profile_id=follower_commercial_profile_id,
        target_profile_id=follower_profile_id,
        limit=limit,
        cursor=cursor,
        avatar_url_builder=avatar_url_builder,
    )


def list_followers(
    *,
    user_id: str,
    actor_type: str = "profile",
    commercial_profile_id: str | None = None,
    limit: int = 20,
    cursor: str | None = None,
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any]:
    normalized_actor_type = normalize_actor_type(actor_type)

    if normalized_actor_type == "profile":
        target_profile_id = str(user_id)
        target_commercial_profile_id = None
    else:
        commercial = get_commercial_profile(
            commercial_profile_id=str(commercial_profile_id),
        )

        if str(commercial["owner_id"]) != str(user_id):
            raise StatusFollowAccessError(
                "You cannot access followers of this commercial profile."
            )

        target_profile_id = None
        target_commercial_profile_id = str(commercial_profile_id)

    return _list_and_serialize_follow_list(
        user_id=user_id,
        mode="followers",
        actor_type=normalized_actor_type,
        commercial_profile_id=target_commercial_profile_id,
        target_profile_id=target_profile_id,
        limit=limit,
        cursor=cursor,
        avatar_url_builder=avatar_url_builder,
    )


def list_received_follow_requests(
    *,
    user_id: str,
    limit: int = 20,
    cursor: str | None = None,
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any]:
    return _list_and_serialize_follow_list(
        user_id=user_id,
        mode="requests",
        actor_type="profile",
        commercial_profile_id=None,
        target_profile_id=str(user_id),
        limit=limit,
        cursor=cursor,
        avatar_url_builder=avatar_url_builder,
    )


def _list_and_serialize_follow_list(
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    target_profile_id: str | None,
    limit: int,
    cursor: str | None,
    avatar_url_builder: Callable[..., str | None],
) -> dict[str, Any]:
    total_count = _count_follow_rows(
        user_id=user_id,
        mode=mode,
        actor_type=actor_type,
        commercial_profile_id=commercial_profile_id,
        target_profile_id=target_profile_id,
    )
    rows = _list_follow_rows(
        user_id=user_id,
        mode=mode,
        actor_type=actor_type,
        commercial_profile_id=commercial_profile_id,
        target_profile_id=target_profile_id,
        limit=limit,
        cursor=cursor,
    )

    return serialize_follow_list(
        rows=rows,
        mode=mode,
        limit=limit,
        count=total_count,
        avatar_url_builder=avatar_url_builder,
    )


def _apply_follow_list_filters(
    query,
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    target_profile_id: str | None,
):
    if mode == "following":
        query = query.eq("state", "accepted")

        if actor_type == "commercial_profile":
            return (
                query.eq("follower_actor_type", "commercial_profile")
                .eq(
                    "follower_commercial_profile_id",
                    str(commercial_profile_id),
                )
            )

        return (
            query.eq("follower_actor_type", "profile")
            .eq("follower_profile_id", str(target_profile_id))
        )

    if mode == "followers":
        query = query.eq("state", "accepted")

        if actor_type == "profile":
            return query.eq(
                "target_profile_id",
                str(target_profile_id),
            )

        return query.eq(
            "target_commercial_profile_id",
            str(commercial_profile_id),
        )

    if mode == "requests":
        return (
            query.eq("target_actor_type", "profile")
            .eq("target_profile_id", str(target_profile_id))
            .eq("state", "pending")
        )

    raise StatusFollowValidationError(
        "Unsupported follow list mode."
    )


def _count_follow_rows(
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    target_profile_id: str | None,
) -> int:
    try:
        def operation(client):
            query = client.table("status_follows").select(
                "id",
                count=CountMethod.exact,
            )
            return _apply_follow_list_filters(
                query,
                user_id=user_id,
                mode=mode,
                actor_type=actor_type,
                commercial_profile_id=commercial_profile_id,
                target_profile_id=target_profile_id,
            ).execute()

        response = execute_with_supabase_admin_retry(operation)
        return int(getattr(response, "count", 0) or 0)
    except StatusFollowValidationError:
        raise
    except Exception as error:
        logger.exception(
            "status_follow_count_failed mode=%s actor_type=%s "
            "target_profile_id=%s commercial_profile_id=%s "
            "error_type=%s error_message=%s",
            mode,
            actor_type,
            target_profile_id,
            commercial_profile_id,
            type(error).__name__,
            str(error),
        )
        raise StatusFollowError(
            f"Could not count follow relationships: {error}"
        ) from error


def _list_follow_rows(
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    target_profile_id: str | None,
    limit: int,
    cursor: str | None,
) -> list[dict[str, Any]]:
    normalized_limit = max(1, min(int(limit), 50))
    page_size = normalized_limit + 1

    try:
        def operation(client):
            query = (
                client.table("status_follows")
                .select(FOLLOW_COLUMNS)
                .order("requested_at", desc=True)
                .order("id", desc=True)
                .limit(page_size)
            )
            query = _apply_follow_list_filters(
                query,
                user_id=user_id,
                mode=mode,
                actor_type=actor_type,
                commercial_profile_id=commercial_profile_id,
                target_profile_id=target_profile_id,
            )

            if cursor:
                cursor_requested_at, cursor_follow_id = (
                    _parse_follow_cursor(cursor)
                )
                query = query.or_(
                    "requested_at.lt."
                    f"{cursor_requested_at},"
                    "and("
                    f"requested_at.eq.{cursor_requested_at},"
                    f"id.lt.{cursor_follow_id}"
                    ")"
                )

            return query.execute()

        response = execute_with_supabase_admin_retry(operation)
        return response_rows(response)
    except StatusFollowValidationError:
        raise
    except Exception as error:
        logger.exception(
            "status_follow_list_failed mode=%s actor_type=%s "
            "target_profile_id=%s commercial_profile_id=%s "
            "cursor_present=%s",
            mode,
            actor_type,
            target_profile_id,
            commercial_profile_id,
            bool(cursor),
        )
        raise StatusFollowError(
            f"Could not retrieve follow relationships: {error}"
        ) from error


def _parse_follow_cursor(cursor: str) -> tuple[str, str]:
    try:
        requested_at, follow_id = cursor.rsplit("|", 1)

        if not requested_at.strip() or not follow_id.strip():
            raise ValueError

        return requested_at.strip(), follow_id.strip()
    except (AttributeError, ValueError) as error:
        raise StatusFollowValidationError(
            "Invalid follow cursor."
        ) from error
