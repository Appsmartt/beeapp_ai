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


def verify_phone_otp(*, phone: str, code: str):
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

        return response.user

    except PhoneOtpVerificationError:
        raise

    except Exception as error:
        raise PhoneOtpVerificationError(
            "Phone verification failed."
        ) from error