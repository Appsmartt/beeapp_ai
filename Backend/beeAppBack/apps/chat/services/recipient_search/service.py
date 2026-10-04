from __future__ import annotations

import logging
from typing import Any

from apps.chat.exceptions import ChatRecipientNotFoundError
from apps.chat.services.recipient_search.commercial_profiles import (
    search_commercial_profiles,
)
from apps.chat.services.recipient_search.constants import MAX_SEARCH_LIMIT
from apps.chat.services.recipient_search.matching import (
    deduplicate_and_sort_results,
)
from apps.chat.services.recipient_search.private_profiles import (
    search_private_profiles,
)
from apps.chat.services.recipient_search.validation import (
    normalize_phone_digits,
    normalize_query,
    validate_postgrest_search_value,
)

logger = logging.getLogger(__name__)


def search_chat_recipients(
    *,
    user_id: str,
    query: str,
    limit: int = 20,
) -> dict[str, Any]:
    normalized_query = validate_postgrest_search_value(
        normalize_query(query)
    )

    if len(normalized_query) < 2:
        raise ChatRecipientNotFoundError(
            "Search query must contain at least 2 characters."
        )

    normalized_limit = max(
        1,
        min(int(limit), MAX_SEARCH_LIMIT),
    )
    phone_digits = normalize_phone_digits(normalized_query)

    logger.info(
        "chat_recipient_search_started",
        extra={
            "user_id": str(user_id),
            "query": normalized_query,
            "limit": normalized_limit,
            "is_phone_search": phone_digits is not None,
        },
    )

    private_results = search_private_profiles(
        user_id=user_id,
        query=normalized_query,
        phone_digits=phone_digits,
        limit=normalized_limit,
    )

    logger.info(
        "chat_recipient_search_private_complete",
        extra={
            "user_id": str(user_id),
            "query": normalized_query,
            "result_count": len(private_results),
        },
    )

    commercial_results = search_commercial_profiles(
        user_id=user_id,
        query=normalized_query,
        phone_digits=phone_digits,
        limit=normalized_limit,
    )

    logger.info(
        "chat_recipient_search_commercial_complete",
        extra={
            "user_id": str(user_id),
            "query": normalized_query,
            "result_count": len(commercial_results),
        },
    )

    merged_results = deduplicate_and_sort_results(
        results=[
            *private_results,
            *commercial_results,
        ],
    )

    logger.info(
        "chat_recipient_search_complete",
        extra={
            "user_id": str(user_id),
            "query": normalized_query,
            "result_count": len(merged_results),
        },
    )

    return {
        "query": normalized_query,
        "limit": normalized_limit,
        "results": merged_results[:normalized_limit],
    }
