from __future__ import annotations

from typing import Any

from apps.calls.exceptions import (
    CallError,
    CallValidationError,
)
from apps.calls.services.call_session.repository_service import (
    get_call_detail,
)
from apps.calls.services.call_session.validation_service import (
    normalize_required_value,
)
from apps.calls.services.call_supabase_service import (
    execute_call_rpc,
)


def get_call_session_detail(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    return get_call_detail(
        access_token=access_token,
        call_id=normalize_required_value(
            call_id,
            field_name="Call ID",
        ),
        actor_identity_id=normalize_required_value(
            actor_identity_id,
            field_name="Actor identity ID",
        ),
    )


def get_active_call_for_conversation(
    *,
    access_token: str,
    conversation_id: object,
    actor_identity_id: object,
) -> dict[str, Any] | None:
    data = execute_call_rpc(
        access_token=access_token,
        function_name="get_active_call_for_conversation",
        parameters={
            "p_conversation_id": normalize_required_value(
                conversation_id,
                field_name="Conversation ID",
            ),
            "p_actor_identity_id": normalize_required_value(
                actor_identity_id,
                field_name="Actor identity ID",
            ),
        },
    )

    if data is None:
        return None

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    raise CallError("Unexpected response from call service.")


def get_call_history_for_conversation(
    *,
    access_token: str,
    conversation_id: object,
    actor_identity_id: object,
    limit: object = 50,
    before_created_at: object = None,
) -> list[dict[str, Any]]:
    try:
        normalized_limit = int(limit)
    except (TypeError, ValueError) as error:
        raise CallValidationError(
            "History limit must be an integer."
        ) from error

    if normalized_limit < 1 or normalized_limit > 100:
        raise CallValidationError(
            "History limit must be between 1 and 100."
        )

    data = execute_call_rpc(
        access_token=access_token,
        function_name="get_call_history_for_conversation",
        parameters={
            "p_conversation_id": normalize_required_value(
                conversation_id,
                field_name="Conversation ID",
            ),
            "p_actor_identity_id": normalize_required_value(
                actor_identity_id,
                field_name="Actor identity ID",
            ),
            "p_limit": normalized_limit,
            "p_before_created_at": (
                str(before_created_at).strip()
                if before_created_at is not None
                else None
            )
            or None,
        },
    )

    if data is None:
        return []

    if (
        not isinstance(data, list)
        or not all(isinstance(row, dict) for row in data)
    ):
        raise CallError("Unexpected response from call service.")

    return data
