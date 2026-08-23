from __future__ import annotations

import re
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.chat.exceptions import (
    ChatRecipientNotFoundError,
)


PRIVATE_PROFILE_COLUMNS = (
    "id,first_name,last_name,email,normalized_phone,is_public"
)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,display_name,phone_dial_code,phone_number,"
    "public_email,logo_file_id,is_public,is_available,"
    "is_phone_public,is_email_public"
)

CHAT_IDENTITY_COLUMNS = (
    "id,owner_id,identity_type,profile_id,"
    "commercial_profile_id,is_active"
)

MAX_SEARCH_LIMIT = 25


def _supabase():
    return get_supabase_admin_client()


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def search_chat_recipients(
    *,
    user_id: str,
    query: str,
    limit: int = 20,
) -> dict[str, Any]:
    normalized_query = _normalize_query(query)

    if len(normalized_query) < 3:
        raise ChatRecipientNotFoundError(
            "Search query must contain at least 3 characters."
        )

    normalized_limit = max(
        1,
        min(int(limit), MAX_SEARCH_LIMIT),
    )

    normalized_phone = _normalize_phone_query(
        normalized_query,
    )

    private_results = _search_private_profiles(
        user_id=user_id,
        query=normalized_query,
        normalized_phone=normalized_phone,
        limit=normalized_limit,
    )

    commercial_results = _search_commercial_profiles(
        user_id=user_id,
        query=normalized_query,
        normalized_phone=normalized_phone,
        limit=normalized_limit,
    )

    merged_results = _deduplicate_and_sort_results(
        results=[
            *private_results,
            *commercial_results,
        ],
    )

    return {
        "query": normalized_query,
        "limit": normalized_limit,
        "results": merged_results[:normalized_limit],
    }


def _search_private_profiles(
    *,
    user_id: str,
    query: str,
    normalized_phone: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    try:
        profile_query = (
            _supabase()
            .table("profile")
            .select(PRIVATE_PROFILE_COLUMNS)
            .eq("is_public", True)
            .neq("id", str(user_id))
            .limit(limit)
        )

        if "@" in query:
            profile_query = profile_query.ilike(
                "email",
                query,
            )
        elif normalized_phone:
            profile_query = profile_query.eq(
                "normalized_phone",
                normalized_phone,
            )
        else:
            return []

        profiles = _response_rows(profile_query.execute())

        if not profiles:
            return []

        profile_ids = [
            profile["id"]
            for profile in profiles
            if profile.get("id")
        ]

        identities_by_profile_id = _get_active_profile_identities(
            profile_ids=profile_ids,
        )

        results: list[dict[str, Any]] = []

        for profile in profiles:
            identity = identities_by_profile_id.get(profile["id"])

            if not identity:
                continue

            display_name = _private_display_name(profile)

            results.append(
                {
                    "identity_id": identity["id"],
                    "identity_type": "profile",
                    "profile_id": profile["id"],
                    "commercial_profile_id": None,
                    "display_name": display_name,
                    "avatar_file_id": None,
                    "is_available": True,
                    "match_rank": _private_match_rank(
                        profile=profile,
                        query=query,
                        normalized_phone=normalized_phone,
                    ),
                }
            )

        return results

    except ChatRecipientNotFoundError:
        raise

    except Exception as error:
        raise ChatRecipientNotFoundError(
            f"Could not search private chat recipients: {error}"
        ) from error


def _search_commercial_profiles(
    *,
    user_id: str,
    query: str,
    normalized_phone: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    try:
        base_query = (
            _supabase()
            .table("commercial_profiles")
            .select(COMMERCIAL_PROFILE_COLUMNS)
            .eq("is_public", True)
            .eq("is_available", True)
            .neq("owner_id", str(user_id))
            .limit(limit)
        )

        commercial_profiles = _response_rows(
            base_query.ilike(
                "display_name",
                f"%{query}%",
            ).execute()
        )

        if "@" in query:
            email_profiles = _response_rows(
                (
                    _supabase()
                    .table("commercial_profiles")
                    .select(COMMERCIAL_PROFILE_COLUMNS)
                    .eq("is_public", True)
                    .eq("is_available", True)
                    .eq("is_email_public", True)
                    .eq("public_email", query)
                    .neq("owner_id", str(user_id))
                    .limit(limit)
                    .execute()
                )
            )
            commercial_profiles.extend(email_profiles)

        if normalized_phone:
            phone_profiles = _response_rows(
                (
                    _supabase()
                    .table("commercial_profiles")
                    .select(COMMERCIAL_PROFILE_COLUMNS)
                    .eq("is_public", True)
                    .eq("is_available", True)
                    .eq("is_phone_public", True)
                    .neq("owner_id", str(user_id))
                    .limit(limit)
                    .execute()
                )
            )

            commercial_profiles.extend(
                profile
                for profile in phone_profiles
                if _commercial_normalized_phone(profile)
                == normalized_phone
            )

        commercial_profiles_by_id = {
            profile["id"]: profile
            for profile in commercial_profiles
            if profile.get("id")
        }

        if not commercial_profiles_by_id:
            return []

        identities_by_commercial_profile_id = (
            _get_active_commercial_identities(
                commercial_profile_ids=list(
                    commercial_profiles_by_id
                ),
            )
        )

        results: list[dict[str, Any]] = []

        for commercial_profile in (
            commercial_profiles_by_id.values()
        ):
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
                    "commercial_profile_id": commercial_profile[
                        "id"
                    ],
                    "display_name": commercial_profile[
                        "display_name"
                    ],
                    "avatar_file_id": commercial_profile.get(
                        "logo_file_id"
                    ),
                    "is_available": True,
                    "match_rank": _commercial_match_rank(
                        commercial_profile=commercial_profile,
                        query=query,
                        normalized_phone=normalized_phone,
                    ),
                }
            )

        return results

    except ChatRecipientNotFoundError:
        raise

    except Exception as error:
        raise ChatRecipientNotFoundError(
            "Could not search commercial chat recipients."
        ) from error


def _get_active_profile_identities(
    *,
    profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not profile_ids:
        return {}

    response = (
        _supabase()
        .table("chat_identities")
        .select(CHAT_IDENTITY_COLUMNS)
        .in_("profile_id", profile_ids)
        .eq("identity_type", "profile")
        .eq("is_active", True)
        .execute()
    )

    return {
        identity["profile_id"]: identity
        for identity in _response_rows(response)
        if identity.get("profile_id")
    }


def _get_active_commercial_identities(
    *,
    commercial_profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not commercial_profile_ids:
        return {}

    response = (
        _supabase()
        .table("chat_identities")
        .select(CHAT_IDENTITY_COLUMNS)
        .in_(
            "commercial_profile_id",
            commercial_profile_ids,
        )
        .eq("identity_type", "commercial_profile")
        .eq("is_active", True)
        .execute()
    )

    return {
        identity["commercial_profile_id"]: identity
        for identity in _response_rows(response)
        if identity.get("commercial_profile_id")
    }


def _normalize_query(value: str) -> str:
    return str(value or "").strip().lower()


def _normalize_phone_query(
    value: str,
) -> str | None:
    normalized = re.sub(r"[^0-9+]", "", value)

    if not normalized:
        return None

    if normalized.count("+") > 1:
        return None

    if "+" in normalized and not normalized.startswith("+"):
        return None

    digits_only = normalized.lstrip("+")

    if len(digits_only) < 7:
        return None

    return f"+{digits_only}"


def _commercial_normalized_phone(
    commercial_profile: dict[str, Any],
) -> str | None:
    dial_code = str(
        commercial_profile.get("phone_dial_code") or ""
    )
    phone_number = str(
        commercial_profile.get("phone_number") or ""
    )

    return _normalize_phone_query(
        f"{dial_code}{phone_number}",
    )


def _private_display_name(
    profile: dict[str, Any],
) -> str:
    first_name = str(profile.get("first_name") or "").strip()
    last_name = str(profile.get("last_name") or "").strip()

    return " ".join(
        value
        for value in (
            first_name,
            last_name,
        )
        if value
    ) or "Usuario"


def _private_match_rank(
    *,
    profile: dict[str, Any],
    query: str,
    normalized_phone: str | None,
) -> int:
    if str(profile.get("email") or "").lower() == query:
        return 0

    if (
        normalized_phone
        and profile.get("normalized_phone") == normalized_phone
    ):
        return 1

    return 9


def _commercial_match_rank(
    *,
    commercial_profile: dict[str, Any],
    query: str,
    normalized_phone: str | None,
) -> int:
    if (
        commercial_profile.get("is_email_public")
        and str(
            commercial_profile.get("public_email") or ""
        ).lower()
        == query
    ):
        return 2

    if (
        commercial_profile.get("is_phone_public")
        and normalized_phone
        and _commercial_normalized_phone(commercial_profile)
        == normalized_phone
    ):
        return 3

    if (
        str(
            commercial_profile.get("display_name") or ""
        ).lower()
        == query
    ):
        return 4

    return 8


def _deduplicate_and_sort_results(
    *,
    results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    results_by_identity_id: dict[str, dict[str, Any]] = {}

    for result in results:
        identity_id = result["identity_id"]
        existing_result = results_by_identity_id.get(identity_id)

        if (
            existing_result is None
            or result["match_rank"]
            < existing_result["match_rank"]
        ):
            results_by_identity_id[identity_id] = result

    sorted_results = sorted(
        results_by_identity_id.values(),
        key=lambda result: (
            result["match_rank"],
            result["display_name"].casefold(),
            result["identity_id"],
        ),
    )

    return [
        {
            key: value
            for key, value in result.items()
            if key != "match_rank"
        }
        for result in sorted_results
    ]