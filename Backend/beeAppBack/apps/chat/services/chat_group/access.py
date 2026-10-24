from __future__ import annotations

from typing import Any

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupInviteError,
)
from apps.chat.services.chat_identity_service import (
    get_owned_chat_identity,
)
from apps.chat.services.chat_group.clients import (
    _extract_first_row,
    _response_rows,
    _supabase,
)
from apps.chat.services.chat_group.constants import (
    CONVERSATION_COLUMNS,
    INVITE_COLUMNS,
)


def _get_group_conversation(
    *,
    conversation_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("chat_conversations")
        .select(CONVERSATION_COLUMNS)
        .eq("id", str(conversation_id))
        .eq("conversation_type", "group")
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )

    conversation = _extract_first_row(response)

    if not conversation:
        raise ChatConversationNotFoundError(
            "Group was not found."
        )

    return conversation


def _require_user_is_group_manager(
    *,
    user_id: str,
    conversation_id: str,
) -> None:
    response = (
        _supabase()
        .table("chat_conversation_participants")
        .select("identity_id,role")
        .eq("conversation_id", str(conversation_id))
        .in_("role", ["owner", "admin"])
        .is_("left_at", "null")
        .is_("removed_at", "null")
        .execute()
    )

    manager_identity_ids = [
        str(participant["identity_id"])
        for participant in _response_rows(response)
        if participant.get("identity_id")
    ]

    if not manager_identity_ids:
        raise ChatConversationAccessError(
            "Group invitation was not found."
        )

    owned_manager_response = (
        _supabase()
        .table("chat_identities")
        .select("id")
        .in_("id", manager_identity_ids)
        .eq("owner_id", str(user_id))
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if not _extract_first_row(owned_manager_response):
        raise ChatConversationAccessError(
            "Group invitation was not found."
        )


def _get_owned_identity_ids(
    *,
    user_id: str,
    identity_id: str | None = None,
) -> list[str]:
    if identity_id:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )

        return [str(identity_id)]

    response = (
        _supabase()
        .table("chat_identities")
        .select("id")
        .eq("owner_id", str(user_id))
        .eq("is_active", True)
        .execute()
    )

    return [
        identity["id"]
        for identity in _response_rows(response)
    ]


def _get_invite_row(
    *,
    invite_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("chat_group_invites")
        .select(INVITE_COLUMNS)
        .eq("id", str(invite_id))
        .maybe_single()
        .execute()
    )

    invite = _extract_first_row(response)

    if not invite:
        raise ChatGroupInviteError(
            "Group invitation was not found."
        )

    return invite


def _user_owns_identity(
    *,
    user_id: str,
    identity_id: str,
) -> bool:
    response = (
        _supabase()
        .table("chat_identities")
        .select("id")
        .eq("id", str(identity_id))
        .eq("owner_id", str(user_id))
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )

    return _extract_first_row(response) is not None
