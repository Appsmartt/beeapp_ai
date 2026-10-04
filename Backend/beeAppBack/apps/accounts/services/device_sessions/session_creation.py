import secrets
from datetime import timedelta

from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import DeviceSessionError
from apps.accounts.services.device_sessions.token_utils import (
    get_request_session_metadata,
    get_supabase_auth_session_id,
    hash_token,
)


SESSION_DURATION_DAYS = 30


def create_device_session(
    *,
    user_id: str,
    session_token: str,
    device_name: str,
    device_type: str,
) -> dict:
    try:
        supabase = get_supabase_admin_client()
        now = timezone.now()

        response = (
            supabase.table("device_sessions")
            .insert(
                {
                    "user_id": user_id,
                    "device_name": device_name,
                    "device_type": device_type,
                    "session_token_hash": hash_token(
                        session_token
                    ),
                    "is_active": True,
                    "last_seen_at": now.isoformat(),
                    "expires_at": (
                        now + timedelta(
                            days=SESSION_DURATION_DAYS
                        )
                    ).isoformat(),
                }
            )
            .execute()
        )

        if not response.data:
            raise DeviceSessionError(
                "Device session was not created."
            )

        return response.data[0]

    except DeviceSessionError:
        raise

    except Exception as error:
        raise DeviceSessionError(
            "Could not create device session."
        ) from error

def create_web_device_session(
    *,
    user_id: str,
    session_token: str,
) -> dict:
    try:
        supabase = get_supabase_admin_client()
        now = timezone.now()
        token_hash = hash_token(session_token)

        response = supabase.rpc(
            "replace_web_device_session",
            {
                "p_user_id": user_id,
                "p_session_token_hash": token_hash,
                "p_device_name": "BeeApp Web",
                "p_platform": None,
                "p_browser": None,
                "p_ip_address": None,
                "p_user_agent": None,
                "p_expires_at": (
                    now + timedelta(
                        days=SESSION_DURATION_DAYS
                    )
                ).isoformat(),
            },
        ).execute()

        response_data = getattr(response, "data", None)

        if isinstance(response_data, list):
            device_session = (
                response_data[0]
                if response_data
                else None
            )
        elif isinstance(response_data, dict):
            device_session = response_data
        else:
            device_session = None

        if not device_session:
            raise DeviceSessionError(
                "Web device session was not created."
            )

        return device_session
    except DeviceSessionError:
        raise
    except Exception as error:
        raise DeviceSessionError(
            "Could not create web device session."
        ) from error

def create_mobile_device_session(
    *,
    user_id: str,
    session_token: str,
) -> dict:
    return create_device_session(
        user_id=user_id,
        session_token=session_token,
        device_name="BeeApp Mobile",
        device_type="MOBILE",
    )

def create_or_replace_mobile_device_session(
    *,
    user_id: str,
    access_token: str,
    request,
) -> dict:
    """
    Replaces the user's active MOBILE session atomically through PostgreSQL.

    Supabase Auth validates the access token before this helper is called.
    The decoded session_id is only used to link the already-authenticated
    Supabase session with the BeeApp device-session audit record.
    """
    auth_session_id = get_supabase_auth_session_id(
        access_token=access_token,
    )
    metadata = get_request_session_metadata(request)

    try:
        supabase = get_supabase_admin_client()
        now = timezone.now()

        response = supabase.rpc(
            "replace_mobile_device_session_with_revocation",
            {
                "p_user_id": user_id,
                "p_auth_session_id": auth_session_id,
                "p_session_token_hash": hash_token(
                    secrets.token_urlsafe(48)
                ),
                "p_device_name": "BeeApp Mobile",
                "p_platform": metadata["platform"],
                "p_browser": metadata["browser"],
                "p_ip_address": metadata["ip_address"],
                "p_user_agent": metadata["user_agent"],
                "p_expires_at": (
                    now + timedelta(
                        days=SESSION_DURATION_DAYS
                    )
                ).isoformat(),
            },
        ).execute()

        response_data = getattr(response, "data", None)

        if isinstance(response_data, list):
            device_session = (
                response_data[0]
                if response_data
                else None
            )
        elif isinstance(response_data, dict):
            device_session = response_data
        else:
            device_session = None

        if not device_session:
            raise DeviceSessionError(
                "Mobile device session was not created."
            )

        revoked_push_tokens = [
            str(token).strip()
            for token in (
                device_session.get("revoked_push_tokens")
                or []
            )
            if str(token).strip()
        ]

        device_session["revoked_push_tokens"] = (
            list(dict.fromkeys(revoked_push_tokens))
        )

        revoked_device_session_ids = [
            str(device_id).strip()
            for device_id in (
                device_session.get(
                    "revoked_device_session_ids"
                )
                or []
            )
            if str(device_id).strip()
        ]

        device_session["revoked_device_session_ids"] = (
            list(dict.fromkeys(revoked_device_session_ids))
        )

        return device_session
    except DeviceSessionError:
        raise
    except Exception as error:
        raise DeviceSessionError(
            "Could not create the mobile device session."
        ) from error
