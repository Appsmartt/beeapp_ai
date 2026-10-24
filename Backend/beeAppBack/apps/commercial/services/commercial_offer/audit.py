from typing import Any

from apps.commercial.exceptions import CommercialOperationError


def write_offer_audit_event(
    *,
    supabase,
    commercial_profile_id: str,
    actor_profile_id: str,
    offer_id: str,
    action: str,
    previous_state: str | None,
    new_state: str | None,
    metadata: dict[str, Any],
    entity_type: str = "commercial_offer",
    entity_id: str | None = None,
    reference_type: str | None = None,
    reference_id: str | None = None,
) -> None:
    try:
        response = supabase.rpc(
            "commerce_write_audit_event",
            {
                "p_commercial_profile_id": str(commercial_profile_id),
                "p_actor_profile_id": str(actor_profile_id),
                "p_entity_type": str(entity_type),
                "p_entity_id": str(entity_id or offer_id),
                "p_action": action,
                "p_previous_state": previous_state,
                "p_new_state": new_state,
                "p_reason_code": None,
                "p_reason_text": None,
                "p_reference_type": reference_type,
                "p_reference_id": (
                    str(reference_id)
                    if reference_id is not None
                    else None
                ),
                "p_metadata": metadata,
            },
        ).execute()

        if not getattr(response, "data", None):
            raise CommercialOperationError(
                "Could not write offer audit event.",
                code="COMMERCIAL_OFFER_AUDIT_FAILED",
            )
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not write offer audit event.",
            code="COMMERCIAL_OFFER_AUDIT_FAILED",
        ) from error
