import secrets
from datetime import timedelta

from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import DeviceSessionError
from apps.accounts.services.device_sessions.session_access import (
    get_active_session_by_token,
)
from apps.accounts.services.device_sessions.token_utils import hash_token


SESSION_DURATION_DAYS = 30


def refresh_mobile_device_session(
    *,
    session_token: str,
) -> dict:
    """
    Valida una sesión móvil activa, rota su token y extiende su
    vencimiento por otros 30 días desde el momento de la renovación.
    """
    try:
        device_session = get_active_session_by_token(
            session_token=session_token,
        )

        if device_session["device_type"] != "MOBILE":
            raise DeviceSessionError(
                "Only mobile sessions can be refreshed here."
            )

        old_session_token_hash = hash_token(session_token)

        new_session_token = secrets.token_urlsafe(48)
        new_expires_at = (
            timezone.now()
            + timedelta(days=SESSION_DURATION_DAYS)
        )

        supabase = get_supabase_admin_client()

        response = (
            supabase.table("device_sessions")
            .update(
                {
                    "session_token_hash": hash_token(
                        new_session_token
                    ),
                    "expires_at": new_expires_at.isoformat(),
                    "last_seen_at": timezone.now().isoformat(),
                }
            )
            .eq("id", device_session["id"])
            .eq("session_token_hash", old_session_token_hash)
            .eq("is_active", True)
            .is_("revoked_at", "null")
            .execute()
        )

        if not getattr(response, "data", None):
            raise DeviceSessionError(
                "Session was already refreshed or is no longer active."
            )

        return {
            "token": new_session_token,
            "expires_at": new_expires_at.isoformat(),
        }

    except DeviceSessionError:
        raise

    except Exception as error:
        raise DeviceSessionError(
            "Could not refresh mobile session."
        ) from error
