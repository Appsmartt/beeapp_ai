from beeAppBack.core.supabase_client import (
    get_supabase_user_client,
)


def get_chat_user_supabase_client(
    *,
    access_token: str,
):
    return get_supabase_user_client(
        access_token=access_token,
    )