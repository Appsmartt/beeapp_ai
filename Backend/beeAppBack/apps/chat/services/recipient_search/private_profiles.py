from __future__ import annotations

import logging
from typing import Any

from apps.chat.exceptions import ChatRecipientNotFoundError
from apps.chat.services.recipient_search.constants import (
    PRIVATE_PROFILE_COLUMNS,
)
from apps.chat.services.recipient_search.matching import (
    phone_matches_suffix,
    private_display_name,
    private_match_rank,
)
from apps.chat.services.recipient_search.repository import (
    get_active_profile_identities,
    response_rows,
    supabase,
)
from apps.chat.services.recipient_search.validation import (
    build_postgrest_ilike_or_filter,
)

logger = logging.getLogger(__name__)


def search_private_profiles(
    *,
    user_id: str,
    query: str,
    phone_digits: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    try:
        profiles_by_id: dict[str, dict[str, Any]] = {}

        if phone_digits:
            phone_profiles = response_rows(
                (
                    supabase()
                    .table("profile")
                    .select(PRIVATE_PROFILE_COLUMNS)
                    .eq("is_public", True)
                    .neq("id", str(user_id))
                    .limit(limit)
                    .execute()
                )
            )

            for profile in phone_profiles:
                if phone_matches_suffix(
                    profile.get("normalized_phone"),
                    phone_digits,
                ):
                    profiles_by_id[profile["id"]] = profile
        else:
            name_profiles = response_rows(
                (
                    supabase()
                    .table("profile")
                    .select(PRIVATE_PROFILE_COLUMNS)
                    .eq("is_public", True)
                    .neq("id", str(user_id))
                    .or_(
                        build_postgrest_ilike_or_filter(
                            columns=(
                                "first_name",
                                "last_name",
                                "email",
                            ),
                            value=query,
                        )
                    )
                    .limit(limit)
                    .execute()
                )
            )

            for profile in name_profiles:
                profiles_by_id[profile["id"]] = profile

        if not profiles_by_id:
            return []

        identities_by_profile_id = get_active_profile_identities(
            profile_ids=list(profiles_by_id),
        )
        results: list[dict[str, Any]] = []

        for profile in profiles_by_id.values():
            identity = identities_by_profile_id.get(profile["id"])

            if not identity:
                continue

            results.append(
                {
                    "identity_id": identity["id"],
                    "identity_type": "profile",
                    "profile_id": profile["id"],
                    "commercial_profile_id": None,
                    "display_name": private_display_name(profile),
                    "avatar_file_id": None,
                    "is_available": True,
                    "match_rank": private_match_rank(
                        profile=profile,
                        query=query,
                        phone_digits=phone_digits,
                    ),
                }
            )

        return results

    except ChatRecipientNotFoundError:
        raise
    except Exception as error:
        logger.exception(
            "chat_recipient_search_private_failed",
            extra={
                "user_id": str(user_id),
                "query": query,
                "limit": int(limit),
                "is_phone_search": phone_digits is not None,
            },
        )
        raise ChatRecipientNotFoundError(
            f"Could not search private chat recipients: {error}"
        ) from error
