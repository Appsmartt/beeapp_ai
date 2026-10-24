from __future__ import annotations

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)


def get_chat_identity_owner_id(
    *,
    identity_id: str,
) -> str | None:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("chat_identities")
                .select("owner_id")
                .eq("id", str(identity_id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            ),
        )

        identity = getattr(response, "data", None)

        if isinstance(identity, list):
            identity = identity[0] if identity else None

        owner_id = (
            str(identity.get("owner_id") or "").strip()
            if isinstance(identity, dict)
            else ""
        )

        return owner_id or None
    except Exception:
        return None
