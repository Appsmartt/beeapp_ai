from __future__ import annotations

import logging
from typing import Any

from apps.chat.cache import bump_inbox_cache_version
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatMessageError,
    ChatMessageNotFoundError,
)
from apps.chat.services.chat_conversation.access import (
    _require_identity_active_participant,
    _require_user_conversation_access,
)
from apps.chat.services.chat_identity_service import get_owned_chat_identity
from apps.chat.services.chat_messages.message_clients import (
    _response_rows,
    _user_supabase,
)
from apps.chat.services.chat_messages.message_repository import (
    _get_message_row,
)

logger = logging.getLogger(__name__)

def mark_chat_conversation_delivered(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    identity_id: str,
    last_delivered_message_id: str,
) -> bool:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )
        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=identity_id,
        )

        message = _get_message_row(
            message_id=last_delivered_message_id,
        )
        if str(message["conversation_id"]) != str(conversation_id):
            raise ChatMessageNotFoundError(
                "The selected message does not belong to this conversation."
            )

        response = (
            _user_supabase(access_token=access_token)
            .rpc(
                "mark_chat_conversation_delivered",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_identity_id": str(identity_id),
                    "p_last_delivered_message_id": str(
                        last_delivered_message_id
                    ),
                },
            )
            .execute()
        )
        if response.data is not True:
            raise ChatMessageError(
                "Conversation could not be marked as delivered."
            )
        return True

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageNotFoundError,
        ChatMessageError,
    ):
        raise
    except Exception as error:
        detail = str(error)
        if "CHAT_LAST_DELIVERED_MESSAGE_NOT_IN_CONVERSATION" in detail:
            raise ChatMessageNotFoundError(
                "The selected message does not belong to this conversation."
            ) from error
        if "CHAT_IDENTITY_CANNOT_RECEIVE_THIS_CONVERSATION" in detail:
            raise ChatConversationAccessError(
                "The selected identity cannot receive this conversation."
            ) from error
        if "AUTHENTICATION_REQUIRED" in detail:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error
        raise ChatMessageError(
            f"Could not mark conversation as delivered: {detail}"
        ) from error

def mark_chat_conversation_read(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    identity_id: str,
    last_read_message_id: str,
) -> bool:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )

        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=identity_id,
        )

        message = _get_message_row(
            message_id=last_read_message_id,
        )

        if str(message["conversation_id"]) != str(
            conversation_id
        ):
            raise ChatMessageNotFoundError(
                "The selected message does not belong to this conversation."
            )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "mark_chat_conversation_read",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_identity_id": str(identity_id),
                    "p_last_read_message_id": str(
                        last_read_message_id
                    ),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise ChatMessageError(
                "Conversation could not be marked as read."
            )

        try:
            bump_inbox_cache_version(identity_id=str(identity_id))
        except Exception:
            logger.warning(
                "chat_read_inbox_cache_invalidation_failed",
                extra={"identity_id": str(identity_id)},
            )
        return True

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageNotFoundError,
        ChatMessageError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "CHAT_LAST_READ_MESSAGE_NOT_IN_CONVERSATION" in message:
            raise ChatMessageNotFoundError(
                "The selected message does not belong to this conversation."
            ) from error

        if "CHAT_IDENTITY_CANNOT_READ_THIS_CONVERSATION" in message:
            raise ChatConversationAccessError(
                "The selected identity cannot read this conversation."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatMessageError(
            f"Could not mark conversation as read: {message}"
        ) from error

def get_chat_message_read_status(
    *,
    user_id: str,
    access_token: str,
    message_id: str,
) -> list[dict[str, Any]]:
    try:
        message = _get_message_row(message_id=message_id)

        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=message["conversation_id"],
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "get_chat_message_read_status",
                {
                    "p_message_id": str(message_id),
                },
            )
            .execute()
        )

        return _response_rows(response)

    except (
        ChatConversationAccessError,
        ChatMessageNotFoundError,
        ChatMessageError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "CHAT_READ_STATUS_ONLY_AVAILABLE_FOR_DIRECT_MESSAGES" in message:
            raise ChatMessageError(
                "Read status is only available for direct messages."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatMessageError(
            f"Could not retrieve message read status: {message}"
        ) from error

def get_chat_message_readers(
    *,
    user_id: str,
    access_token: str,
    message_id: str,
) -> list[dict[str, Any]]:
    try:
        message = _get_message_row(message_id=message_id)

        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=message["conversation_id"],
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "get_chat_message_readers",
                {
                    "p_message_id": str(message_id),
                },
            )
            .execute()
        )

        return _response_rows(response)

    except (
        ChatConversationAccessError,
        ChatMessageNotFoundError,
        ChatMessageError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatMessageError(
            f"Could not retrieve message readers: {message}"
        ) from error
