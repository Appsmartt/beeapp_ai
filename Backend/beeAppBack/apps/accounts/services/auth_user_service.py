from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.accounts.exceptions import (
    AuthUserCreationError,
    AuthUserLookupError,
    AuthUserPasswordUpdateError,
)


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None

    return phone if phone.startswith("+") else f"+{phone}"


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


def get_auth_user_by_phone(*, phone: str):
    normalized_phone = normalize_phone(phone)

    try:
        supabase = get_supabase_admin_client()
        page = 1
        per_page = 1000

        while True:
            users = supabase.auth.admin.list_users(
                page=page,
                per_page=per_page,
            )

            if not isinstance(users, list):
                users = getattr(users, "users", [])

            for user in users:
                if normalize_phone(user.phone) == normalized_phone:
                    return user

            if len(users) < per_page:
                break

            page += 1

        raise AuthUserLookupError(
            "Could not find an authentication user by phone."
        )

    except AuthUserLookupError:
        raise

    except Exception as error:
        raise AuthUserLookupError(
            "Could not retrieve the authentication user by phone."
        ) from error


def update_auth_user_email(
    *,
    auth_user_id: str,
    email: str,
):
    try:
        supabase = get_supabase_admin_client()

        response = supabase.auth.admin.update_user_by_id(
            auth_user_id,
            {
                "email": email,
                "email_confirm": True,
            },
        )

        if not response.user:
            raise AuthUserLookupError(
                "Supabase did not return the updated user."
            )

        return response.user

    except AuthUserLookupError:
        raise

    except Exception as error:
        raise AuthUserLookupError(
            "Could not update the authentication email."
        ) from error


def update_auth_user_password(
    *,
    auth_user_id: str,
    new_password: str,
):
    try:
        supabase = get_supabase_admin_client()

        response = supabase.auth.admin.update_user_by_id(
            auth_user_id,
            {
                "password": new_password,
            },
        )

        if not response.user:
            raise AuthUserPasswordUpdateError(
                "Supabase did not return the updated user."
            )

        return response.user

    except AuthUserPasswordUpdateError:
        raise

    except Exception as error:
        raise AuthUserPasswordUpdateError(
            "Could not update the authentication password."
        ) from error


def delete_auth_user(*, auth_user_id: str) -> None:
    try:
        supabase = get_supabase_admin_client()

        supabase.auth.admin.delete_user(auth_user_id)

    except Exception:
        pass