from apps.commercial.exceptions import CommercialAccessError
from apps.commercial.services.commercial_supabase_service import (
    get_commercial_user_supabase_client,
)


def get_user_supabase_client(*, access_token: str):
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialAccessError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    return get_commercial_user_supabase_client(
        access_token=normalized_access_token,
    )
