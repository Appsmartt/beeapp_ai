import hashlib
import os
import secrets
from datetime import timedelta
import logging
import httpx
from django.utils import timezone

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.accounts.exceptions import (
    AuthUserLookupError,
    AuthUserPasswordUpdateError,
    DeviceSessionError,
    PasswordResetConfirmationError,
    PasswordResetRequestError,
    PasswordResetTokenError,
    PasswordResetVerificationError,
)
from apps.accounts.services.auth_user_service import (
    get_auth_user_by_phone,
    update_auth_user_password,
)
from apps.accounts.services.device_session_service import (
    revoke_all_user_device_sessions,
)


RESET_TOKEN_DURATION_MINUTES = 10
TWILIO_VERIFY_BASE_URL = "https://verify.twilio.com/v2"
logger = logging.getLogger(__name__)


def hash_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def get_required_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}"
        )

    return value


def get_twilio_credentials() -> tuple[str, str, str]:
    return (
        get_required_env("TWILIO_ACCOUNT_SID"),
        get_required_env("TWILIO_AUTH_TOKEN"),
        get_required_env(
            "TWILIO_PASSWORD_RESET_VERIFY_SERVICE_SID"
        ),
    )


def request_twilio_password_reset_otp(*, phone: str) -> None:
    account_sid, auth_token, service_sid = (
        get_twilio_credentials()
    )

    try:
        response = httpx.post(
            (
                f"{TWILIO_VERIFY_BASE_URL}/Services/"
                f"{service_sid}/Verifications"
            ),
            data={
                "To": phone,
                "Channel": "sms",
            },
            auth=(account_sid, auth_token),
            timeout=10.0,
        )

        response.raise_for_status()

    except httpx.HTTPStatusError as error:
        try:
            payload = error.response.json()
        except ValueError:
            payload = {
                "message": error.response.text,
            }

        logger.warning(
            (
                "Twilio Verify password-reset request failed. "
                "status=%s code=%s message=%s"
            ),
            error.response.status_code,
            payload.get("code"),
            payload.get("message"),
        )

        raise PasswordResetRequestError(
            "Could not request password reset OTP."
        ) from error

    except httpx.HTTPError as error:
        logger.warning(
            "Twilio Verify password-reset network error: %s",
            str(error),
        )

        raise PasswordResetRequestError(
            "Could not request password reset OTP."
        ) from error

    except Exception as error:
        logger.exception(
            "Unexpected password-reset OTP request error."
        )

        raise PasswordResetRequestError(
            "Could not request password reset OTP."
        ) from error
    account_sid, auth_token, service_sid = (
        get_twilio_credentials()
    )

    try:
        response = httpx.post(
            (
                f"{TWILIO_VERIFY_BASE_URL}/Services/"
                f"{service_sid}/Verifications"
            ),
            data={
                "To": phone,
                "Channel": "sms",
            },
            auth=(account_sid, auth_token),
            timeout=10.0,
        )

        response.raise_for_status()

    except Exception as error:
        raise PasswordResetRequestError(
            "Could not request password reset OTP."
        ) from error


def verify_twilio_password_reset_otp(
    *,
    phone: str,
    code: str,
) -> None:
    account_sid, auth_token, service_sid = (
        get_twilio_credentials()
    )

    try:
        response = httpx.post(
            (
                f"{TWILIO_VERIFY_BASE_URL}/Services/"
                f"{service_sid}/VerificationCheck"
            ),
            data={
                "To": phone,
                "Code": code,
            },
            auth=(account_sid, auth_token),
            timeout=10.0,
        )

        response.raise_for_status()

        verification = response.json()

        if (
            verification.get("status") != "approved"
            or verification.get("valid") is not True
        ):
            raise PasswordResetVerificationError(
                "Twilio did not approve password reset OTP."
            )

    except PasswordResetVerificationError:
        raise

    except Exception as error:
        raise PasswordResetVerificationError(
            "Password reset OTP verification failed."
        ) from error


def invalidate_active_reset_tokens(*, user_id: str) -> None:
    try:
        supabase = get_supabase_admin_client()

        (
            supabase.table("password_reset_challenges")
            .update(
                {
                    "invalidated_at": timezone.now().isoformat(),
                }
            )
            .eq("user_id", user_id)
            .is_("consumed_at", "null")
            .is_("invalidated_at", "null")
            .execute()
        )

    except Exception as error:
        raise PasswordResetVerificationError(
            "Could not invalidate previous reset tokens."
        ) from error


def create_password_reset_token(*, user_id: str) -> str:
    try:
        supabase = get_supabase_admin_client()
        now = timezone.now()

        invalidate_active_reset_tokens(user_id=user_id)

        raw_token = secrets.token_urlsafe(48)

        response = (
            supabase.table("password_reset_challenges")
            .insert(
                {
                    "user_id": user_id,
                    "token_hash": hash_token(raw_token),
                    "expires_at": (
                        now
                        + timedelta(
                            minutes=RESET_TOKEN_DURATION_MINUTES
                        )
                    ).isoformat(),
                }
            )
            .execute()
        )

        if not response.data:
            raise PasswordResetVerificationError(
                "Could not create password reset token."
            )

        return raw_token

    except PasswordResetVerificationError:
        raise

    except Exception as error:
        raise PasswordResetVerificationError(
            "Could not create password reset token."
        ) from error


def request_password_reset(*, phone: str) -> None:
    try:
        get_auth_user_by_phone(phone=phone)

    except AuthUserLookupError:
        # The view intentionally returns a neutral success response
        # to prevent account enumeration.
        return

    request_twilio_password_reset_otp(phone=phone)


def verify_password_reset_otp(
    *,
    phone: str,
    code: str,
) -> str:
    try:
        auth_user = get_auth_user_by_phone(phone=phone)

        verify_twilio_password_reset_otp(
            phone=phone,
            code=code,
        )

        return create_password_reset_token(
            user_id=str(auth_user.id),
        )

    except AuthUserLookupError as error:
        raise PasswordResetVerificationError(
            "Password reset verification failed."
        ) from error


def get_active_reset_challenge(*, reset_token: str) -> dict:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("password_reset_challenges")
            .select(
                (
                    "id,user_id,expires_at,"
                    "consumed_at,invalidated_at"
                )
            )
            .eq("token_hash", hash_token(reset_token))
            .is_("consumed_at", "null")
            .is_("invalidated_at", "null")
            .single()
            .execute()
        )

        challenge = response.data

        if not challenge:
            raise PasswordResetTokenError(
                "Password reset token was not found."
            )

        expires_at = challenge["expires_at"].replace(
            "Z",
            "+00:00",
        )

        if timezone.datetime.fromisoformat(
            expires_at
        ) <= timezone.now():
            (
                supabase.table("password_reset_challenges")
                .update(
                    {
                        "invalidated_at": timezone.now().isoformat(),
                    }
                )
                .eq("id", challenge["id"])
                .execute()
            )

            raise PasswordResetTokenError(
                "Password reset token has expired."
            )

        return challenge

    except PasswordResetTokenError:
        raise

    except Exception as error:
        raise PasswordResetTokenError(
            "Could not validate password reset token."
        ) from error


def consume_password_reset_token(*, challenge_id: str) -> None:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("password_reset_challenges")
            .update(
                {
                    "consumed_at": timezone.now().isoformat(),
                }
            )
            .eq("id", challenge_id)
            .is_("consumed_at", "null")
            .is_("invalidated_at", "null")
            .execute()
        )

        if not response.data:
            raise PasswordResetTokenError(
                "Password reset token was already used."
            )

    except PasswordResetTokenError:
        raise

    except Exception as error:
        raise PasswordResetTokenError(
            "Could not consume password reset token."
        ) from error


def confirm_password_reset(
    *,
    reset_token: str,
    new_password: str,
) -> None:
    try:
        challenge = get_active_reset_challenge(
            reset_token=reset_token,
        )

        # Consume first: a token cannot be retried if the password
        # update later fails. The user must request another OTP.
        consume_password_reset_token(
            challenge_id=challenge["id"],
        )

        update_auth_user_password(
            auth_user_id=challenge["user_id"],
            new_password=new_password,
        )

        revoke_all_user_device_sessions(
            user_id=challenge["user_id"],
        )

    except (
        AuthUserPasswordUpdateError,
        DeviceSessionError,
        PasswordResetTokenError,
    ) as error:
        raise PasswordResetConfirmationError(
            "Could not complete password reset."
        ) from error

    except Exception as error:
        raise PasswordResetConfirmationError(
            "Could not complete password reset."
        ) from error