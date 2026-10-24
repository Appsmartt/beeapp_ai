from __future__ import annotations

import logging
from typing import Any

from apps.chat.cache import (
    MESSAGES_HISTORY_TTL_SECONDS,
    MESSAGES_LATEST_TTL_SECONDS,
    get_cached_value,
    set_cached_value,
    user_messages_cache_key,
)
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatMessageError,
    ChatMessageNotFoundError,
)
from apps.chat.services.chat_conversation.access import (
    _require_user_conversation_access,
)
from apps.chat.services.chat_messages.message_clients import (
    _response_rows,
    _supabase,
)
from apps.chat.services.chat_messages.message_enrichment_service import (
    _enrich_messages,
)
from apps.chat.services.chat_messages.message_repository import (
    MESSAGE_COLUMNS,
    _get_message_row,
)

logger = logging.getLogger(__name__)

def list_conversation_messages(
    *,
    user_id: str,
    conversation_id: str,
    limit: int = 50,
    before_sequence: int | None = None,
) -> dict[str, Any]:
    """
    Lista mensajes de una conversación.

    La autorización se ejecuta antes de consultar caché. La caché
    guarda el payload final ya enriquecido con identidad remitente,
    adjunto y reacciones, sin cambiar el contrato existente del
    endpoint HTTP.
    """
    try:
        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=conversation_id,
        )

        cache_key = user_messages_cache_key(
            user_id=user_id,
            conversation_id=conversation_id,
            limit=limit,
            before_sequence=before_sequence,
        )

        cached_messages = get_cached_value(
            key=cache_key,
        )

        if isinstance(cached_messages, dict):
            logger.info(
                "chat_cache_messages_hit",
                extra={
                    "conversation_id": str(conversation_id),
                    "limit": int(limit),
                    "has_cursor": (
                        before_sequence is not None
                    ),
                },
            )
            return cached_messages

        logger.info(
            "chat_cache_messages_miss",
            extra={
                "conversation_id": str(conversation_id),
                "limit": int(limit),
                "has_cursor": (
                    before_sequence is not None
                ),
            },
        )

        query = (
            _supabase()
            .table("chat_messages")
            .select(MESSAGE_COLUMNS)
            .eq("conversation_id", str(conversation_id))
            .order("sequence_number", desc=True)
            .limit(limit)
        )

        if before_sequence is not None:
            query = query.lt(
                "sequence_number",
                int(before_sequence),
            )

        response = query.execute()
        descending_messages = _response_rows(response)
        messages = list(reversed(descending_messages))

        enriched_messages = _enrich_messages(
            messages=messages,
            viewer_user_id=str(user_id),
        )

        result = {
            "conversation_id": str(conversation_id),
            "messages": enriched_messages,
            "limit": limit,
            "next_before_sequence": (
                messages[0]["sequence_number"]
                if messages
                else None
            ),
        }

        set_cached_value(
            key=cache_key,
            value=result,
            timeout=(
                MESSAGES_LATEST_TTL_SECONDS
                if before_sequence is None
                else MESSAGES_HISTORY_TTL_SECONDS
            ),
        )

        return result

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageError,
    ):
        raise

    except Exception as error:
        raise ChatMessageError(
            f"Could not retrieve conversation messages: {error}"
        ) from error

def get_chat_message(
    *,
    user_id: str,
    message_id: str,
) -> dict[str, Any]:
    try:
        message = _get_message_row(message_id=message_id)

        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=message["conversation_id"],
        )

        enriched_messages = _enrich_messages(
            messages=[message],
            viewer_user_id=str(user_id),
        )

        if not enriched_messages:
            raise ChatMessageNotFoundError(
                "Message was not found."
            )

        return enriched_messages[0]

    except (
        ChatConversationAccessError,
        ChatMessageNotFoundError,
    ):
        raise

    except Exception as error:
        raise ChatMessageNotFoundError(
            f"Could not retrieve message: {error}"
        ) from error
