from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationError,
    ChatConversationNotFoundError,
    ChatDirectConversationError,
    ChatInboxError,
)
from apps.chat.services.chat_identity_service import (
    get_chat_identity,
    get_owned_chat_identity,
)


CONVERSATION_COLUMNS = (
    "id,conversation_type,direct_key,created_by_identity_id,"
    "posting_identity_id,name,description,image_file_id,"
    "last_message_id,last_message_at,is_active,"
    "created_at,updated_at"
)

PARTICIPANT_COLUMNS = (
    "id,conversation_id,identity_id,role,joined_at,left_at,"
    "removed_at,removed_by_identity_id,cleared_at,"
    "cleared_before_message_id,last_read_message_id,"
    "last_read_at,last_delivered_message_id,last_delivered_at,"
    "notifications_enabled,unread_count,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _user_supabase(
    *,
    access_token: str,
):
    return get_supabase_user_client(
        access_token=access_token,
    )


def _extract_first_row(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


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
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "create_direct_chat",
                {
                    "p_sender_identity_id": str(
                        sender_identity_id
                    ),
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
            include_participants=True,
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

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "get_chat_inbox",
                {
                    "p_identity_id": str(identity_id),
                    "p_limit": int(limit),
                    "p_before_last_message_at": (
                        before_last_message_at
                    ),
                },
            )
            .execute()
        )

        conversations = _response_rows(response)

        return {
            "identity_id": str(identity_id),
            "conversations": conversations,
            "limit": limit,
            "next_before_last_message_at": (
                conversations[-1].get("last_message_at")
                if conversations
                else None
            ),
        }

    except ChatConversationError:
        raise

    except Exception as error:
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

        if include_participants:
            conversation["participants"] = (
                list_conversation_participants(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    include_inactive=False,
                )
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
            _user_supabase(
                access_token=access_token,
            )
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

    identity = _extract_first_row(identities_response)

    if not identity:
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
        raise ChatConversationNotFoundError(
            "Conversation was not found or is inaccessible."
        )


def _extract_rpc_uuid(
    value: Any,
    function_name: str,
) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return _extract_rpc_uuid(
            value[0],
            function_name,
        )

    if isinstance(value, dict):
        return (
            value.get(function_name)
            or value.get("id")
            or value.get("value")
        )

    return None