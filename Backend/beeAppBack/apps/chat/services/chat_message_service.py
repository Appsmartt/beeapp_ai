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
    ChatMessageError,
    ChatMessageNotFoundError,
    ChatMessageSendError,
    ChatReactionError,
)
from apps.chat.services.chat_conversation_service import (
    _require_identity_active_participant,
    _require_user_conversation_access,
)
from apps.chat.services.chat_identity_service import (
    get_chat_identity,
    get_owned_chat_identity,
)


MESSAGE_COLUMNS = (
    "id,conversation_id,sender_identity_id,sender_user_id,"
    "message_type,body,attachment_file_id,reference_type,"
    "reference_id,metadata,sequence_number,created_at"
)

REACTION_COLUMNS = (
    "id,message_id,identity_id,emoji,created_at"
)

FILE_COLUMNS = (
    "id,owner_id,bucket_id,storage_path,original_name,"
    "display_name,extension,mime_type,kind,size_bytes,status,"
    "trashed_at,created_at,updated_at"
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


def list_conversation_messages(
    *,
    user_id: str,
    conversation_id: str,
    limit: int = 50,
    before_sequence: int | None = None,
) -> dict[str, Any]:
    try:
        _require_user_conversation_access(
            user_id=user_id,
            conversation_id=conversation_id,
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
        )

        return {
            "conversation_id": str(conversation_id),
            "messages": enriched_messages,
            "limit": limit,
            "next_before_sequence": (
                messages[0]["sequence_number"]
                if messages
                else None
            ),
        }

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

        if "CHAT_GROUP_ONLY_POSTING_IDENTITY_CAN_SEND" in message:
            raise ChatMessageSendError(
                "Only the group creator can send messages."
            ) from error

        if "CHAT_SENDER_NOT_ACTIVE_PARTICIPANT_OR_NOT_OWNER" in message:
            raise ChatConversationAccessError(
                "The selected identity cannot send in this conversation."
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

        response = (
            _supabase()
            .table("chat_message_reactions")
            .select(REACTION_COLUMNS)
            .eq("message_id", str(message_id))
            .order("created_at")
            .execute()
        )

        reactions = _response_rows(response)

        return _enrich_reactions(reactions=reactions)

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


def _get_message_row(
    *,
    message_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("chat_messages")
        .select(MESSAGE_COLUMNS)
        .eq("id", str(message_id))
        .maybe_single()
        .execute()
    )

    message = _extract_first_row(response)

    if not message:
        raise ChatMessageNotFoundError(
            "Message was not found."
        )

    return message


def _validate_message_payload(
    *,
    message_type: str,
    body: str | None,
    attachment_file_id: str | None,
    reference_type: str | None,
    reference_id: str | None,
    metadata: dict[str, Any] | None,
) -> None:
    allowed_message_types = {
        "text",
        "image",
        "video",
        "audio",
        "document",
        "quotation",
        "order",
        "reservation",
        "invoice",
        "link",
    }

    if message_type not in allowed_message_types:
        raise ChatMessageSendError(
            "Unsupported message type."
        )

    if not isinstance(metadata or {}, dict):
        raise ChatMessageSendError(
            "Message metadata must be a JSON object."
        )

    if bool(reference_type) != bool(reference_id):
        raise ChatMessageSendError(
            "reference_type and reference_id must be provided together."
        )

    if message_type == "text" and not body:
        raise ChatMessageSendError(
            "Text messages require non-empty content."
        )

    attachment_message_types = {
        "image",
        "video",
        "audio",
        "document",
    }

    if (
        message_type in attachment_message_types
        and not attachment_file_id
    ):
        raise ChatMessageSendError(
            "This message type requires an attachment."
        )

    if not body and not attachment_file_id and not reference_id:
        raise ChatMessageSendError(
            "A message requires text, an attachment, or a reference."
        )


def _validate_owned_chat_attachment(
    *,
    user_id: str,
    file_id: str,
    message_type: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("files")
            .select(FILE_COLUMNS)
            .eq("id", str(file_id))
            .eq("owner_id", str(user_id))
            .eq("status", "ready")
            .maybe_single()
            .execute()
        )

        file_record = _extract_first_row(response)

        if not file_record:
            raise ChatMessageSendError(
                "Attachment file was not found or is unavailable."
            )

        if file_record.get("trashed_at") is not None:
            raise ChatMessageSendError(
                "Attachment file is in trash."
            )

        expected_kind_by_message_type = {
            "image": "image",
            "video": "video",
            "audio": "audio",
            "document": "document",
        }

        expected_kind = expected_kind_by_message_type.get(
            message_type
        )

        if expected_kind and file_record.get("kind") != expected_kind:
            raise ChatMessageSendError(
                "Attachment type does not match message type."
            )

        return file_record

    except ChatMessageSendError:
        raise

    except Exception as error:
        raise ChatMessageSendError(
            f"Could not validate attachment file: {error}"
        ) from error


def _enrich_messages(
    *,
    messages: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not messages:
        return []

    sender_identity_ids = list(
        {
            message["sender_identity_id"]
            for message in messages
            if message.get("sender_identity_id")
        }
    )

    attachment_file_ids = list(
        {
            message["attachment_file_id"]
            for message in messages
            if message.get("attachment_file_id")
        }
    )

    message_ids = [
        message["id"]
        for message in messages
        if message.get("id")
    ]

    identities_by_id = _get_identities_by_ids(
        identity_ids=sender_identity_ids,
    )

    files_by_id = _get_files_by_ids(
        file_ids=attachment_file_ids,
    )

    reactions_by_message_id = _get_reactions_by_message_ids(
        message_ids=message_ids,
    )

    result: list[dict[str, Any]] = []

    for message in messages:
        sender_identity_id = message.get("sender_identity_id")
        attachment_file_id = message.get("attachment_file_id")

        result.append(
            {
                **message,
                "sender_identity": (
                    identities_by_id.get(sender_identity_id)
                    if sender_identity_id
                    else None
                ),
                "attachment": (
                    files_by_id.get(attachment_file_id)
                    if attachment_file_id
                    else None
                ),
                "reactions": reactions_by_message_id.get(
                    message["id"],
                    [],
                ),
            }
        )

    return result


def _get_identities_by_ids(
    *,
    identity_ids: list[str],
) -> dict[str, dict[str, Any]]:
    identities_by_id: dict[str, dict[str, Any]] = {}

    for identity_id in identity_ids:
        try:
            identities_by_id[identity_id] = get_chat_identity(
                identity_id=identity_id,
                require_active=False,
            )
        except Exception:
            identities_by_id[identity_id] = {
                "id": identity_id,
                "identity_type": None,
                "profile_id": None,
                "commercial_profile_id": None,
                "display_name": "User",
                "avatar_file_id": None,
                "is_active": False,
                "is_available": False,
            }

    return identities_by_id


def _get_files_by_ids(
    *,
    file_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not file_ids:
        return {}

    response = (
        _supabase()
        .table("files")
        .select(FILE_COLUMNS)
        .in_("id", file_ids)
        .eq("status", "ready")
        .execute()
    )

    return {
        file_record["id"]: _serialize_file(file_record)
        for file_record in _response_rows(response)
        if file_record.get("trashed_at") is None
    }


def _get_reactions_by_message_ids(
    *,
    message_ids: list[str],
) -> dict[str, list[dict[str, Any]]]:
    if not message_ids:
        return {}

    response = (
        _supabase()
        .table("chat_message_reactions")
        .select(REACTION_COLUMNS)
        .in_("message_id", message_ids)
        .order("created_at")
        .execute()
    )

    reactions = _response_rows(response)

    enriched_reactions = _enrich_reactions(
        reactions=reactions,
    )

    reactions_by_message_id: dict[str, list[dict[str, Any]]] = {}

    for reaction in enriched_reactions:
        reactions_by_message_id.setdefault(
            reaction["message_id"],
            [],
        ).append(reaction)

    return reactions_by_message_id


def _enrich_reactions(
    *,
    reactions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    identity_ids = list(
        {
            reaction["identity_id"]
            for reaction in reactions
            if reaction.get("identity_id")
        }
    )

    identities_by_id = _get_identities_by_ids(
        identity_ids=identity_ids,
    )

    return [
        {
            **reaction,
            "identity": identities_by_id.get(
                reaction["identity_id"]
            ),
        }
        for reaction in reactions
    ]


def _serialize_file(
    file_record: dict[str, Any],
) -> dict[str, Any]:
    return {
        key: file_record.get(key)
        for key in (
            "id",
            "owner_id",
            "original_name",
            "display_name",
            "extension",
            "mime_type",
            "kind",
            "size_bytes",
            "status",
            "created_at",
            "updated_at",
        )
    }