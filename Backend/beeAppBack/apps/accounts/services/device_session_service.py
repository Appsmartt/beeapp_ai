import hashlib
from datetime import datetime, timedelta

from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

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

    return "BeeApp Web"


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def create_web_device_session(
    *,
    user_id: str,
    session_token: str,
) -> dict:
    try:
        supabase = get_supabase_admin_client()
        now = timezone.now()

        response = (
            supabase.table("device_sessions")
            .insert(
                {
                    "user_id": user_id,
                    "device_name": "BeeApp Web",
                    "device_type": "WEB",
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
                "expires_at"
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
                "Web session was not found."
            )

        if not device_session["is_active"]:
            raise DeviceSessionError(
                "Web session is not active."
            )

        if device_session["revoked_at"]:
            raise DeviceSessionError(
                "Web session was revoked."
            )

        expires_at = parse_timestamp(
            device_session["expires_at"]
        )

        if expires_at <= timezone.now():
            revoke_device_session_by_id(
                device_id=device_session["id"],
            )

            raise DeviceSessionError(
                "Web session has expired."
            )

        return device_session

    except DeviceSessionError:
        raise

    except Exception as error:
        raise DeviceSessionError(
            "Could not validate web session."
        ) from error


def update_web_device_metadata(
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

        (
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

        (
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