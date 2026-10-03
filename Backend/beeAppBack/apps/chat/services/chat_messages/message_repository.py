from __future__ import annotations

from typing import Any

from apps.chat.exceptions import ChatMessageNotFoundError
from apps.chat.services.chat_messages.message_clients import (
    _extract_first_row,
    _response_rows,
    _supabase,
)

MESSAGE_COLUMNS = (
    "id,conversation_id,sender_identity_id,sender_user_id,"
    "message_type,body,attachment_file_id,reference_type,"
    "reference_id,metadata,sequence_number,created_at"
)

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

def _get_active_conversation_participant_owners(
    *,
    conversation_id: str,
) -> list[dict[str, str]]:
    """
    Devuelve identidades activas participantes y sus cuentas propietarias.

    Se usa exclusivamente para versionar los inboxes que cambian después
    de un mensaje confirmado. La fuente de verdad continúa siendo la RPC
    get_chat_inbox y Supabase.
    """
    participants_response = (
        _supabase()
        .table("chat_conversation_participants")
        .select("identity_id")
        .eq("conversation_id", str(conversation_id))
        .is_("left_at", "null")
        .is_("removed_at", "null")
        .execute()
    )

    identity_ids = sorted(
        {
            str(participant["identity_id"])
            for participant in _response_rows(
                participants_response
            )
            if participant.get("identity_id")
        }
    )

    if not identity_ids:
        return []

    identities_response = (
        _supabase()
        .table("chat_identities")
        .select("id,owner_id")
        .in_("id", identity_ids)
        .eq("is_active", True)
        .execute()
    )

    owners_by_identity_id = {
        str(identity["id"]): str(identity["owner_id"])
        for identity in _response_rows(identities_response)
        if identity.get("id") and identity.get("owner_id")
    }

    return [
        {
            "identity_id": identity_id,
            "owner_id": owners_by_identity_id[identity_id],
        }
        for identity_id in identity_ids
        if identity_id in owners_by_identity_id
    ]
