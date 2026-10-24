from __future__ import annotations

import logging
from typing import Any

from apps.chat.services.chat_conversation.clients import (
    _response_rows,
    _user_supabase,
)


logger = logging.getLogger(__name__)


def _attach_commercial_inbox_metadata(
    *,
    conversations: list[dict[str, Any]],
    commercial_links_by_conversation_id: dict[str, dict[str, Any]],
) -> None:
    for conversation in conversations:
        conversation_id = str(conversation.get("id") or "")
        commercial_link = commercial_links_by_conversation_id.get(
            conversation_id
        )
        conversation["is_commercial"] = commercial_link is not None
        conversation["commercial"] = commercial_link

        if not commercial_link:
            continue

        if not conversation.get("other_identity_type"):
            conversation["other_identity_type"] = "commercial_profile"
        if not conversation.get("other_commercial_profile_id"):
            conversation["other_commercial_profile_id"] = (
                commercial_link["commercial_profile_id"]
            )
        if not conversation.get("other_display_name"):
            conversation["other_display_name"] = (
                commercial_link["display_name"]
            )
        if not conversation.get("other_logo_file_id"):
            conversation["other_logo_file_id"] = (
                commercial_link.get("logo_file_id")
            )


def _load_commercial_inbox_links(
    *,
    access_token: str,
    conversation_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not conversation_ids:
        return {}

    try:
        client = _user_supabase(access_token=access_token)
        links_response = (
            client.table("commerce_chat_conversations")
            .select(
                "conversation_id, commercial_profile_id, client_profile_id"
            )
            .in_("conversation_id", conversation_ids)
            .execute()
        )
        links = _response_rows(links_response)
        commercial_profile_ids = list(
            {
                str(link["commercial_profile_id"])
                for link in links
            }
        )
        if not commercial_profile_ids:
            return {}

        profiles_response = (
            client.table("commercial_profiles")
            .select("id, owner_id, display_name, logo_file_id")
            .in_("id", commercial_profile_ids)
            .execute()
        )
        profiles_by_id = {
            str(profile["id"]): profile
            for profile in _response_rows(profiles_response)
        }
        return {
            str(link["conversation_id"]): {
                "commercial_profile_id": str(
                    link["commercial_profile_id"]
                ),
                "client_profile_id": str(link["client_profile_id"]),
                "owner_profile_id": str(
                    profiles_by_id[
                        str(link["commercial_profile_id"])
                    ]["owner_id"]
                ),
                "display_name": profiles_by_id[
                    str(link["commercial_profile_id"])
                ]["display_name"],
                "logo_file_id": profiles_by_id[
                    str(link["commercial_profile_id"])
                ].get("logo_file_id"),
            }
            for link in links
            if str(link["commercial_profile_id"]) in profiles_by_id
        }
    except Exception:
        logger.exception(
            "chat_commercial_inbox_metadata_load_failed",
        )
        return {}
