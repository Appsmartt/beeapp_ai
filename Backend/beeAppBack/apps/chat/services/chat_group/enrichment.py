from __future__ import annotations

from typing import Any

from apps.chat.services.chat_identity_service import (
    get_chat_identity,
)
from apps.chat.services.chat_group.clients import (
    _response_rows,
    _supabase,
)
from apps.chat.services.chat_group.constants import (
    CONVERSATION_COLUMNS,
)


def _enrich_group_invites(
    *,
    invites: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not invites:
        return []

    conversation_ids = list(
        {
            invite["conversation_id"]
            for invite in invites
            if invite.get("conversation_id")
        }
    )

    conversations_by_id = _get_group_conversations_by_ids(
        conversation_ids=conversation_ids,
    )

    identity_ids = list(
        {
            identity_id
            for invite in invites
            for identity_id in (
                invite.get("invited_identity_id"),
                invite.get("invited_by_identity_id"),
            )
            if identity_id
        }
    )

    identities_by_id = _get_identities_by_ids(
        identity_ids=identity_ids,
    )

    result: list[dict[str, Any]] = []

    for invite in invites:
        result.append(
            {
                **invite,
                "conversation": conversations_by_id.get(
                    invite["conversation_id"]
                ),
                "invited_identity": identities_by_id.get(
                    invite["invited_identity_id"]
                ),
                "invited_by_identity": identities_by_id.get(
                    invite["invited_by_identity_id"]
                ),
            }
        )

    return result


def _get_group_conversations_by_ids(
    *,
    conversation_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not conversation_ids:
        return {}

    response = (
        _supabase()
        .table("chat_conversations")
        .select(CONVERSATION_COLUMNS)
        .in_("id", conversation_ids)
        .eq("conversation_type", "group")
        .execute()
    )

    return {
        conversation["id"]: conversation
        for conversation in _response_rows(response)
    }


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
                "avatar_url": None,
                "is_active": False,
                "is_available": False,
            }

    return identities_by_id
