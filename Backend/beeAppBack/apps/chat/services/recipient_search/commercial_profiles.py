from __future__ import annotations

import logging
from typing import Any

from apps.chat.exceptions import ChatRecipientNotFoundError
from apps.chat.services.recipient_search.constants import (
    COMMERCIAL_PROFILE_COLUMNS,
)
from apps.chat.services.recipient_search.matching import (
    commercial_match_rank,
    commercial_phone_digits,
    matches_text,
    phone_matches_suffix,
)
from apps.chat.services.recipient_search.repository import (
    get_active_commercial_identities,
    response_rows,
    supabase,
)
from apps.chat.services.recipient_search.validation import (
    build_postgrest_ilike_or_filter,
)

logger = logging.getLogger(__name__)


def search_commercial_profiles(
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
                    .table("commercial_profiles")
                    .select(COMMERCIAL_PROFILE_COLUMNS)
                    .eq("is_public", True)
                    .eq("is_available", True)
                    .eq("is_phone_public", True)
                    .limit(limit)
                    .execute()
                )
            )

            for profile in phone_profiles:
                if phone_matches_suffix(
                    commercial_phone_digits(profile),
                    phone_digits,
                ):
                    profiles_by_id[profile["id"]] = profile
        else:
            commercial_profiles = response_rows(
                (
                    supabase()
                    .table("commercial_profiles")
                    .select(COMMERCIAL_PROFILE_COLUMNS)
                    .eq("is_public", True)
                    .eq("is_available", True)
                    .or_(
                        build_postgrest_ilike_or_filter(
                            columns=(
                                "display_name",
                                "public_email",
                            ),
                            value=query,
                        )
                    )
                    .limit(limit)
                    .execute()
                )
            )

            for profile in commercial_profiles:
                if (
                    profile.get("is_email_public")
                    or matches_text(
                        profile.get("display_name"),
                        query,
                    )
                ):
                    profiles_by_id[profile["id"]] = profile

        if not profiles_by_id:
            return []

        identities_by_commercial_profile_id = (
            get_active_commercial_identities(
                commercial_profile_ids=list(profiles_by_id),
            )
        )
        results: list[dict[str, Any]] = []

        for commercial_profile in profiles_by_id.values():
            identity = identities_by_commercial_profile_id.get(
                commercial_profile["id"]
            )

            if not identity:
                continue

            results.append(
                {
                    "identity_id": identity["id"],
                    "identity_type": "commercial_profile",
                    "profile_id": None,
                    "commercial_profile_id": commercial_profile["id"],
                    "display_name": commercial_profile["display_name"],
                    "avatar_file_id": commercial_profile.get(
                        "logo_file_id"
                    ),
                    "is_available": True,
                    "match_rank": commercial_match_rank(
                        commercial_profile=commercial_profile,
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
            "chat_recipient_search_commercial_failed",
            extra={
                "user_id": str(user_id),
                "query": query,
                "limit": int(limit),
                "is_phone_search": phone_digits is not None,
            },
        )
        raise ChatRecipientNotFoundError(
            f"Could not search commercial chat recipients: {error}"
        ) from error
