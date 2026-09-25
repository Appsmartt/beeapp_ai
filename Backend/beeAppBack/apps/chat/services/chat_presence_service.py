from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import get_supabase_user_client

from apps.chat.services.chat_identity_service import (
    get_owned_chat_identity,
)


def set_chat_identity_presence(
    *,
    user_id: str,
    access_token: str,
    identity_id: str,
    online: bool,
) -> bool:
    get_owned_chat_identity(
        user_id=user_id,
        identity_id=identity_id,
    )

    response = (
        get_supabase_user_client(
            access_token=access_token,
        )
        .rpc(
            "chat_presence_set_own_identity",
            {
                "p_identity_id": identity_id,
                "p_online": online,
            },
        )
        .execute()
    )

    result = getattr(response, "data", None)

    if not isinstance(result, bool):
        raise ValueError("Unexpected chat presence response.")

    return result


def list_chat_inbox_presence(
    *,
    user_id: str,
    access_token: str,
    viewer_identity_id: str,
    target_identity_ids: list[str],
) -> list[dict[str, Any]]:
    get_owned_chat_identity(
        user_id=user_id,
        identity_id=viewer_identity_id,
    )

    if len(target_identity_ids) > 100:
        raise ValueError("Too many chat presence identities.")

    response = (
        get_supabase_user_client(
            access_token=access_token,
        )
        .rpc(
            "chat_presence_list_with_last_seen",
            {
                "p_viewer_identity_id": viewer_identity_id,
                "p_target_identity_ids": target_identity_ids,
            },
        )
        .execute()
    )

    rows = getattr(response, "data", None)

    if not isinstance(rows, list):
        raise ValueError("Unexpected chat presence snapshot.")

    return [
        {
            "identity_id": str(row["identity_id"]),
            "is_online": row["is_online"] is True,
            "expires_at": row.get("expires_at"),
            "last_seen_at": row.get("last_seen_at"),
        }
        for row in rows
        if isinstance(row, dict) and row.get("identity_id")
    ]
