import logging
import re
import time

from beeAppBack.core.supabase_client import (
    get_supabase_publishable_client,
    is_transient_supabase_error,
)

from apps.accounts.exceptions import (
    AccountLoginError,
    AccountLoginUnavailableError,
)


logger = logging.getLogger(__name__)

LOGIN_ATTEMPTS = 2
LOGIN_RETRY_DELAY_SECONDS = 0.6


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
            r"api[_ -]?key|secret)\s*[:=]\s*[^,\s]+"
        ),
        r"\1=<redacted>",
        message,
    )

    message = re.sub(
        (
            r"eyJ[a-zA-Z0-9_-]{20,}\."
            r"[a-zA-Z0-9_-]{20,}\."
            r"[a-zA-Z0-9_-]{20,}"
        ),
        "<redacted-jwt>",
        message,
    )

    return message.replace("\n", " ").replace("\r", " ")[:500]


def _build_login_response(response) -> dict:
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


def login_with_email_password(
    *,
    email: str,
    password: str,
) -> dict:
    masked_email = _mask_email(email)
    last_transient_error: Exception | None = None

    for attempt in range(1, LOGIN_ATTEMPTS + 1):
        started_at = time.monotonic()

        try:
            supabase = get_supabase_publishable_client()

            response = supabase.auth.sign_in_with_password(
                {
                    "email": email,
                    "password": password,
                }
            )

            elapsed_seconds = time.monotonic() - started_at

            logger.info(
                (
                    "Supabase email login succeeded "
                    "email=%s attempt=%s elapsed_seconds=%.3f"
                ),
                masked_email,
                attempt,
                elapsed_seconds,
            )

            return _build_login_response(response)

        except AccountLoginError:
            raise

        except Exception as error:
            elapsed_seconds = time.monotonic() - started_at

            logger.warning(
                (
                    "Supabase email login failed "
                    "email=%s attempt=%s/%s "
                    "elapsed_seconds=%.3f error_type=%s "
                    "error_message=%s"
                ),
                masked_email,
                attempt,
                LOGIN_ATTEMPTS,
                elapsed_seconds,
                type(error).__name__,
                _sanitize_error_message(error),
            )

            if not is_transient_supabase_error(error):
                raise AccountLoginError(
                    "Email and password authentication failed."
                ) from error

            last_transient_error = error

            if attempt < LOGIN_ATTEMPTS:
                time.sleep(LOGIN_RETRY_DELAY_SECONDS)
                continue

    raise AccountLoginUnavailableError(
        "Supabase Auth is temporarily unavailable."
    ) from last_transient_error
