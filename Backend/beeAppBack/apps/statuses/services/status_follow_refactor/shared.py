from __future__ import annotations

from typing import Any

from apps.statuses.exceptions import (
    StatusFollowAccessError,
    StatusFollowError,
    StatusFollowNotFoundError,
    StatusFollowValidationError,
)


FOLLOW_COLUMNS = (
    "id,follower_actor_type,follower_profile_id,"
    "follower_commercial_profile_id,target_actor_type,"
    "target_profile_id,target_commercial_profile_id,state,"
    "requested_at,responded_at,accepted_at,rejected_at,"
    "created_at,updated_at"
)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,display_name,logo_file_id,is_public,is_available"
)


def extract_first_row(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def serialize_follow(follow: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(follow["id"]),
        "follower_profile_id": str(follow["follower_profile_id"]),
        "target_actor_type": follow["target_actor_type"],
        "target_profile_id": (
            str(follow["target_profile_id"])
            if follow.get("target_profile_id")
            else None
        ),
        "target_commercial_profile_id": (
            str(follow["target_commercial_profile_id"])
            if follow.get("target_commercial_profile_id")
            else None
        ),
        "state": follow["state"],
        "requested_at": follow.get("requested_at"),
        "responded_at": follow.get("responded_at"),
        "accepted_at": follow.get("accepted_at"),
        "rejected_at": follow.get("rejected_at"),
        "created_at": follow.get("created_at"),
        "updated_at": follow.get("updated_at"),
    }


def raise_follow_rpc_error(error: Exception) -> None:
    message = str(error)

    if (
        "STATUS_FOLLOW_NOT_FOUND" in message
        or "STATUS_FOLLOW_NOT_FOUND_OR_NOT_OWNED" in message
    ):
        raise StatusFollowNotFoundError(
            "Follow relationship was not found."
        ) from error

    if (
        "STATUS_FOLLOW_RESPONSE_REQUIRES_TARGET_OWNER" in message
        or "STATUS_CANNOT_FOLLOW_SELF" in message
        or "STATUS_CANNOT_FOLLOW_OWN_COMMERCIAL_PROFILE" in message
        or "STATUS_FOLLOWER_NOT_OWNED_BY_USER" in message
    ):
        raise StatusFollowAccessError(
            "You cannot perform this follow operation."
        ) from error

    if (
        "STATUS_PROFILE_TARGET_REQUIRED" in message
        or "STATUS_COMMERCIAL_TARGET_REQUIRED" in message
        or "STATUS_TARGET_ACTOR_TYPE_INVALID" in message
        or "STATUS_FOLLOW_NOT_PENDING" in message
        or "STATUS_FOLLOWER_ACTOR_TYPE_INVALID" in message
    ):
        raise StatusFollowValidationError(
            "The follow operation is not valid in its current state."
        ) from error

    raise StatusFollowError(
        f"Could not complete follow operation: {message}"
    ) from error
