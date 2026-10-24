from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.commercial.exceptions import (
    CommercialProfileNotFoundError,
)

from .constants import (
    COMMERCIAL_HOUR_COLUMNS,
    COMMERCIAL_MODALITY_COLUMNS,
    COMMERCIAL_PROFILE_COLUMNS,
    PRIVATE_COMMERCIAL_PROFILE_COLUMNS,
)
from .relation_service import attach_profile_relations


def get_commercial_profile(
    *,
    user_id: str,
    profile_id: str,
) -> dict[str, Any]:
    try:
        supabase = get_supabase_admin_client()
        profile_response = (
            supabase.table("commercial_profiles")
            .select(COMMERCIAL_PROFILE_COLUMNS)
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .maybe_single()
            .execute()
        )
        profile = profile_response.data

        if not profile:
            raise CommercialProfileNotFoundError(
                "The requested commercial profile was not found."
            )

        modalities_response = (
            supabase.table("commercial_profile_modalities")
            .select(COMMERCIAL_MODALITY_COLUMNS)
            .eq("commercial_profile_id", str(profile_id))
            .order("created_at")
            .execute()
        )
        hours_response = (
            supabase.table("commercial_profile_hours")
            .select(COMMERCIAL_HOUR_COLUMNS)
            .eq("commercial_profile_id", str(profile_id))
            .order("day_of_week")
            .order("opens_at")
            .execute()
        )

        profile["modalities"] = modalities_response.data or []
        profile["hours"] = hours_response.data or []
        return profile
    except CommercialProfileNotFoundError:
        raise
    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve the commercial profile."
        ) from error


def list_owned_commercial_profiles(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase_admin_client()
            .table("commercial_profiles")
            .select(PRIVATE_COMMERCIAL_PROFILE_COLUMNS)
            .eq("owner_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )
        profiles = response.data or []

        return [
            attach_profile_relations(profile=profile)
            for profile in profiles
        ]
    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve commercial profiles."
        ) from error


def get_owned_commercial_profile(
    *,
    user_id: str,
    profile_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase_admin_client()
            .table("commercial_profiles")
            .select(PRIVATE_COMMERCIAL_PROFILE_COLUMNS)
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .maybe_single()
            .execute()
        )
        profile = response.data

        if not profile:
            raise CommercialProfileNotFoundError(
                "The requested commercial profile was not found."
            )

        return attach_profile_relations(profile=profile)
    except CommercialProfileNotFoundError:
        raise
    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve commercial profile."
        ) from error


def get_owned_commercial_profile_with_access_token(
    *,
    access_token: str,
    profile_id: str,
) -> dict[str, Any]:
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialProfileNotFoundError(
            "A valid access token is required."
        )

    try:
        supabase = get_supabase_user_client(
            access_token=normalized_access_token,
        )
        response = (
            supabase.table("commercial_profiles")
            .select(PRIVATE_COMMERCIAL_PROFILE_COLUMNS)
            .eq("id", str(profile_id))
            .maybe_single()
            .execute()
        )
        profile = response.data

        if not profile:
            raise CommercialProfileNotFoundError(
                "The requested commercial profile was not found."
            )

        return attach_profile_relations(profile=profile)
    except CommercialProfileNotFoundError:
        raise
    except Exception as error:
        raise CommercialProfileNotFoundError(
            "Could not retrieve commercial profile."
        ) from error
