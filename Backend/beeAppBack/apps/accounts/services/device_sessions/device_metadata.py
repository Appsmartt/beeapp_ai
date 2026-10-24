from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.services.device_sessions.token_utils import get_request_ip


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
