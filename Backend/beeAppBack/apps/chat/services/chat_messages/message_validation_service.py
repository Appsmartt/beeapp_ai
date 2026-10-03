from __future__ import annotations

import math
from typing import Any

from apps.chat.exceptions import ChatMessageSendError
from apps.chat.services.chat_messages.message_clients import (
    _extract_first_row,
    _supabase,
)

FILE_COLUMNS = (
    "id,owner_id,bucket_id,storage_path,original_name,"
    "display_name,extension,mime_type,kind,size_bytes,status,"
    "trashed_at,created_at,updated_at"
)

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
        "location",
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

    if message_type == "location":
        location = metadata.get("location") if isinstance(metadata, dict) else None
        if (
            not isinstance(location, dict)
            or set(location) != {"latitude", "longitude"}
            or any(
                isinstance(location[key], bool)
                or not isinstance(location[key], (int, float))
                or not math.isfinite(location[key])
                for key in ("latitude", "longitude")
            )
            or not -90 <= location["latitude"] <= 90
            or not -180 <= location["longitude"] <= 180
            or attachment_file_id is not None
            or not body
        ):
            raise ChatMessageSendError(
                "Location requires valid coordinates, a label, and no attachment."
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
        allowed_kinds = (
            {"document", "spreadsheet", "presentation"}
            if message_type == "document"
            else {expected_kind}
        )

        if expected_kind and file_record.get("kind") not in allowed_kinds:
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
