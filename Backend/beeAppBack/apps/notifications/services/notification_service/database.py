from __future__ import annotations

from beeAppBack.core.supabase_client import get_supabase_admin_client


NOTIFICATION_COLUMNS = (
    "id,module,type,title,body,metadata,read_at,"
    "push_sent_at,push_error,created_at,expires_at"
)


def get_supabase():
    return get_supabase_admin_client()
