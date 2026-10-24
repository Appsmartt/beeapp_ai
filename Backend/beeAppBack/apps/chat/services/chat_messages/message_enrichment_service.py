from __future__ import annotations

from typing import Any

from apps.chat.services.chat_identity_service import (
    CHAT_IDENTITY_COLUMNS,
    _get_commercial_profiles_by_ids,
    _get_profiles_by_ids,
    _serialize_chat_identity,
)
from apps.chat.services.chat_messages.message_clients import (
    _response_rows,
    _supabase,
)
from apps.statuses.services.status_refactor import get_status_story

MESSAGE_COLUMNS = (
    "id,conversation_id,sender_identity_id,sender_user_id,"
    "message_type,body,attachment_file_id,reference_type,"
    "reference_id,metadata,sequence_number,created_at"
)

FILE_COLUMNS = (
    "id,owner_id,bucket_id,storage_path,original_name,"
    "display_name,extension,mime_type,kind,size_bytes,status,"
    "trashed_at,created_at,updated_at"
)

REACTION_COLUMNS = (
    "id,message_id,identity_id,owner_user_id,emoji,created_at"
)

def _enrich_messages(
    *,
    messages: list[dict[str, Any]],
    viewer_user_id: str | None = None,
) -> list[dict[str, Any]]:
    if not messages:
        return []

    reply_ids = list({
        str(message["reference_id"])
        for message in messages
        if message.get("reference_type") == "chat_message"
        and message.get("reference_id")
    })
    replies_by_id: dict[str, dict[str, Any]] = {}

    if reply_ids:
        reply_response = (
            _supabase()
            .table("chat_messages")
            .select(MESSAGE_COLUMNS)
            .in_("id", reply_ids)
            .execute()
        )
        replies_by_id = {
            str(reply["id"]): reply
            for reply in _response_rows(reply_response)
        }

    sender_identity_ids = list(
        {
            str(identity_id)
            for identity_id in (
                [
                    message.get("sender_identity_id")
                    for message in messages
                ]
                + [
                    reply.get("sender_identity_id")
                    for reply in replies_by_id.values()
                ]
            )
            if identity_id
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

        enriched_message = {
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

        enriched_message["reference"] = _enrich_message_reference(
            message=message,
            viewer_user_id=viewer_user_id,
        )

        if message.get("reference_type") == "chat_message":
            original = replies_by_id.get(
                str(message.get("reference_id") or "")
            )
            if (
                original
                and str(original.get("conversation_id"))
                == str(message.get("conversation_id"))
            ):
                original_identity = identities_by_id.get(
                    str(original.get("sender_identity_id") or "")
                )
                enriched_message["reply_to"] = {
                    "id": str(original["id"]),
                    "body": original.get("body"),
                    "message_type": original.get("message_type"),
                    "sender_display_name": (
                        (original_identity or {}).get("display_name")
                        or "Contacto"
                    ),
                }

        result.append(enriched_message)

    return result

def _enrich_message_reference(
    *,
    message: dict[str, Any],
    viewer_user_id: str | None,
) -> dict[str, Any] | None:
    reference_type = str(
        message.get("reference_type") or ""
    ).strip()
    reference_id = message.get("reference_id")

    if not reference_type or not reference_id:
        return None

    if reference_type != "status_story":
        return {
            "type": reference_type,
            "id": str(reference_id),
            "is_available": True,
        }

    unavailable_reference = {
        "type": "status_story",
        "id": str(reference_id),
        "is_available": False,
        "unavailable_reason": "expired_or_unavailable",
    }

    if not viewer_user_id:
        return unavailable_reference

    try:
        story = get_status_story(
            user_id=str(viewer_user_id),
            story_id=str(reference_id),
            include_archived=False,
        )
    except Exception:
        try:
            story = get_status_story(
                user_id=str(viewer_user_id),
                story_id=str(reference_id),
                include_archived=True,
            )
        except Exception:
            return unavailable_reference

    if not story:
        return unavailable_reference

    return {
        "type": "status_story",
        "id": str(reference_id),
        "is_available": True,
        "status": story,
    }

def _get_identities_by_ids(
    *,
    identity_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not identity_ids:
        return {}

    identities: dict[str, dict[str, Any]] = {}
    unique_ids = list(dict.fromkeys(identity_ids))
    for offset in range(0, len(unique_ids), 200):
        response = (
            _supabase()
            .table("chat_identities")
            .select(CHAT_IDENTITY_COLUMNS)
            .in_("id", unique_ids[offset:offset + 200])
            .execute()
        )
        identities.update(
            (row["id"], row)
            for row in _response_rows(response)
        )

    profiles = _get_profiles_by_ids(
        list({
            row["profile_id"]
            for row in identities.values()
            if row.get("profile_id")
        })
    )
    commercial_profiles = _get_commercial_profiles_by_ids(
        list({
            row["commercial_profile_id"]
            for row in identities.values()
            if row.get("commercial_profile_id")
        })
    )

    result: dict[str, dict[str, Any]] = {}
    for identity_id in unique_ids:
        identity = identities.get(identity_id)
        if identity:
            try:
                result[identity_id] = _serialize_chat_identity(
                    identity=identity,
                    profile=profiles.get(identity.get("profile_id")),
                    commercial_profile=commercial_profiles.get(
                        identity.get("commercial_profile_id")
                    ),
                )
                continue
            except Exception:
                pass
        result[identity_id] = {
            "id": identity_id,
            "identity_type": None,
            "profile_id": None,
            "commercial_profile_id": None,
            "display_name": "User",
            "avatar_file_id": None,
            "is_active": False,
            "is_available": False,
        }
    return result

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

    page_size = 500
    reactions: list[dict[str, Any]] = []
    offset = 0
    while True:
        response = (
            _supabase()
            .table("chat_message_reactions")
            .select(REACTION_COLUMNS)
            .in_("message_id", message_ids)
            .order("created_at")
            .order("id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        page = _response_rows(response)
        reactions.extend(page)
        if len(page) < page_size:
            break
        offset += page_size

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
