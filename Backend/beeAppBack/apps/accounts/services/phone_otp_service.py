from beeAppBack.core.supabase_client import (
    get_supabase_publishable_client,
)

from apps.accounts.exceptions import (
    PhoneOtpRequestError,
    PhoneOtpVerificationError,
)


def request_phone_otp(*, phone: str) -> None:
    try:
        supabase = get_supabase_publishable_client()

        supabase.auth.sign_in_with_otp(
            {
                "phone": phone,
                "options": {
                    "should_create_user": False,
                },
            }
        )

    except Exception as error:
        raise PhoneOtpRequestError(
            "Could not request a phone verification code."
        ) from error


def verify_phone_otp(*, phone: str, code: str) -> dict:
    try:
        supabase = get_supabase_publishable_client()

        response = supabase.auth.verify_otp(
            {
                "phone": phone,
                "token": code,
                "type": "sms",
            }
        )

        if not response.user or not response.session:
            raise PhoneOtpVerificationError(
                "Supabase did not return an authenticated session."
            )

        session = response.session

        if not session.access_token or not session.refresh_token:
            raise PhoneOtpVerificationError(
                "Supabase did not return valid session tokens."
            )

        return {
            "user": response.user,
            "session": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_at": session.expires_at,
                "expires_in": session.expires_in,
                "token_type": session.token_type,
            },
        }

    except PhoneOtpVerificationError:
        raise

    except Exception as error:
        raise PhoneOtpVerificationError(
            "Phone verification failed."
        ) from error
