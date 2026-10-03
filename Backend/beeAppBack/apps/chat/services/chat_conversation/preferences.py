from __future__ import annotations

from typing import Any

from apps.chat.cache import bump_inbox_cache_version
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationError,
    ChatConversationNotFoundError,
)
from apps.chat.services.chat_conversation.access import (
    _require_identity_active_participant,
)
from apps.chat.services.chat_conversation.clients import _user_supabase
from apps.chat.services.chat_conversation.conversations import (
    get_conversation,
)
from apps.chat.services.chat_identity_service import (
    get_owned_chat_identity,
)


def set_chat_conversation_notifications(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    identity_id: str,
    notifications_enabled: bool,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )
        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=identity_id,
        )
        response = (
            _user_supabase(access_token=access_token)
            .rpc(
                "set_chat_conversation_notifications",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_identity_id": str(identity_id),
                    "p_notifications_enabled": bool(
                        notifications_enabled
                    ),
                },
            )
            .execute()
        )
        if response.data is not True:
            raise ChatConversationError(
                "Conversation notification preference could not be updated."
            )

        bump_inbox_cache_version(identity_id=str(identity_id))
        return get_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            include_participants=True,
        )
    except (
        ChatConversationAccessError,
        ChatConversationError,
        ChatConversationNotFoundError,
    ):
        raise
    except Exception as error:
        message = str(error)
        if (
            "CHAT_IDENTITY_NOT_OWNED_BY_USER" in message
            or "AUTHENTICATION_REQUIRED" in message
        ):
            raise ChatConversationAccessError(
                "The selected identity cannot update this preference."
            ) from error
        if "CHAT_ACTIVE_PARTICIPATION_NOT_FOUND" in message:
            raise ChatConversationNotFoundError(
                "Conversation was not found."
            ) from error
        if "CHAT_NOTIFICATION_SETTINGS_PAYLOAD_INVALID" in message:
            raise ChatConversationError(
                "The notification preference payload is invalid."
            ) from error
        raise ChatConversationError(
            "Could not update conversation notification preference: "
            f"{message}"
        ) from error


def set_chat_conversation_pinned(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    identity_id: str,
    is_pinned: bool,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )
        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=identity_id,
        )
        response = (
            _user_supabase(access_token=access_token)
            .rpc(
                "set_chat_conversation_pinned",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_identity_id": str(identity_id),
                    "p_is_pinned": bool(is_pinned),
                },
            )
            .execute()
        )
        if response.data is not True:
            raise ChatConversationError(
                "Conversation pin preference could not be updated."
            )

        bump_inbox_cache_version(identity_id=str(identity_id))
        return get_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            include_participants=True,
        )
    except (
        ChatConversationAccessError,
        ChatConversationError,
        ChatConversationNotFoundError,
    ):
        raise
    except Exception as error:
        message = str(error)
        if (
            "CHAT_IDENTITY_NOT_OWNED_BY_USER" in message
            or "AUTHENTICATION_REQUIRED" in message
        ):
            raise ChatConversationAccessError(
                "The selected identity cannot update this preference."
            ) from error
        if "CHAT_ACTIVE_PARTICIPATION_NOT_FOUND" in message:
            raise ChatConversationNotFoundError(
                "Conversation was not found."
            ) from error
        raise ChatConversationError(
            f"Could not update conversation pin preference: {message}"
        ) from error


def clear_chat_conversation(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    identity_id: str,
) -> None:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )
        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=identity_id,
        )
        response = (
            _user_supabase(access_token=access_token)
            .rpc(
                "clear_chat_conversation",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_identity_id": str(identity_id),
                },
            )
            .execute()
        )
        if response.data is not True:
            raise ChatConversationError(
                "Conversation could not be cleared."
            )
    except (
        ChatConversationAccessError,
        ChatConversationError,
    ):
        raise
    except Exception as error:
        message = str(error)
        if "CHAT_ACTIVE_PARTICIPATION_NOT_FOUND" in message:
            raise ChatConversationNotFoundError(
                "Conversation was not found."
            ) from error
        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error
        raise ChatConversationError(
            f"Could not clear conversation: {message}"
        ) from error
