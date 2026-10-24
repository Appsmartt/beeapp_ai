from __future__ import annotations

from typing import Any

from apps.chat.cache import bump_conversation_cache_version
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatMessageNotFoundError,
    ChatReactionError,
)
from apps.chat.services.chat_conversation.access import (
    _require_identity_active_participant,
    _require_user_conversation_access,
)
from apps.chat.services.chat_identity_service import get_owned_chat_identity
from apps.chat.services.chat_messages.message_clients import (
    _extract_first_row,
    _response_rows,
    _user_supabase,
)
from apps.chat.services.chat_messages.message_enrichment_service import (
    _enrich_reactions,
    _get_reactions_by_message_ids,
)
from apps.chat.services.chat_messages.message_repository import (
    _get_message_row,
)

def list_message_reactions(
    *,
    user_id: str,
    message_id: str,
) -> list[dict[str, Any]]:
    try:
        message = _get_message_row(message_id=message_id)

        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=message["conversation_id"],
        )

        return _get_reactions_by_message_ids(
            message_ids=[str(message_id)],
        ).get(str(message_id), [])

    except (
        ChatConversationAccessError,
        ChatMessageNotFoundError,
    ):
        raise

    except Exception as error:
        raise ChatReactionError(
            f"Could not retrieve message reactions: {error}"
        ) from error

def create_chat_message_reaction(
    *,
    user_id: str,
    access_token: str,
    message_id: str,
    identity_id: str,
    emoji: str,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )

        message = _get_message_row(message_id=message_id)

        _require_identity_active_participant(
            conversation_id=message["conversation_id"],
            identity_id=identity_id,
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .table("chat_message_reactions")
            .insert(
                {
                    "message_id": str(message_id),
                    "identity_id": str(identity_id),
                    "emoji": emoji.strip(),
                }
            )
            .execute()
        )

        reaction = _extract_first_row(response)

        if not reaction:
            raise ChatReactionError(
                "Supabase did not return the created reaction."
            )

        bump_conversation_cache_version(
            conversation_id=str(message["conversation_id"]),
        )

        enriched_reactions = _enrich_reactions(
            reactions=[reaction],
        )

        return enriched_reactions[0]

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageNotFoundError,
        ChatReactionError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if (
            "chat_message_reactions_one_emoji_per_identity"
            in message
            or "chat_message_reactions_one_per_user" in message
        ):
            raise ChatReactionError(
                "This reaction already exists."
            ) from error

        if "CHAT_REACTION_IDENTITY_NOT_ACTIVE_PARTICIPANT" in message:
            raise ChatConversationAccessError(
                "The selected identity cannot react to this message."
            ) from error

        raise ChatReactionError(
            f"Could not create message reaction: {message}"
        ) from error

def delete_chat_message_reaction(
    *,
    user_id: str,
    access_token: str,
    message_id: str,
    identity_id: str,
    emoji: str,
) -> None:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
            require_active=False,
        )

        message = _get_message_row(message_id=message_id)

        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=message["conversation_id"],
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .table("chat_message_reactions")
            .delete()
            .eq("message_id", str(message_id))
            .eq("identity_id", str(identity_id))
            .eq("emoji", emoji.strip())
            .execute()
        )

        if not _response_rows(response):
            raise ChatReactionError(
                "Reaction was not found."
            )

        bump_conversation_cache_version(
            conversation_id=str(message["conversation_id"]),
        )

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageNotFoundError,
        ChatReactionError,
    ):
        raise

    except Exception as error:
        raise ChatReactionError(
            f"Could not delete message reaction: {error}"
        ) from error
