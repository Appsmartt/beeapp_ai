from __future__ import annotations

import logging
from typing import Any

from apps.chat.cache import (
    INBOX_TTL_SECONDS,
    get_cached_value,
    inbox_cache_key,
    set_cached_value,
)
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationError,
    ChatInboxError,
)
from apps.chat.services.chat_conversation.inbox_enrichment import (
    _enrich_inbox_rows,
)
from apps.chat.services.chat_conversation.clients import (
    _response_rows,
    _user_supabase,
)
from apps.chat.services.chat_identity_service import (
    get_owned_chat_identity,
)


logger = logging.getLogger(__name__)


def _normalize_inbox_conversation(
    row: dict[str, Any],
) -> dict[str, Any]:
    conversation = dict(row)
    conversation["id"] = str(
        conversation.get("conversation_id")
        or conversation.get("id")
        or ""
    )
    if not conversation["id"]:
        raise ChatInboxError(
            "Chat inbox returned a conversation without an ID."
        )

    conversation["name"] = (
        conversation.get("group_name")
        if conversation.get("group_name") is not None
        else conversation.get("name")
    )
    conversation["description"] = (
        conversation.get("group_description")
        if conversation.get("group_description") is not None
        else conversation.get("description")
    )
    conversation["image_file_id"] = (
        conversation.get("group_image_file_id")
        if conversation.get("group_image_file_id") is not None
        else conversation.get("image_file_id")
    )
    return conversation


def get_chat_inbox(
    *,
    user_id: str,
    access_token: str,
    identity_id: str,
    limit: int = 50,
    before_last_message_at: str | None = None,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )
        cache_key = inbox_cache_key(
            user_id=user_id,
            identity_id=identity_id,
            limit=limit,
            before_last_message_at=before_last_message_at,
        )
        cached_inbox = get_cached_value(key=cache_key)
        if isinstance(cached_inbox, dict):
            logger.info(
                "chat_cache_inbox_hit",
                extra={
                    "identity_id": str(identity_id),
                    "limit": int(limit),
                    "has_cursor": before_last_message_at is not None,
                },
            )
            return cached_inbox

        logger.info(
            "chat_cache_inbox_miss",
            extra={
                "identity_id": str(identity_id),
                "limit": int(limit),
                "has_cursor": before_last_message_at is not None,
            },
        )
        response = (
            _user_supabase(access_token=access_token)
            .rpc(
                "get_chat_inbox",
                {
                    "p_identity_id": str(identity_id),
                    "p_limit": int(limit),
                    "p_before_last_message_at": before_last_message_at,
                },
            )
            .execute()
        )
        conversations = [
            _normalize_inbox_conversation(row)
            for row in _response_rows(response)
        ]

        pinned_conversations: list[dict[str, Any]] = []
        if before_last_message_at is None:
            pinned_response = (
                _user_supabase(access_token=access_token)
                .rpc(
                    "get_chat_pinned_inbox",
                    {"p_identity_id": str(identity_id)},
                )
                .execute()
            )
            pinned_conversations = [
                _normalize_inbox_conversation(row)
                for row in _response_rows(pinned_response)
            ]
            pinned_ids = {
                item["id"] for item in pinned_conversations
            }
        else:
            pinned_ids: set[str] = set()
            if conversations:
                pinned_ids_response = (
                    _user_supabase(access_token=access_token)
                    .table("chat_conversation_participants")
                    .select("conversation_id")
                    .eq("identity_id", str(identity_id))
                    .eq("is_pinned", True)
                    .is_("left_at", "null")
                    .is_("removed_at", "null")
                    .in_(
                        "conversation_id",
                        [row["id"] for row in conversations],
                    )
                    .execute()
                )
                pinned_ids = {
                    str(row["conversation_id"])
                    for row in _response_rows(pinned_ids_response)
                }

        for conversation in conversations:
            conversation["is_pinned"] = (
                conversation["id"] in pinned_ids
            )

        combined_conversations = conversations + pinned_conversations
        if combined_conversations:
            _enrich_inbox_rows(
                access_token=access_token,
                conversations=combined_conversations,
            )

        inbox = {
            "identity_id": str(identity_id),
            "conversations": conversations,
            "pinned_conversations": pinned_conversations,
            "limit": limit,
            "next_before_last_message_at": (
                conversations[-1].get("last_message_at")
                if conversations
                else None
            ),
        }
        set_cached_value(
            key=cache_key,
            value=inbox,
            timeout=INBOX_TTL_SECONDS,
        )
        return inbox
    except ChatConversationError:
        raise
    except Exception as error:
        logger.exception(
            "chat_inbox_rpc_failed",
            extra={
                "user_id": str(user_id),
                "identity_id": str(identity_id),
                "limit": int(limit),
                "has_cursor": before_last_message_at is not None,
            },
        )
        message = str(error)
        if "CHAT_IDENTITY_NOT_OWNED_BY_USER" in message:
            raise ChatConversationAccessError(
                "The selected inbox identity is unavailable."
            ) from error
        if "CHAT_INBOX_LIMIT_MUST_BE_BETWEEN_1_AND_100" in message:
            raise ChatInboxError(
                "Inbox limit must be between 1 and 100."
            ) from error
        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error
        raise ChatInboxError(
            f"Could not retrieve chat inbox: {message}"
        ) from error


def get_chat_unpinned_inbox_by_type(
    *,
    user_id: str,
    access_token: str,
    identity_id: str,
    conversation_type: str,
    limit: int,
    before_sort_at: str | None = None,
    before_id: str | None = None,
) -> dict[str, Any]:
    if conversation_type not in ("direct", "group"):
        raise ChatInboxError("Unsupported conversation type.")
    if limit not in (5, 10):
        raise ChatInboxError("Inbox page size must be 5 or 10.")
    if (before_sort_at is None) != (before_id is None):
        raise ChatInboxError("Incomplete inbox cursor.")

    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )
        response = (
            _user_supabase(access_token=access_token)
            .rpc(
                "get_chat_unpinned_inbox_by_type",
                {
                    "p_identity_id": str(identity_id),
                    "p_conversation_type": conversation_type,
                    "p_limit": limit,
                    "p_before_sort_at": before_sort_at,
                    "p_before_id": before_id,
                },
            )
            .execute()
        )
        conversations = [
            _normalize_inbox_conversation(row)
            for row in _response_rows(response)
        ]
        _enrich_inbox_rows(
            access_token=access_token,
            conversations=conversations,
        )

        last_row = conversations[-1] if conversations else None
        return {
            "identity_id": str(identity_id),
            "conversation_type": conversation_type,
            "conversations": conversations,
            "limit": limit,
            "has_more": len(conversations) == limit,
            "next_before_sort_at": (
                last_row.get("sort_at") if last_row else None
            ),
            "next_before_id": (
                last_row["id"] if last_row else None
            ),
        }
    except ChatConversationError:
        raise
    except Exception as error:
        logger.exception(
            "chat_typed_inbox_rpc_failed",
            extra={
                "user_id": str(user_id),
                "identity_id": str(identity_id),
                "conversation_type": conversation_type,
                "limit": limit,
            },
        )
        message = str(error)
        if (
            "AUTHENTICATION_REQUIRED" in message
            or "CHAT_IDENTITY_NOT_OWNED_BY_USER" in message
        ):
            raise ChatConversationAccessError(
                "The selected inbox identity is unavailable."
            ) from error
        raise ChatInboxError(
            f"Could not retrieve typed chat inbox: {message}"
        ) from error
