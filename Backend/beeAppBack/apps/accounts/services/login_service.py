import logging
import re

from beeAppBack.core.supabase_client import (
    get_supabase_publishable_client,
    is_transient_supabase_error,
)

from apps.accounts.exceptions import (
    AccountLoginError,
    AccountLoginUnavailableError,
)


logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    normalized = str(email or "").strip().lower()

    if "@" not in normalized:
        return "<invalid-email>"

    local, domain = normalized.rsplit("@", 1)

    if not local:
        return f"***@{domain}"

    return f"{local[:1]}***@{domain}"


def _sanitize_error_message(error: Exception) -> str:
    message = str(error)

    message = re.sub(
        (
            r"(?i)(authorization|bearer|token|apikey|"
            r"api[_ -]?key|secret)\\s*[:=]\\s*[^,\\s]+"
        ),
        r"\\1=<redacted>",
        message,
    )

    message = re.sub(
        (
            r"eyJ[a-zA-Z0-9_-]{20,}\\."
            r"[a-zA-Z0-9_-]{20,}\\."
            r"[a-zA-Z0-9_-]{20,}"
        ),
        "<redacted-jwt>",
        message,
    )

    return message.replace("\\n", " ").replace("\\r", " ")[:500]


def login_with_email_password(
    *,
    email: str,
    password: str,
) -> dict:
    try:
        supabase = get_supabase_publishable_client()

        response = supabase.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )

        if not response.user or not response.session:
            raise AccountLoginError(
                "Supabase did not return an authenticated session."
            )

        session = response.session
        user = response.user

        if not session.access_token or not session.refresh_token:
            raise AccountLoginError(
                "Supabase did not return valid session tokens."
            )

        return {
            "session": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_at": session.expires_at,
                "expires_in": session.expires_in,
                "token_type": session.token_type,
            },
            "user": {
                "id": str(user.id),
                "email": user.email,
                "phone": user.phone,
            },
        }

    except (
        AccountLoginError,
        AccountLoginUnavailableError,
    ):
        raise

    except Exception as error:
        logger.warning(
            (
                "Supabase email login failed "
                "email=%s error_type=%s error_message=%s"
            ),
            _mask_email(email),
            type(error).__name__,
            _sanitize_error_message(error),
        )

        if is_transient_supabase_error(error):
            raise AccountLoginUnavailableError(
                "Supabase Auth is temporarily unavailable."
            ) from error

        raise AccountLoginError(
            "Email and password authentication failed."
        ) from error
