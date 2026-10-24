import secrets
from datetime import datetime, timedelta

from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import QrLoginError
from apps.accounts.services.device_sessions import (
    create_web_device_session,
    hash_token,
)
from apps.integrations.services.credential_crypto_service import (
    decrypt_integration_secret,
    encrypt_integration_secret,
)


QR_LOGIN_DURATION_SECONDS = 120
QR_LOGIN_BROWSER_NONCE_MAX_LENGTH = 256


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def validate_browser_nonce(*, browser_nonce: str) -> str:
    normalized_nonce = str(browser_nonce or "").strip()

    if not normalized_nonce:
        raise QrLoginError("browser_nonce is required.")

    if len(normalized_nonce) > QR_LOGIN_BROWSER_NONCE_MAX_LENGTH:
        raise QrLoginError("browser_nonce is invalid.")

    return normalized_nonce


def create_qr_login_challenge(*, browser_nonce: str) -> dict:
    try:
        normalized_nonce = validate_browser_nonce(
            browser_nonce=browser_nonce,
        )
        challenge_token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(
            seconds=QR_LOGIN_DURATION_SECONDS
        )

        supabase = get_supabase_admin_client()

        response = (
            supabase.table("qr_login_challenges")
            .insert(
                {
                    "challenge_token_hash": hash_token(
                        challenge_token
                    ),
                    "browser_nonce_hash": hash_token(
                        normalized_nonce
                    ),
                    "status": "PENDING",
                    "expires_at": expires_at.isoformat(),
                }
            )
            .execute()
        )

        if not response.data:
            raise QrLoginError(
                "QR login challenge was not created."
            )

        return {
            "challenge_token": challenge_token,
            "expires_at": expires_at.isoformat(),
        }

    except QrLoginError:
        raise

    except Exception as error:
        raise QrLoginError(
            "Could not create QR login challenge."
        ) from error


def get_qr_login_challenge(
    *,
    challenge_token: str,
) -> dict:
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("qr_login_challenges")
            .select(
                "id,status,expires_at,device_session_id,"
                "browser_nonce_hash,consumed_at,"
                "web_session_token_ciphertext"
            )
            .eq(
                "challenge_token_hash",
                hash_token(challenge_token),
            )
            .single()
            .execute()
        )

        challenge = response.data

        if not challenge:
            raise QrLoginError(
                "QR login challenge was not found."
            )

        expires_at = parse_timestamp(
            challenge["expires_at"]
        )

        if (
            challenge["status"] == "PENDING"
            and expires_at <= timezone.now()
        ):
            (
                supabase.table("qr_login_challenges")
                .update(
                    {
                        "status": "EXPIRED",
                    }
                )
                .eq("id", challenge["id"])
                .execute()
            )

            challenge["status"] = "EXPIRED"

        return challenge

    except QrLoginError:
        raise

    except Exception as error:
        raise QrLoginError(
            "Could not retrieve QR login challenge."
        ) from error


def approve_qr_login_challenge(
    *,
    challenge_token: str,
    user_id: str,
) -> dict:
    challenge = get_qr_login_challenge(
        challenge_token=challenge_token,
    )

    if challenge["status"] != "PENDING":
        raise QrLoginError(
            "This QR code is no longer available."
        )

    try:
        web_session_token = secrets.token_urlsafe(48)
        device_session = create_web_device_session(
            user_id=user_id,
            session_token=web_session_token,
        )

        supabase = get_supabase_admin_client()

        response = (
            supabase.table("qr_login_challenges")
            .update(
                {
                    "status": "APPROVED",
                    "approved_at": timezone.now().isoformat(),
                    "device_session_id": device_session["id"],
                    "web_session_token_ciphertext": encrypt_integration_secret(
                        web_session_token
                    ),
                }
            )
            .eq("id", challenge["id"])
            .eq("status", "PENDING")
            .execute()
        )

        if not response.data:
            raise QrLoginError(
                "QR code was already used or expired."
            )

        return device_session

    except QrLoginError:
        raise

    except Exception as error:
        raise QrLoginError(
            "Could not approve QR login."
        ) from error


def consume_approved_qr_login_challenge(
    *,
    challenge_token: str,
    browser_nonce: str,
) -> dict:
    normalized_nonce = validate_browser_nonce(
        browser_nonce=browser_nonce,
    )
    now = timezone.now()

    try:
        response = get_supabase_admin_client().rpc(
            "consume_qr_login_challenge",
            {
                "p_challenge_token_hash": hash_token(
                    challenge_token
                ),
                "p_browser_nonce_hash": hash_token(
                    normalized_nonce
                ),
                "p_consumed_at": now.isoformat(),
            },
        ).execute()

        response_data = getattr(response, "data", None)

        if isinstance(response_data, list):
            consumed_challenge = (
                response_data[0]
                if response_data
                else None
            )
        elif isinstance(response_data, dict):
            consumed_challenge = response_data
        else:
            consumed_challenge = None

        if not consumed_challenge:
            raise QrLoginError(
                "QR login activation is not available."
            )

        ciphertext = str(
            consumed_challenge.get(
                "web_session_token_ciphertext"
            ) or ""
        ).strip()

        if not ciphertext:
            raise QrLoginError(
                "QR login activation is not available."
            )

        try:
            web_session_token = decrypt_integration_secret(
                ciphertext
            )
        except Exception as error:
            raise QrLoginError(
                "QR login activation is not available."
            ) from error

        if not web_session_token:
            raise QrLoginError(
                "QR login activation is not available."
            )

        consumed_challenge["web_session_token"] = web_session_token
        return consumed_challenge
    except QrLoginError:
        raise
    except Exception as error:
        raise QrLoginError(
            "Could not consume QR login challenge."
        ) from error
