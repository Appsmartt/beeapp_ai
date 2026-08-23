from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.chat.exceptions import (
    ChatAttachmentError,
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatMessageNotFoundError,
    ChatMessageSendError,
)
from apps.chat.services.chat_conversation_service import (
    _require_identity_active_participant,
)
from apps.chat.services.chat_identity_service import (
    get_owned_chat_identity,
)
from apps.chat.services.chat_message_service import (
    send_chat_message,
)
from apps.storage.exceptions import (
    StorageQuotaExceededError,
    StorageUploadError,
)
from apps.storage.services.storage_file_service import (
    create_file_access_url,
    prepare_and_upload_file,
)


CHAT_ATTACHMENT_MESSAGE_TYPES = {
    "image",
    "video",
    "audio",
    "document",
}


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


def upload_chat_attachment_and_send_message(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    sender_identity_id: str,
    message_type: str,
    uploaded_file,
    body: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        if message_type not in CHAT_ATTACHMENT_MESSAGE_TYPES:
            raise ChatAttachmentError(
                "Unsupported chat attachment message type."
            )

        get_owned_chat_identity(
            user_id=user_id,
            identity_id=sender_identity_id,
        )

        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=sender_identity_id,
        )

        file_record = prepare_and_upload_file(
            user_id=str(user_id),
            uploaded_file=uploaded_file,
            folder_id=None,
        )

        _validate_file_for_chat_message(
            file_record=file_record,
            user_id=user_id,
            message_type=message_type,
        )

        message = send_chat_message(
            user_id=user_id,
            access_token=access_token,
            conversation_id=conversation_id,
            sender_identity_id=sender_identity_id,
            message_type=message_type,
            body=body,
            attachment_file_id=str(file_record["id"]),
            reference_type=None,
            reference_id=None,
            metadata=metadata or {},
        )

        return {
            "message": message,
            "file": _serialize_file(file_record),
        }

    except (
        ChatAttachmentError,
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageSendError,
        StorageQuotaExceededError,
        StorageUploadError,
    ):
        raise

    except Exception as error:
        raise ChatAttachmentError(
            f"Could not upload chat attachment: {error}"
        ) from error


def create_chat_attachment_access_url(
    *,
    user_id: str,
    access_token: str,
    message_id: str,
    identity_id: str,
    download: bool = False,
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

        if not message.get("attachment_file_id"):
            raise ChatAttachmentError(
                "This message does not have an attachment."
            )

        access_file = _get_chat_attachment_access(
            access_token=access_token,
            message_id=message_id,
            identity_id=identity_id,
        )

        if not access_file:
            raise ChatAttachmentError(
                "Attachment is unavailable."
            )

        access = create_file_access_url(
            user_id=str(user_id),
            file_id=access_file["file_id"],
            download=download,
        )

        return {
            "message_id": str(message_id),
            "attachment": access["file"],
            "url": access["url"],
            "expires_in_seconds": access[
                "expires_in_seconds"
            ],
            "download": access["download"],
        }

    except (
        ChatAttachmentError,
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageNotFoundError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "CHAT_ATTACHMENT_FILE_NOT_FOUND" in message:
            raise ChatAttachmentError(
                "Attachment file was not found."
            ) from error

        if "CHAT_ATTACHMENT_FILE_NOT_READY" in message:
            raise ChatAttachmentError(
                "Attachment file is not ready."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatAttachmentError(
            f"Could not create attachment access URL: {message}"
        ) from error


def get_chat_attachment_metadata(
    *,
    user_id: str,
    access_token: str,
    message_id: str,
    identity_id: str,
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

        if not message.get("attachment_file_id"):
            raise ChatAttachmentError(
                "This message does not have an attachment."
            )

        access_file = _get_chat_attachment_access(
            access_token=access_token,
            message_id=message_id,
            identity_id=identity_id,
        )

        if not access_file:
            raise ChatAttachmentError(
                "Attachment is unavailable."
            )

        return {
            "message_id": str(message_id),
            "attachment": {
                "file_id": access_file["file_id"],
                "original_name": access_file["original_name"],
                "display_name": access_file["display_name"],
                "mime_type": access_file["mime_type"],
                "kind": access_file["kind"],
                "size_bytes": access_file["size_bytes"],
            },
        }

    except (
        ChatAttachmentError,
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatMessageNotFoundError,
    ):
        raise

    except Exception as error:
        raise ChatAttachmentError(
            "Could not retrieve attachment metadata."
        ) from error


def _get_message_row(
    *,
    message_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("chat_messages")
        .select(
            "id,conversation_id,sender_identity_id,"
            "sender_user_id,message_type,attachment_file_id,"
            "sequence_number,created_at"
        )
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


def _get_chat_attachment_access(
    *,
    access_token: str,
    message_id: str,
    identity_id: str,
) -> dict[str, Any] | None:
    response = (
        _user_supabase(
            access_token=access_token,
        )
        .rpc(
            "get_chat_attachment_access",
            {
                "p_message_id": str(message_id),
                "p_identity_id": str(identity_id),
            },
        )
        .execute()
    )

    return _extract_first_row(response)


def _validate_file_for_chat_message(
    *,
    file_record: dict[str, Any],
    user_id: str,
    message_type: str,
) -> None:
    if str(file_record.get("owner_id")) != str(user_id):
        raise ChatAttachmentError(
            "Attachment must belong to the sender."
        )

    if file_record.get("status") != "ready":
        raise ChatAttachmentError(
            "Attachment file is not ready."
        )

    if file_record.get("trashed_at") is not None:
        raise ChatAttachmentError(
            "Attachment file is in trash."
        )

    expected_kind_by_message_type = {
        "image": "image",
        "video": "video",
        "audio": "audio",
        "document": "document",
    }

    expected_kind = expected_kind_by_message_type[message_type]

    if file_record.get("kind") != expected_kind:
        raise ChatAttachmentError(
            "Uploaded file type does not match message type."
        )


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