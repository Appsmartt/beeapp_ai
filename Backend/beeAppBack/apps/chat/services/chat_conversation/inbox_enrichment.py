from __future__ import annotations

from typing import Any

from apps.chat.services.chat_conversation.avatars import (
    _attach_inbox_avatar_urls,
)
from apps.chat.services.chat_conversation.commercial import (
    _attach_commercial_inbox_metadata,
    _load_commercial_inbox_links,
)


def _enrich_inbox_rows(
    *,
    access_token: str,
    conversations: list[dict[str, Any]],
) -> None:
    links = _load_commercial_inbox_links(
        access_token=access_token,
        conversation_ids=list({
            str(conversation["id"])
            for conversation in conversations
        }),
    )
    _attach_commercial_inbox_metadata(
        conversations=conversations,
        commercial_links_by_conversation_id=links,
    )
    _attach_inbox_avatar_urls(conversations=conversations)
