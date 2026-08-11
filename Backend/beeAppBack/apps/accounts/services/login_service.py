from beeAppBack.core.supabase_client import get_supabase_publishable_client

from apps.accounts.exceptions import AccountLoginError


def login_with_email_password(
    *,
    email: str,
    password: str,
) -> dict:
    try:
        supabase = get_supabase_publishable_client()

        response = supabase.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )

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

    except AccountLoginError:
        raise

    except Exception as error:
        raise AccountLoginError(
            "Email and password authentication failed."
        ) from error