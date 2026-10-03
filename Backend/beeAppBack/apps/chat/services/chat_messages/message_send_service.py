from __future__ import annotations

from typing import Any

from apps.chat.cache import bump_conversation_cache_version
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatMessageError,
    ChatMessageSendError,
)
from apps.chat.services.chat_conversation_service import (
    _require_identity_active_participant,
)
from apps.chat.services.chat_identity_service import get_owned_chat_identity
from apps.chat.services.chat_messages.message_cache_service import (
    _bump_active_participant_inbox_versions,
)
from apps.chat.services.chat_messages.message_clients import (
    _extract_first_row,
    _user_supabase,
)
from apps.chat.services.chat_messages.message_query_service import (
    get_chat_message,
)
from apps.chat.services.chat_messages.message_validation_service import (
    _validate_message_payload,
    _validate_owned_chat_attachment,
)

def send_chat_message(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    sender_identity_id: str,
    message_type: str,
    body: str | None = None,
    attachment_file_id: str | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=sender_identity_id,
        )

        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=sender_identity_id,
        )

        normalized_body = (
            body.strip()
            if isinstance(body, str) and body.strip()
            else None
        )

        normalized_reference_type = (
            reference_type.strip()
            if (
                isinstance(reference_type, str)
                and reference_type.strip()
            )
            else None
        )

        _validate_message_payload(
            message_type=message_type,
            body=normalized_body,
            attachment_file_id=attachment_file_id,
            reference_type=normalized_reference_type,
            reference_id=reference_id,
            metadata=metadata,
        )

        if attachment_file_id:
            _validate_owned_chat_attachment(
                user_id=user_id,
                file_id=attachment_file_id,
                message_type=message_type,
            )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .table("chat_messages")
            .insert(
                {
                    "conversation_id": str(conversation_id),
                    "sender_identity_id": str(
                        sender_identity_id
                    ),
                    "sender_user_id": str(user_id),
                    "message_type": message_type,
                    "body": normalized_body,
                    "attachment_file_id": (
                        str(attachment_file_id)
                        if attachment_file_id
                        else None
                    ),
                    "reference_type": normalized_reference_type,
                    "reference_id": (
                        str(reference_id)
                        if reference_id
                        else None
                    ),
                    "metadata": metadata or {},
                    "sequence_number": 0,
                }
            )
            .execute()
        )

        message = _extract_first_row(response)

        if not message:
            raise ChatMessageSendError(
                "Supabase did not return the created message."
            )

        bump_conversation_cache_version(
            conversation_id=str(conversation_id),
        )

        _bump_active_participant_inbox_versions(
            conversation_id=str(conversation_id),
        )

        return get_chat_message(
            user_id=user_id,
            message_id=message["id"],
        )

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageError,
        ChatMessageSendError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if any(
            marker in message
            for marker in (
                "CHAT_SENDER_CANNOT_SEND_IN_THIS_CONVERSATION",
                "CHAT_GROUP_ONLY_POSTING_IDENTITY_CAN_SEND",
                "CHAT_SENDER_NOT_ACTIVE_PARTICIPANT_OR_NOT_OWNER",
            )
        ):
            raise ChatConversationAccessError(
                "The selected identity cannot send messages "
                "in this conversation."
            ) from error

        if "CHAT_ATTACHMENT_FILE_MUST_BELONG_TO_SENDER" in message:
            raise ChatMessageSendError(
                "The attachment must belong to the sender."
            ) from error

        if "CHAT_ATTACHMENT_FILE_NOT_READY" in message:
            raise ChatMessageSendError(
                "The attachment is not ready yet."
            ) from error

        if "CHAT_ATTACHMENT_KIND_DOES_NOT_MATCH_MESSAGE_TYPE" in message:
            raise ChatMessageSendError(
                "Attachment type does not match message type."
            ) from error

        if "CHAT_CONVERSATION_NOT_FOUND_OR_INACTIVE" in message:
            raise ChatConversationNotFoundError(
                "Conversation was not found."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatMessageSendError(
            f"Could not send message: {message}"
        ) from error
