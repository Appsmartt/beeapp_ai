from beeAppBack.core.supabase_client import (
    get_supabase_publishable_client,
)

from apps.accounts.exceptions import (
    AccountAuthenticationError,
)


def refresh_supabase_session(
    *,
    refresh_token: str,
) -> dict:
    try:
        supabase = get_supabase_publishable_client()

        response = supabase.auth.refresh_session(
            refresh_token
        )

        if not response.session:
            raise AccountAuthenticationError(
                "Supabase did not return a refreshed session."
            )

        session = response.session

        if not session.access_token or not session.refresh_token:
            raise AccountAuthenticationError(
                "Supabase did not return valid refreshed tokens."
            )

        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_at": session.expires_at,
            "expires_in": session.expires_in,
            "token_type": session.token_type,
        }

    except AccountAuthenticationError:
        raise

    except Exception as error:
        raise AccountAuthenticationError(
            "Could not refresh Supabase session."
        ) from error