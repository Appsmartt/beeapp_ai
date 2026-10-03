from __future__ import annotations

from typing import Any

from apps.chat.exceptions import ChatConversationAccessError
from apps.chat.services.chat_conversation.clients import (
    PARTICIPANT_COLUMNS,
    _extract_first_row,
    _response_rows,
    _supabase,
)


def _get_user_active_participant(
    *,
    user_id: str,
    conversation_id: str,
) -> dict[str, Any] | None:
    response = (
        _supabase()
        .table("chat_conversation_participants")
        .select(PARTICIPANT_COLUMNS)
        .eq("conversation_id", str(conversation_id))
        .is_("left_at", "null")
        .is_("removed_at", "null")
        .execute()
    )
    participants = _response_rows(response)

    if not participants:
        return None

    identity_ids = [
        str(participant["identity_id"])
        for participant in participants
        if participant.get("identity_id")
    ]
    if not identity_ids:
        return None

    identities_response = (
        _supabase()
        .table("chat_identities")
        .select("id")
        .in_("id", identity_ids)
        .eq("owner_id", str(user_id))
        .eq("is_active", True)
        .execute()
    )
    owned_identity_ids = {
        str(identity["id"])
        for identity in _response_rows(identities_response)
        if identity.get("id")
    }

    for participant in participants:
        if str(participant.get("identity_id")) in owned_identity_ids:
            return participant

    return None


def _build_conversation_permissions(
    *,
    conversation: dict[str, Any],
    own_participant: dict[str, Any] | None,
) -> dict[str, Any]:
    conversation_type = conversation.get("conversation_type")
    own_role = own_participant.get("role") if own_participant else None
    is_group = conversation_type == "group"
    is_owner = own_role == "owner"
    is_admin = own_role == "admin"
    is_manager = is_owner or is_admin
    is_active_participant = own_participant is not None
    posting_policy = conversation.get("posting_policy")

    can_send_messages = bool(is_active_participant) and (
        conversation_type == "direct"
        or posting_policy == "all_members"
        or (
            posting_policy == "admins_only"
            and is_manager
        )
    )

    return {
        "own_role": own_role,
        "is_active_participant": is_active_participant,
        "can_send_messages": can_send_messages,
        "can_invite_members": is_group and is_manager,
        "can_remove_members": is_group and is_manager,
        "can_promote_members": is_group and is_manager,
        "can_demote_admins": is_group and is_owner,
        "can_update_group": is_group and is_owner,
        "can_transfer_ownership": is_group and is_owner,
        "can_deactivate_group": is_group and is_owner,
        "can_leave_group": (
            is_group
            and is_active_participant
            and not is_owner
        ),
    }


def _require_user_conversation_access(
    *,
    user_id: str,
    conversation_id: str,
) -> None:
    participation_response = (
        _supabase()
        .table("chat_conversation_participants")
        .select("id,identity_id")
        .eq("conversation_id", str(conversation_id))
        .is_("left_at", "null")
        .is_("removed_at", "null")
        .execute()
    )
    participants = _response_rows(participation_response)

    if not participants:
        raise ChatConversationAccessError(
            "Conversation was not found or is inaccessible."
        )

    identity_ids = [
        str(participant["identity_id"])
        for participant in participants
        if participant.get("identity_id")
    ]
    if not identity_ids:
        raise ChatConversationAccessError(
            "Conversation was not found or is inaccessible."
        )

    identities_response = (
        _supabase()
        .table("chat_identities")
        .select("id,owner_id,is_active")
        .in_("id", identity_ids)
        .eq("owner_id", str(user_id))
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if not _extract_first_row(identities_response):
        raise ChatConversationAccessError(
            "Conversation was not found or is inaccessible."
        )


def _require_identity_active_participant(
    *,
    conversation_id: str,
    identity_id: str,
) -> None:
    response = (
        _supabase()
        .table("chat_conversation_participants")
        .select("id")
        .eq("conversation_id", str(conversation_id))
        .eq("identity_id", str(identity_id))
        .is_("left_at", "null")
        .is_("removed_at", "null")
        .maybe_single()
        .execute()
    )

    if not _extract_first_row(response):
        raise ChatConversationAccessError(
            "Conversation was not found or is inaccessible."
        )
