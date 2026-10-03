from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialOperationError,
    CommercialProfileNotFoundError,
    CommercialStateError,
)


def write_profile_audit_event(
    *,
    supabase,
    commercial_profile_id: str,
    actor_profile_id: str,
    action: str,
    previous_state: str | None,
    new_state: str | None,
    reason_code: str | None,
    reason_text: str | None,
    metadata: dict[str, Any],
) -> None:
    try:
        response = (
            supabase.rpc(
                "commerce_write_audit_event",
                {
                    "p_commercial_profile_id": str(
                        commercial_profile_id
                    ),
                    "p_actor_profile_id": str(actor_profile_id),
                    "p_entity_type": "commercial_profile",
                    "p_entity_id": str(commercial_profile_id),
                    "p_action": action,
                    "p_previous_state": previous_state,
                    "p_new_state": new_state,
                    "p_reason_code": reason_code,
                    "p_reason_text": reason_text,
                    "p_reference_type": None,
                    "p_reference_id": None,
                    "p_metadata": metadata,
                },
            )
            .execute()
        )

        if not getattr(response, "data", None):
            raise CommercialOperationError(
                "Could not write commercial profile audit event.",
                code="COMMERCIAL_PROFILE_AUDIT_FAILED",
            )
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not write commercial profile audit event.",
            code="COMMERCIAL_PROFILE_AUDIT_FAILED",
        ) from error


def update_commercial_profile_publication(
    *,
    get_user_client,
    require_profile_owner,
    get_profile_with_token,
    write_audit_event,
    user_id: str,
    access_token: str,
    profile_id: str,
    publication_status: str,
    reason_code: str | None = None,
    reason_text: str | None = None,
) -> dict[str, Any]:
    normalized_access_token = str(access_token or "").strip()

    if not normalized_access_token:
        raise CommercialAccessError(
            "A valid access token is required.",
            code="AUTHENTICATION_REQUIRED",
        )

    current_profile = require_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(profile_id),
    )
    current_status = str(
        current_profile.get("publication_status") or ""
    )
    target_status = str(publication_status or "").strip()

    if current_status == "suspended":
        raise CommercialStateError(
            "Suspended commercial profiles cannot be changed by the owner.",
            code="COMMERCIAL_PROFILE_SUSPENDED",
        )

    if target_status == "archived":
        if current_status == "archived":
            raise CommercialStateError(
                "Commercial profile is already deactivated.",
                code="COMMERCIAL_PROFILE_ALREADY_ARCHIVED",
            )

        if not str(reason_text or "").strip():
            raise CommercialStateError(
                "A deactivation reason is required.",
                code="COMMERCIAL_PROFILE_ARCHIVE_REASON_REQUIRED",
            )

        update_payload = {
            "publication_status": "archived",
            "archived_at": datetime.now(UTC).isoformat(),
            "is_available": False,
            "is_public": False,
        }
        action = "commercial_profile.archived"
        new_state = "archived"
    elif target_status == "paused":
        if current_status != "archived":
            raise CommercialStateError(
                "Only deactivated commercial profiles can be restored.",
                code="COMMERCIAL_PROFILE_NOT_ARCHIVED",
            )

        update_payload = {
            "publication_status": "paused",
            "archived_at": None,
            "is_available": False,
            "is_public": False,
        }
        action = "commercial_profile.restored"
        new_state = "paused"
    elif target_status == "published":
        if current_status != "paused":
            raise CommercialStateError(
                "Only paused commercial profiles can be activated.",
                code="COMMERCIAL_PROFILE_NOT_PAUSED",
            )

        update_payload = {
            "publication_status": "published",
            "archived_at": None,
            "is_available": True,
            "is_public": True,
        }
        action = "commercial_profile.published"
        new_state = "published"
    else:
        raise CommercialStateError(
            "Only archived, paused, or published publication changes "
            "are allowed here.",
            code="COMMERCIAL_PROFILE_PUBLICATION_TRANSITION_INVALID",
        )

    try:
        supabase = get_user_client(
            access_token=normalized_access_token,
        )
        response = (
            supabase.table("commercial_profiles")
            .update(update_payload)
            .eq("id", str(profile_id))
            .eq("owner_id", str(user_id))
            .eq("publication_status", current_status)
            .execute()
        )

        if not response.data:
            raise CommercialOperationError(
                "Commercial profile publication could not be updated.",
                code="COMMERCIAL_PROFILE_PUBLICATION_UPDATE_FAILED",
            )

        write_audit_event(
            supabase=supabase,
            commercial_profile_id=str(profile_id),
            actor_profile_id=str(user_id),
            action=action,
            previous_state=current_status,
            new_state=new_state,
            reason_code=reason_code,
            reason_text=(
                str(reason_text).strip()
                if reason_text is not None
                else None
            ),
            metadata={
                "source": "owner_businesses",
            },
        )

        return get_profile_with_token(
            access_token=normalized_access_token,
            profile_id=str(profile_id),
        )
    except (
        CommercialAccessError,
        CommercialOperationError,
        CommercialProfileNotFoundError,
        CommercialStateError,
    ):
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not update commercial profile publication.",
            code="COMMERCIAL_PROFILE_PUBLICATION_UPDATE_FAILED",
        ) from error
