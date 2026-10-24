from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_user_client,
)

from apps.statuses.services.status_media_refactor.signed_urls import (
    create_status_avatar_signed_url,
)
from apps.statuses.services.status_follow_refactor import (
    accept_follow_request as _accept_follow_request,
    discover_follow_targets as _discover_follow_targets,
    get_follow_for_user as _get_follow_for_user,
    list_followers as _list_followers,
    list_following as _list_following,
    list_received_follow_requests as _list_received_follow_requests,
    reject_follow_request as _reject_follow_request,
    request_follow as _request_follow,
    unfollow as _unfollow,
)
from apps.statuses.services.status_follow_refactor.access import (
    get_commercial_profile as _get_commercial_profile,
    get_follow_by_id as _get_follow_by_id,
)


def request_follow(
    *,
    user_id: str,
    access_token: str,
    target_actor_type: str,
    target_profile_id: str | None = None,
    target_commercial_profile_id: str | None = None,
) -> dict[str, Any]:
    return _request_follow(
        user_id=user_id,
        access_token=access_token,
        target_actor_type=target_actor_type,
        target_profile_id=target_profile_id,
        target_commercial_profile_id=target_commercial_profile_id,
        get_user_client=get_supabase_user_client,
    )


def accept_follow_request(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    return _accept_follow_request(
        user_id=user_id,
        follow_id=follow_id,
    )


def reject_follow_request(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    return _reject_follow_request(
        user_id=user_id,
        follow_id=follow_id,
    )


def unfollow(
    *,
    user_id: str,
    access_token: str,
    follow_id: str,
) -> None:
    return _unfollow(
        user_id=user_id,
        access_token=access_token,
        follow_id=follow_id,
        get_user_client=get_supabase_user_client,
        follow_loader=_get_follow_by_id,
        commercial_loader=_get_commercial_profile,
    )


def get_follow_for_user(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    return _get_follow_for_user(
        user_id=user_id,
        follow_id=follow_id,
        follow_loader=_get_follow_by_id,
        commercial_loader=_get_commercial_profile,
    )


def list_following(
    *,
    user_id: str,
    actor_type: str = "profile",
    commercial_profile_id: str | None = None,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    return _list_following(
        user_id=user_id,
        actor_type=actor_type,
        commercial_profile_id=commercial_profile_id,
        limit=limit,
        cursor=cursor,
        avatar_url_builder=create_status_avatar_signed_url,
    )


def list_followers(
    *,
    user_id: str,
    actor_type: str = "profile",
    commercial_profile_id: str | None = None,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    return _list_followers(
        user_id=user_id,
        actor_type=actor_type,
        commercial_profile_id=commercial_profile_id,
        limit=limit,
        cursor=cursor,
        avatar_url_builder=create_status_avatar_signed_url,
    )


def list_received_follow_requests(
    *,
    user_id: str,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    return _list_received_follow_requests(
        user_id=user_id,
        limit=limit,
        cursor=cursor,
        avatar_url_builder=create_status_avatar_signed_url,
    )


def discover_follow_targets(
    *,
    user_id: str,
    access_token: str,
    query: str,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    return _discover_follow_targets(
        user_id=user_id,
        access_token=access_token,
        query=query,
        limit=limit,
        cursor=cursor,
        get_user_client=get_supabase_user_client,
        avatar_url_builder=create_status_avatar_signed_url,
    )
