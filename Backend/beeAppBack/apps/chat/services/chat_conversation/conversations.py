from __future__ import annotations

from typing import Any

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationError,
    ChatConversationNotFoundError,
)
from apps.chat.services.chat_conversation.access import (
    _build_conversation_permissions,
    _get_user_active_participant,
    _require_user_conversation_access,
)
from apps.chat.services.chat_conversation.clients import (
    CONVERSATION_COLUMNS,
    PARTICIPANT_COLUMNS,
    _extract_first_row,
    _response_rows,
    _supabase,
)
from apps.chat.services.chat_identity_service import get_chat_identity


def get_conversation(
    *,
    user_id: str,
    conversation_id: str,
    include_participants: bool = True,
) -> dict[str, Any]:
    try:
        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=conversation_id,
        )
        response = (
            _supabase()
            .table("chat_conversations")
            .select(CONVERSATION_COLUMNS)
            .eq("id", str(conversation_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        conversation = _extract_first_row(response)
        if not conversation:
            raise ChatConversationNotFoundError(
                "Conversation was not found."
            )

        own_participant = _get_user_active_participant(
            user_id=user_id,
            conversation_id=conversation_id,
        )
        conversation["own_participant"] = own_participant
        conversation["permissions"] = _build_conversation_permissions(
            conversation=conversation,
            own_participant=own_participant,
        )

        if include_participants:
            conversation["participants"] = list_conversation_participants(
                user_id=user_id,
                conversation_id=conversation_id,
                include_inactive=False,
            )

        return conversation
    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
    ):
        raise
    except Exception as error:
        raise ChatConversationError(
            f"Could not retrieve conversation: {error}"
        ) from error


def list_conversation_participants(
    *,
    user_id: str,
    conversation_id: str,
    include_inactive: bool = False,
) -> list[dict[str, Any]]:
    try:
        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=conversation_id,
        )
        query = (
            _supabase()
            .table("chat_conversation_participants")
            .select(PARTICIPANT_COLUMNS)
            .eq("conversation_id", str(conversation_id))
            .order("joined_at")
        )
        if not include_inactive:
            query = (
                query.is_("left_at", "null")
                .is_("removed_at", "null")
            )

        response = query.execute()
        participants = _response_rows(response)
        serialized_participants: list[dict[str, Any]] = []

        for participant in participants:
            try:
                identity = get_chat_identity(
                    identity_id=participant["identity_id"],
                    require_active=False,
                )
            except Exception:
                identity = {
                    "id": participant["identity_id"],
                    "identity_type": None,
                    "profile_id": None,
                    "commercial_profile_id": None,
                    "display_name": "User",
                    "avatar_file_id": None,
                    "is_active": False,
                    "is_available": False,
                }
            serialized_participants.append(
                {
                    **participant,
                    "identity": identity,
                }
            )

        return serialized_participants
    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
    ):
        raise
    except Exception as error:
        raise ChatConversationError(
            f"Could not retrieve conversation participants: {error}"
        ) from error
