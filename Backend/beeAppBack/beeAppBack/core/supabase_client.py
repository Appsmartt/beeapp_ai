import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Callable, TypeVar

from dotenv import load_dotenv
from supabase import Client, create_client


BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")

T = TypeVar("T")

TRANSIENT_SUPABASE_ERROR_MARKERS = (
    "server disconnected",
    "connection reset",
    "connection aborted",
    "connection refused",
    "connection closed",
    "connection was lost",
    "network is unreachable",
    "temporary failure",
    "temporarily unavailable",
    "timed out",
    "timeout",
    "503",
    "520",
    "521",
    "522",
    "pgrst000",
    "pgrst001",
    "pgrst002",
)


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


def clear_supabase_admin_client_cache() -> None:
    get_supabase_admin_client.cache_clear()


def is_transient_supabase_error(
    error: Exception,
) -> bool:
    message = str(error).lower()

    return any(
        marker in message
        for marker in TRANSIENT_SUPABASE_ERROR_MARKERS
    )


def execute_with_supabase_admin_retry(
    operation: Callable[[Client], T],
    *,
    retry_delay_seconds: float = 0.25,
) -> T:
    """
    Ejecuta una operación idempotente contra Supabase Admin.

    Si el cliente reutilizado falla por una desconexión transitoria,
    lo recrea y reintenta exactamente una vez. No reintenta errores
    de negocio, permisos, validación ni errores SQL funcionales.
    """
    try:
        return operation(get_supabase_admin_client())
    except Exception as first_error:
        if not is_transient_supabase_error(first_error):
            raise

        clear_supabase_admin_client_cache()

        if retry_delay_seconds > 0:
            time.sleep(retry_delay_seconds)

        return operation(get_supabase_admin_client())


def get_supabase_user_client(
    *,
    access_token: str,
) -> Client:
    if not isinstance(access_token, str) or not access_token.strip():
        raise ValueError(
            "A valid access token is required."
        )

    client = create_client(
        _get_required_env("SUPABASE_URL"),
        _get_required_env("SUPABASE_PUBLISHABLE_KEY"),
    )

    token = access_token.strip()

    client.postgrest.auth(token)

    return client
