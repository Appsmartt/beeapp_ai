from typing import Any

from apps.commercial.exceptions import CommercialOperationError


def write_payment_method_audit_event(
    *,
    supabase,
    commercial_profile_id: str,
    actor_profile_id: str,
    payment_method_id: str,
    action: str,
    previous_state: str | None,
    new_state: str | None,
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
                    "p_entity_type": "commercial_payment_method",
                    "p_entity_id": str(payment_method_id),
                    "p_action": action,
                    "p_previous_state": previous_state,
                    "p_new_state": new_state,
                    "p_reason_code": None,
                    "p_reason_text": None,
                    "p_reference_type": None,
                    "p_reference_id": None,
                    "p_metadata": metadata,
                },
            )
            .execute()
        )

        if not getattr(response, "data", None):
            raise CommercialOperationError(
                "Could not write payment method audit event.",
                code="COMMERCIAL_PAYMENT_METHOD_AUDIT_FAILED",
            )
    except CommercialOperationError:
        raise
    except Exception as error:
        raise CommercialOperationError(
            "Could not write payment method audit event.",
            code="COMMERCIAL_PAYMENT_METHOD_AUDIT_FAILED",
        ) from error
