from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from apps.chat.exceptions import ChatGroupError
from apps.chat.services.chat_group.clients import (
    _extract_first_row,
    _supabase,
)
from apps.chat.services.chat_group.constants import (
    CHAT_GROUP_POSTING_POLICIES,
    CHAT_MANAGEABLE_PARTICIPANT_ROLES,
    FILE_COLUMNS,
)


def _validate_group_image(
    *,
    user_id: str,
    file_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("files")
        .select(FILE_COLUMNS)
        .eq("id", str(file_id))
        .eq("owner_id", str(user_id))
        .eq("status", "ready")
        .maybe_single()
        .execute()
    )

    file_record = _extract_first_row(response)

    if not file_record:
        raise ChatGroupError(
            "Group image file was not found or unavailable."
        )

    if file_record.get("trashed_at") is not None:
        raise ChatGroupError(
            "Group image file is in trash."
        )

    if file_record.get("kind") != "image":
        raise ChatGroupError(
            "Group image file must be an image."
        )

    return file_record


def _normalize_required_name(value: str) -> str:
    normalized_value = str(value or "").strip()

    if not normalized_value:
        raise ChatGroupError(
            "Group name cannot be empty."
        )

    if len(normalized_value) > 120:
        raise ChatGroupError(
            "Group name cannot exceed 120 characters."
        )

    return normalized_value


def _normalize_description(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized_value = str(value).strip()

    if len(normalized_value) > 2_000:
        raise ChatGroupError(
            "Group description cannot exceed 2000 characters."
        )

    return normalized_value or None


def _normalize_posting_policy(value: str) -> str:
    normalized_value = str(value or "").strip()

    if normalized_value not in CHAT_GROUP_POSTING_POLICIES:
        raise ChatGroupError(
            "Group posting policy must be all_members or admins_only."
        )

    return normalized_value


def _normalize_manageable_role(value: str) -> str:
    normalized_value = str(value or "").strip()

    if normalized_value not in CHAT_MANAGEABLE_PARTICIPANT_ROLES:
        raise ChatGroupError(
            "Participant role must be admin or member."
        )

    return normalized_value


def _is_future_timestamp(value: str) -> bool:
    normalized_value = value.replace("Z", "+00:00")

    return (
        datetime.fromisoformat(normalized_value)
        > datetime.now(timezone.utc)
    )


def _extract_rpc_uuid(
    value: Any,
    function_name: str,
) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return _extract_rpc_uuid(
            value[0],
            function_name,
        )

    if isinstance(value, dict):
        return (
            value.get(function_name)
            or value.get("id")
            or value.get("value")
        )

    return None
