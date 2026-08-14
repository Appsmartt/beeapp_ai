import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


def _get_required_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}"
        )

    return value


@lru_cache
def get_supabase_publishable_client() -> Client:
    return create_client(
        _get_required_env("SUPABASE_URL"),
        _get_required_env("SUPABASE_PUBLISHABLE_KEY"),
    )


@lru_cache
def get_supabase_admin_client() -> Client:
    return create_client(
        _get_required_env("SUPABASE_URL"),
        _get_required_env("SUPABASE_SECRET_KEY"),
    )


def get_supabase_user_client(*, access_token: str) -> Client:
    client = create_client(
        _get_required_env("SUPABASE_URL"),
        _get_required_env("SUPABASE_PUBLISHABLE_KEY"),
    )

    client.postgrest.auth(access_token)
    client.storage.set_auth(access_token)

    return client