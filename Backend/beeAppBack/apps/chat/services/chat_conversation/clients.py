from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)


CONVERSATION_COLUMNS = (
    "id,conversation_type,direct_key,created_by_identity_id,"
    "posting_identity_id,posting_policy,name,description,image_file_id,"
    "last_message_id,last_message_at,is_active,"
    "created_at,updated_at"
)

PARTICIPANT_COLUMNS = (
    "id,conversation_id,identity_id,role,joined_at,left_at,"
    "removed_at,removed_by_identity_id,cleared_at,"
    "cleared_before_message_id,last_read_message_id,"
    "last_read_at,last_delivered_message_id,last_delivered_at,"
    "notifications_enabled,is_pinned,unread_count,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _user_supabase(
    *,
    access_token: str,
):
    return get_supabase_user_client(
        access_token=access_token,
    )


def _extract_first_row(
    response,
) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_rows(
    response,
) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []
