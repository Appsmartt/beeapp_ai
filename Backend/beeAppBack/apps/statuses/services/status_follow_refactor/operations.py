from __future__ import annotations

from collections.abc import Callable
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
from apps.statuses.services.status_follow_refactor.access import (
    get_commercial_profile,
    get_follow_by_id,
    normalize_actor_type,
    require_follow_response_owner,
    validate_follow_target_payload,
    validate_target_exists,
)
from apps.statuses.services.status_follow_refactor.shared import (
    extract_first_row,
    raise_follow_rpc_error,
    serialize_follow,
)


def request_follow(
    *,
    user_id: str,
    access_token: str,
    target_actor_type: str,
    target_profile_id: str | None = None,
    target_commercial_profile_id: str | None = None,
    get_user_client: Callable[..., Any],
) -> dict[str, Any]:
    normalized_type = normalize_actor_type(target_actor_type)

    validate_follow_target_payload(
        target_actor_type=normalized_type,
        target_profile_id=target_profile_id,
        target_commercial_profile_id=target_commercial_profile_id,
    )
    validate_target_exists(
        target_actor_type=normalized_type,
        target_profile_id=target_profile_id,
        target_commercial_profile_id=target_commercial_profile_id,
    )

    try:
        response = (
            get_user_client(access_token=access_token)
            .rpc(
                "status_request_follow",
                {
                    "p_follower_actor_type": "profile",
                    "p_follower_profile_id": str(user_id),
                    "p_follower_commercial_profile_id": None,
                    "p_target_actor_type": normalized_type,
                    "p_target_profile_id": (
                        str(target_profile_id)
                        if target_profile_id
                        else None
                    ),
                    "p_target_commercial_profile_id": (
                        str(target_commercial_profile_id)
                        if target_commercial_profile_id
                        else None
                    ),
                },
            )
            .execute()
        )
        follow = extract_first_row(response)

        if not follow:
            raise StatusFollowError(
                "Supabase did not return the follow relationship."
            )

        return serialize_follow(follow)
    except (
        StatusFollowError,
        StatusFollowNotFoundError,
        StatusFollowValidationError,
    ):
        raise
    except Exception as error:
        raise_follow_rpc_error(error)


def accept_follow_request(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    require_follow_response_owner(
        user_id=user_id,
        follow_id=follow_id,
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_accept_follow_request",
                    {
                        "p_target_owner_profile_id": str(user_id),
                        "p_follow_id": str(follow_id),
                    },
                ).execute()
            ),
        )
        follow = extract_first_row(response)

        if not follow:
            raise StatusFollowError(
                "Supabase did not return the accepted follow request."
            )

        return serialize_follow(follow)
    except (
        StatusFollowError,
        StatusFollowAccessError,
        StatusFollowNotFoundError,
    ):
        raise
    except Exception as error:
        raise_follow_rpc_error(error)


def reject_follow_request(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    require_follow_response_owner(
        user_id=user_id,
        follow_id=follow_id,
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.rpc(
                    "status_reject_follow_request",
                    {
                        "p_target_owner_profile_id": str(user_id),
                        "p_follow_id": str(follow_id),
                    },
                ).execute()
            ),
        )
        follow = extract_first_row(response)

        if not follow:
            raise StatusFollowError(
                "Supabase did not return the rejected follow request."
            )

        return serialize_follow(follow)
    except (
        StatusFollowError,
        StatusFollowAccessError,
        StatusFollowNotFoundError,
    ):
        raise
    except Exception as error:
        raise_follow_rpc_error(error)


def unfollow(
    *,
    user_id: str,
    access_token: str,
    follow_id: str,
    get_user_client: Callable[..., Any],
    follow_loader: Callable[..., dict[str, Any]] = get_follow_by_id,
    commercial_loader: Callable[..., dict[str, Any]] = (
        get_commercial_profile
    ),
) -> None:
    follow = follow_loader(follow_id=follow_id)
    follower_actor_type = follow["follower_actor_type"]

    if follower_actor_type == "profile":
        if str(follow["follower_profile_id"]) != str(user_id):
            raise StatusFollowAccessError(
                "You cannot remove this follow relationship."
            )
        follower_profile_id = str(user_id)
        follower_commercial_profile_id = None
    elif follower_actor_type == "commercial_profile":
        commercial_profile_id = str(
            follow.get("follower_commercial_profile_id") or ""
        )

        if not commercial_profile_id:
            raise StatusFollowValidationError(
                "Commercial follower identity is invalid."
            )

        commercial = commercial_loader(
            commercial_profile_id=commercial_profile_id,
        )

        if str(commercial["owner_id"]) != str(user_id):
            raise StatusFollowAccessError(
                "You cannot remove this follow relationship."
            )

        follower_profile_id = None
        follower_commercial_profile_id = commercial_profile_id
    else:
        raise StatusFollowValidationError(
            "Follower actor type is invalid."
        )

    try:
        response = (
            get_user_client(access_token=access_token)
            .rpc(
                "status_unfollow",
                {
                    "p_follower_actor_type": follower_actor_type,
                    "p_follower_profile_id": follower_profile_id,
                    "p_follower_commercial_profile_id": (
                        follower_commercial_profile_id
                    ),
                    "p_follow_id": str(follow_id),
                },
            )
            .execute()
        )

        if getattr(response, "data", None) is not True:
            raise StatusFollowError(
                "Follow relationship could not be removed."
            )
    except (
        StatusFollowError,
        StatusFollowAccessError,
        StatusFollowNotFoundError,
        StatusFollowValidationError,
    ):
        raise
    except Exception as error:
        raise_follow_rpc_error(error)


def get_follow_for_user(
    *,
    user_id: str,
    follow_id: str,
    follow_loader: Callable[..., dict[str, Any]] = get_follow_by_id,
    commercial_loader: Callable[..., dict[str, Any]] = (
        get_commercial_profile
    ),
) -> dict[str, Any]:
    follow = follow_loader(follow_id=follow_id)

    is_follower = (
        str(follow["follower_profile_id"]) == str(user_id)
    )
    is_personal_target_owner = (
        follow["target_actor_type"] == "profile"
        and str(follow["target_profile_id"]) == str(user_id)
    )
    is_commercial_target_owner = False

    if follow["target_actor_type"] == "commercial_profile":
        commercial = commercial_loader(
            commercial_profile_id=follow[
                "target_commercial_profile_id"
            ]
        )
        is_commercial_target_owner = (
            str(commercial["owner_id"]) == str(user_id)
        )

    if not (
        is_follower
        or is_personal_target_owner
        or is_commercial_target_owner
    ):
        raise StatusFollowAccessError(
            "You cannot access this follow relationship."
        )

    return serialize_follow(follow)
