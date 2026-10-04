from django.utils import timezone

from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import DeviceSessionError


def revoke_device_session_by_id(
    *,
    device_id: str,
    user_id: str | None = None,
) -> None:
    try:
        supabase = get_supabase_admin_client()

        query = (
            supabase.table("device_sessions")
            .update(
                {
                    "is_active": False,
                    "revoked_at": timezone.now().isoformat(),
                }
            )
            .eq("id", device_id)
        )

        if user_id:
            query = query.eq("user_id", user_id)

        query.execute()

    except Exception as error:
        raise DeviceSessionError(
            "Could not revoke device session."
        ) from error

def revoke_all_user_device_sessions(
    *,
    user_id: str,
) -> None:
    try:
        supabase = get_supabase_admin_client()
        supabase.rpc(
            "beeapp_revoke_all_user_sessions",
            {"p_user_id": user_id},
        ).execute()
    except Exception as error:
        raise DeviceSessionError(
            "Could not revoke device sessions."
        ) from error

# ============================================================
# Mobile session control: one active MOBILE session per user.
# ============================================================
