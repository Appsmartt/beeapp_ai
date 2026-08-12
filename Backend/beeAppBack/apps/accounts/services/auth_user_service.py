from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import (
    AuthUserCreationError,
    AuthUserLookupError,
)


def create_auth_user(
    *,
    email: str,
    password: str,
    phone_dial_code: str,
    phone_number: str,
):
    phone = f"+{phone_dial_code}{phone_number}"

    try:
        supabase = get_supabase_admin_client()

        response = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "phone": phone,
                "email_confirm": True,
                "phone_confirm": True,
            }
        )

        if not response.user:
            raise AuthUserCreationError(
                "Supabase did not return the created user."
            )

        return response.user

    except AuthUserCreationError:
        raise

    except Exception as error:
        raise AuthUserCreationError(
            "Could not create the authentication user."
        ) from error


def get_auth_user(*, auth_user_id: str):
    try:
        supabase = get_supabase_admin_client()

        response = supabase.auth.admin.get_user_by_id(
            auth_user_id
        )

        if not response.user:
            raise AuthUserLookupError(
                "Supabase did not return the requested user."
            )

        return response.user

    except AuthUserLookupError:
        raise

    except Exception as error:
        raise AuthUserLookupError(
            "Could not retrieve the authentication user."
        ) from error


def delete_auth_user(*, auth_user_id: str) -> None:
    try:
        supabase = get_supabase_admin_client()

        supabase.auth.admin.delete_user(auth_user_id)

    except Exception:
        pass