from beeAppBack.core.supabase_client import (
    get_supabase_publishable_client,
)

from apps.accounts.exceptions import AccountAuthenticationError


def get_authenticated_user(*, access_token: str):
    try:
        supabase = get_supabase_publishable_client()
        response = supabase.auth.get_user(access_token)

        if not response.user:
            raise AccountAuthenticationError(
                "Supabase did not return an authenticated user."
            )

        return response.user

    except AccountAuthenticationError:
        raise

    except Exception as error:
        raise AccountAuthenticationError(
            "Access token authentication failed."
        ) from error