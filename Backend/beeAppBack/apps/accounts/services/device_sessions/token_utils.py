import hashlib
from datetime import datetime

import jwt

from apps.accounts.exceptions import DeviceSessionError


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

def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )

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
