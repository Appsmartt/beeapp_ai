from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client


INITIAL_SYNC_LOOKBACK_DAYS = 90
INITIAL_SYNC_MAX_MESSAGES = 10
INITIAL_SYNC_MAX_SPAM_MESSAGES = 10

INCREMENTAL_SYNC_LOOKBACK_DAYS = 90
INCREMENTAL_SYNC_MAX_MESSAGES = 10
INCREMENTAL_SYNC_MAX_SPAM_MESSAGES = 10

MAIL_INTEGRATION_COLUMNS = (
    "id,user_id,integration_connection_id,provider,"
    "provider_account_id,provider_email,provider_display_name,"
    "status,connected_at,initial_sync_completed_at,"
    "initial_sync_started_at,last_successful_sync_at,"
    "last_attempted_sync_at,next_sync_at,sync_cursor,"
    "sync_cursor_updated_at,reauth_required_at,disconnected_at,"
    "last_error_code,last_error_message,metadata,"
    "created_at,updated_at"
)


def get_supabase():
    return get_supabase_admin_client()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []
