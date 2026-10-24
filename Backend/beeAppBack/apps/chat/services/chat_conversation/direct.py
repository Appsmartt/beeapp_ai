from __future__ import annotations

from typing import Any

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationError,
    ChatConversationNotFoundError,
    ChatDirectConversationError,
)
from apps.chat.services.chat_conversation.clients import (
    _extract_first_row,
    _supabase,
    _user_supabase,
)
from apps.chat.services.chat_conversation.conversations import (
    get_conversation,
)
from apps.chat.services.chat_conversation.validation import (
    _extract_rpc_uuid,
)
from apps.chat.services.chat_identity_service import (
    get_chat_identity,
    get_owned_chat_identity,
)


def _build_direct_key(
    *,
    sender_identity_id: str,
    recipient_identity_id: str,
) -> str:
    normalized_ids = sorted(
        (
            str(sender_identity_id),
            str(recipient_identity_id),
        )
    )
    return f"{normalized_ids[0]}:{normalized_ids[1]}"


def _find_direct_conversation_id(
    *,
    sender_identity_id: str,
    recipient_identity_id: str,
) -> str | None:
    direct_key = _build_direct_key(
        sender_identity_id=sender_identity_id,
        recipient_identity_id=recipient_identity_id,
    )
    response = (
        _supabase()
        .table("chat_conversations")
        .select("id")
        .eq("conversation_type", "direct")
        .eq("direct_key", direct_key)
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    conversation = _extract_first_row(response)
    return conversation.get("id") if conversation else None


def create_or_get_direct_conversation(
    *,
    user_id: str,
    access_token: str,
    sender_identity_id: str,
    recipient_identity_id: str,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=sender_identity_id,
        )
        if str(sender_identity_id) == str(recipient_identity_id):
            raise ChatDirectConversationError(
                "Sender and recipient identities must be different."
            )

        get_chat_identity(
            identity_id=recipient_identity_id,
            require_active=True,
        )
        existing_conversation_id = _find_direct_conversation_id(
            sender_identity_id=sender_identity_id,
            recipient_identity_id=recipient_identity_id,
        )
        response = (
            _user_supabase(access_token=access_token)
            .rpc(
                "create_direct_chat",
                {
                    "p_sender_identity_id": str(sender_identity_id),
                    "p_recipient_identity_id": str(
                        recipient_identity_id
                    ),
                },
            )
            .execute()
        )
        conversation_id = _extract_rpc_uuid(
            response.data,
            "create_direct_chat",
        )
        if not conversation_id:
            raise ChatDirectConversationError(
                "Supabase did not return the direct conversation ID."
            )

        conversation = get_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            include_participants=False,
        )
        return {
            "conversation": conversation,
            "created": existing_conversation_id is None,
        }
    except (
        ChatConversationAccessError,
        ChatConversationError,
        ChatConversationNotFoundError,
        ChatDirectConversationError,
    ):
        raise
    except Exception as error:
        message = str(error)
        if "CHAT_SENDER_IDENTITY_NOT_OWNED_BY_USER" in message:
            raise ChatConversationAccessError(
                "The selected sender identity is unavailable."
            ) from error
        if "CHAT_RECIPIENT_IDENTITY_NOT_AVAILABLE" in message:
            raise ChatDirectConversationError(
                "The recipient identity is unavailable."
            ) from error
        if "CHAT_DIRECT_IDENTITIES_MUST_BE_DIFFERENT" in message:
            raise ChatDirectConversationError(
                "Sender and recipient identities must be different."
            ) from error
        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error
        raise ChatDirectConversationError(
            f"Could not create direct conversation: {message}"
        ) from error
