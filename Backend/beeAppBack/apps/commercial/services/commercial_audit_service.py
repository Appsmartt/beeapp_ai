from __future__ import annotations

from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialOperationError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commercial_profile_owner,
)
from apps.commercial.services.commercial_supabase_service import (
    get_commercial_user_supabase_client,
)


COMMERCIAL_AUDIT_EVENT_COLUMNS = (
    "id,commercial_profile_id,actor_profile_id,"
    "actor_role_snapshot,entity_type,entity_id,action,"
    "previous_state,new_state,reason_code,reason_text,"
    "reference_type,reference_id,metadata,created_at"
)


def list_owned_commercial_audit_events(
    *,
    user_id: str,
    access_token: str,
    commercial_profile_id: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialAccessError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    normalized_limit = max(1, min(int(limit), 100))
    normalized_offset = max(0, int(offset))

    try:
        supabase = get_commercial_user_supabase_client(
            access_token=normalized_access_token,
        )

        query = (
            supabase.table("commercial_audit_events")
            .select(
                COMMERCIAL_AUDIT_EVENT_COLUMNS,
                count="exact",
            )
            .eq(
                "commercial_profile_id",
                str(commercial_profile_id),
            )
            .order("created_at", desc=True)
        )

        if entity_type:
            query = query.eq(
                "entity_type",
                str(entity_type).strip(),
            )

        if entity_id:
            query = query.eq("entity_id", str(entity_id))

        if action:
            query = query.eq("action", str(action).strip())

        response = (
            query.range(
                normalized_offset,
                normalized_offset + normalized_limit - 1,
            )
            .execute()
        )

        events = [
            {
                "id": str(event["id"]),
                "commercial_profile_id": str(
                    event["commercial_profile_id"]
                ),
                "actor_profile_id": (
                    str(event["actor_profile_id"])
                    if event.get("actor_profile_id")
                    else None
                ),
                "actor_role_snapshot": event.get(
                    "actor_role_snapshot"
                ),
                "entity_type": event["entity_type"],
                "entity_id": str(event["entity_id"]),
                "action": event["action"],
                "previous_state": event.get(
                    "previous_state"
                ),
                "new_state": event.get("new_state"),
                "reason_code": event.get("reason_code"),
                "reason_text": event.get("reason_text"),
                "reference_type": event.get("reference_type"),
                "reference_id": (
                    str(event["reference_id"])
                    if event.get("reference_id")
                    else None
                ),
                "metadata": event.get("metadata") or {},
                "created_at": event.get("created_at"),
            }
            for event in (response.data or [])
        ]

        return {
            "commercial_profile_id": str(
                commercial_profile_id
            ),
            "audit_events": events,
            "count": int(
                getattr(response, "count", 0) or 0
            ),
            "limit": normalized_limit,
            "offset": normalized_offset,
        }

    except (
        CommercialAccessError,
        CommercialOperationError,
    ):
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not retrieve commercial audit events.",
            code="COMMERCIAL_AUDIT_EVENT_LIST_FAILED",
        ) from error
