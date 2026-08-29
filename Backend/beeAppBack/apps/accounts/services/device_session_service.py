import hashlib
import secrets
from datetime import datetime, timedelta

import jwt
from django.utils import timezone

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.accounts.exceptions import DeviceSessionError


SESSION_DURATION_DAYS = 30


def hash_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def get_request_ip(request) -> str | None:
    forwarded_for = request.headers.get(
        "X-Forwarded-For",
        "",
    )

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")


def get_browser_name(user_agent: str) -> str | None:
    if "Edg/" in user_agent:
        return "Microsoft Edge"

    if "Firefox/" in user_agent:
        return "Firefox"

    if "Chrome/" in user_agent and "Chromium" not in user_agent:
        return "Google Chrome"

    if "Safari/" in user_agent and "Chrome/" not in user_agent:
        return "Safari"

    return None


def get_platform_name(user_agent: str) -> str | None:
    if "Android" in user_agent:
        return "Android"

    if "iPhone" in user_agent or "iPad" in user_agent:
        return "iOS"

    if "Windows" in user_agent:
        return "Windows"

    if "Mac OS X" in user_agent:
        return "macOS"

    if "Linux" in user_agent:
        return "Linux"

    return None


def get_device_name(user_agent: str) -> str:
    browser = get_browser_name(user_agent)
    platform = get_platform_name(user_agent)

    if browser and platform:
        return f"{browser} en {platform}"

    if platform == "Android":
        return "BeeApp Mobile Android"

    if platform == "iOS":
        return "BeeApp Mobile iPhone"

    return "BeeApp Web"


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


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


def update_device_metadata(
    *,
    device_id: str,
    request,
) -> None:
    try:
        user_agent = request.headers.get(
            "User-Agent",
            "",
        )

        supabase = get_supabase_admin_client()

        response = (
            supabase.table("device_sessions")
            .update(
                {
                    "device_name": get_device_name(user_agent),
                    "platform": get_platform_name(user_agent),
                    "browser": get_browser_name(user_agent),
                    "ip_address": get_request_ip(request),
                    "user_agent": user_agent,
                    "last_seen_at": timezone.now().isoformat(),
                }
            )
            .eq("id", device_id)
            .execute()
        )

    except Exception:
        return


def update_web_device_metadata(
    *,
    device_id: str,
    request,
) -> None:
    update_device_metadata(
        device_id=device_id,
        request=request,
    )


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


def revoke_device_session_by_id(
    *,
    device_id: str,
    user_id: str | None = None,
) -> None:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("device_sessions")
            .update(
                {
                    "is_active": False,
                    "revoked_at": timezone.now().isoformat(),
                }
            )
            .eq("id", device_id)
        )

        if user_id:
            query = query.eq("user_id", user_id)

        query.execute()

    except Exception as error:
        raise DeviceSessionError(
            "Could not revoke device session."
        ) from error


def revoke_all_user_device_sessions(
    *,
    user_id: str,
) -> None:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("device_sessions")
            .update(
                {
                    "is_active": False,
                    "revoked_at": timezone.now().isoformat(),
                }
            )
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )

    except Exception as error:
        raise DeviceSessionError(
            "Could not revoke device sessions."
        ) from error

# ============================================================
# Mobile session control: one active MOBILE session per user.
# ============================================================

def get_supabase_auth_session_id(
    *,
    access_token: str,
) -> str:
    """
    Reads the Supabase `session_id` claim from an access token that has
    already been validated through Supabase Auth by the caller.

    Signature verification is intentionally disabled here because this
    function does not authenticate the token; it only reads a claim after
    get_authenticated_user(access_token=...) has validated it remotely.
    """
    try:
        payload = jwt.decode(
            access_token,
            options={
                "verify_signature": False,
                "verify_exp": False,
                "verify_aud": False,
            },
        )

        session_id = str(
            payload.get("session_id")
            or payload.get("sid")
            or ""
        ).strip()

        if not session_id:
            raise DeviceSessionError(
                "Supabase access token did not include a session ID."
            )

        return session_id
    except DeviceSessionError:
        raise
    except Exception as error:
        raise DeviceSessionError(
            "Could not read Supabase session ID."
        ) from error


def get_request_session_metadata(
    request,
) -> dict[str, str | None]:
    """
    Extracts optional device metadata from a Django request without trusting
    forwarded headers unless they are explicitly populated by the deployment.
    """
    meta = getattr(request, "META", {}) or {}
    headers = getattr(request, "headers", {}) or {}

    forwarded_for = str(
        meta.get("HTTP_X_FORWARDED_FOR") or ""
    ).strip()

    ip_address = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else str(meta.get("REMOTE_ADDR") or "").strip()
    )

    user_agent = str(
        headers.get("User-Agent")
        or meta.get("HTTP_USER_AGENT")
        or ""
    ).strip()

    platform = str(
        headers.get("X-Platform")
        or headers.get("X-Device-Platform")
        or ""
    ).strip()

    browser = str(
        headers.get("X-Browser")
        or ""
    ).strip()

    return {
        "platform": platform or None,
        "browser": browser or None,
        "ip_address": ip_address or None,
        "user_agent": user_agent or None,
    }


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
