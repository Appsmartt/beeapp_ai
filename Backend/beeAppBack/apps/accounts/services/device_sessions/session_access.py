from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import DeviceSessionError
from apps.accounts.services.device_sessions.session_revocation import (
    revoke_device_session_by_id,
)
from apps.accounts.services.device_sessions.token_utils import (
    get_supabase_auth_session_id,
    parse_timestamp,
)


def get_active_session_by_token(
    *,
    session_token: str,
) -> dict:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("device_sessions")
            .select(
                "id,user_id,is_active,revoked_at,"
                "expires_at,device_type"
            )
            .eq(
                "session_token_hash",
                hash_token(session_token),
            )
            .single()
            .execute()
        )

        device_session = response.data

        if not device_session:
            raise DeviceSessionError(
                "Session was not found."
            )

        if not device_session["is_active"]:
            raise DeviceSessionError(
                "Session is not active."
            )

        if device_session["revoked_at"]:
            raise DeviceSessionError(
                "Session was revoked."
            )

        expires_at = parse_timestamp(
            device_session["expires_at"]
        )

        if expires_at <= timezone.now():
            revoke_device_session_by_id(
                device_id=device_session["id"],
            )

            raise DeviceSessionError(
                "Session has expired."
            )

        return device_session

    except DeviceSessionError:
        raise

    except Exception as error:
        raise DeviceSessionError(
            "Could not validate session."
        ) from error

def get_user_device_sessions(
    *,
    user_id: str,
) -> list[dict]:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("device_sessions")
            .select(
                "id,device_name,device_type,platform,"
                "browser,last_seen_at,created_at"
            )
            .eq("user_id", user_id)
            .eq("is_active", True)
            .is_("revoked_at", "null")
            .order("last_seen_at", desc=True)
            .execute()
        )

        return response.data or []

    except Exception as error:
        raise DeviceSessionError(
            "Could not retrieve device sessions."
        ) from error

def get_active_mobile_device_session_for_auth_session(
    *,
    user_id: str,
    access_token: str,
) -> dict:
    """
    Validates that a Bearer token belongs to the currently active MOBILE
    device session for that user.
    """
    auth_session_id = get_supabase_auth_session_id(
        access_token=access_token,
    )

    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("device_sessions")
            .select(
                "id,user_id,device_type,is_active,revoked_at,"
                "expires_at,auth_session_id"
            )
            .eq("user_id", user_id)
            .eq("device_type", "MOBILE")
            .eq("auth_session_id", auth_session_id)
            .eq("is_active", True)
            .is_("revoked_at", "null")
            .single()
            .execute()
        )

        device_session = response.data

        if not device_session:
            raise DeviceSessionError(
                "Mobile session is no longer active."
            )

        expires_at = parse_timestamp(
            device_session["expires_at"],
        )

        if expires_at <= timezone.now():
            revoke_device_session_by_id(
                device_id=device_session["id"],
            )

            raise DeviceSessionError(
                "Mobile session has expired."
            )

        return device_session
    except DeviceSessionError:
        raise
    except Exception as error:
        raise DeviceSessionError(
            "Could not validate mobile device session."
        ) from error
