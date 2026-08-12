import secrets
from datetime import datetime, timedelta

from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import QrLoginError
from apps.accounts.services.device_session_service import (
    create_web_device_session,
    hash_token,
)


QR_LOGIN_DURATION_SECONDS = 120


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def create_qr_login_challenge() -> dict:
    try:
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
                "id,status,expires_at,device_session_id"
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
        device_session = create_web_device_session(
            user_id=user_id,
            session_token=challenge_token,
        )

        supabase = get_supabase_admin_client()

        response = (
            supabase.table("qr_login_challenges")
            .update(
                {
                    "status": "APPROVED",
                    "approved_at": timezone.now().isoformat(),
                    "device_session_id": device_session["id"],
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