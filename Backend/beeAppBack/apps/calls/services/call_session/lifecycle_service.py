from __future__ import annotations

from typing import Any

from apps.calls.exceptions import (
    CallAccessError,
    CallError,
    CallStateError,
    CallValidationError,
)
from apps.calls.services.call_session.credentials_service import (
    build_join_credentials,
)
from apps.calls.services.call_session.notification_service import (
    send_incoming_direct_call_notification,
)
from apps.calls.services.call_session.repository_service import (
    call_rpc_row,
    extract_agora_uid,
    get_actor_participant,
    get_call_detail,
)
from apps.calls.services.call_session.validation_service import (
    new_agora_channel_name,
    new_group_agora_uid,
    normalize_call_type,
    normalize_required_value,
)


def create_call_session(
    *,
    access_token: str,
    conversation_id: object,
    actor_identity_id: object,
    call_type: object,
) -> dict[str, Any]:
    normalized_conversation_id = normalize_required_value(
        conversation_id,
        field_name="Conversation ID",
    )
    normalized_actor_identity_id = normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    call = call_rpc_row(
        access_token=access_token,
        function_name="create_call_session",
        parameters={
            "p_conversation_id": normalized_conversation_id,
            "p_actor_identity_id": normalized_actor_identity_id,
            "p_call_type": normalize_call_type(call_type),
            "p_agora_channel_name": new_agora_channel_name(),
        },
    )
    call_id = normalize_required_value(
        call.get("id"),
        field_name="Call ID",
    )
    call_detail = get_call_detail(
        access_token=access_token,
        call_id=call_id,
        actor_identity_id=normalized_actor_identity_id,
    )
    credentials = build_join_credentials(
        call_detail=call_detail,
        actor_identity_id=normalized_actor_identity_id,
    )
    send_incoming_direct_call_notification(
        call_detail=call_detail,
        actor_identity_id=normalized_actor_identity_id,
    )
    return credentials


def join_call_session(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )
    call_detail = get_call_detail(
        access_token=access_token,
        call_id=normalized_call_id,
        actor_identity_id=normalized_actor_identity_id,
    )
    call = call_detail["call"]
    conversation_type = str(
        call.get("conversation_type") or ""
    ).strip().lower()
    participant = get_actor_participant(
        call_detail=call_detail,
        actor_identity_id=normalized_actor_identity_id,
        required=conversation_type == "direct",
    )

    if conversation_type == "direct":
        agora_uid = extract_agora_uid(participant)
    elif conversation_type == "group":
        agora_uid = (
            extract_agora_uid(participant)
            if participant is not None
            else new_group_agora_uid()
        )
    else:
        raise CallError(
            "Call has an unsupported conversation type."
        )

    call_rpc_row(
        access_token=access_token,
        function_name="join_call_session",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
            "p_agora_uid": agora_uid,
        },
    )
    updated_detail = get_call_detail(
        access_token=access_token,
        call_id=normalized_call_id,
        actor_identity_id=normalized_actor_identity_id,
    )
    return build_join_credentials(
        call_detail=updated_detail,
        actor_identity_id=normalized_actor_identity_id,
    )


def confirm_call_joined(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    return _execute_call_action(
        access_token=access_token,
        function_name="confirm_call_joined",
        call_id=call_id,
        actor_identity_id=actor_identity_id,
    )


def cancel_call_join_attempt(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
    failure_reason: object = None,
) -> dict[str, Any]:
    return _execute_call_action(
        access_token=access_token,
        function_name="cancel_call_join_attempt",
        call_id=call_id,
        actor_identity_id=actor_identity_id,
        extra_parameters={
            "p_failure_reason": str(failure_reason or "").strip()
            or None,
        },
    )


def decline_direct_call(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    return _execute_call_action(
        access_token=access_token,
        function_name="decline_direct_call",
        call_id=call_id,
        actor_identity_id=actor_identity_id,
    )


def leave_call_session(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    return _execute_call_action(
        access_token=access_token,
        function_name="leave_call_session",
        call_id=call_id,
        actor_identity_id=actor_identity_id,
    )


def end_call_session(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    return _execute_call_action(
        access_token=access_token,
        function_name="end_call_session",
        call_id=call_id,
        actor_identity_id=actor_identity_id,
    )


def refresh_call_rtc_token(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )
    call_detail = get_call_detail(
        access_token=access_token,
        call_id=normalized_call_id,
        actor_identity_id=normalized_actor_identity_id,
    )
    call = call_detail["call"]

    if str(call.get("status") or "").strip().lower() not in {
        "starting",
        "ringing",
        "active",
    }:
        raise CallStateError(
            "This call is not available for a token refresh."
        )

    participant = get_actor_participant(
        call_detail=call_detail,
        actor_identity_id=normalized_actor_identity_id,
    )

    if str(participant.get("status") or "").strip().lower() not in {
        "invited",
        "joined",
    }:
        raise CallAccessError(
            "You are not allowed to refresh this call token."
        )

    return build_join_credentials(
        call_detail=call_detail,
        actor_identity_id=normalized_actor_identity_id,
    )


def kick_call_participant(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
    target_identity_id: object,
) -> dict[str, Any]:
    normalized_actor_identity_id = normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )
    normalized_target_identity_id = normalize_required_value(
        target_identity_id,
        field_name="Target identity ID",
    )

    if normalized_actor_identity_id == normalized_target_identity_id:
        raise CallValidationError(
            "You cannot remove yourself from a call."
        )

    return _execute_call_action(
        access_token=access_token,
        function_name="kick_call_participant",
        call_id=call_id,
        actor_identity_id=normalized_actor_identity_id,
        extra_parameters={
            "p_target_identity_id": normalized_target_identity_id,
        },
    )


def _execute_call_action(
    *,
    access_token: str,
    function_name: str,
    call_id: object,
    actor_identity_id: object,
    extra_parameters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    parameters = {
        "p_call_id": normalize_required_value(
            call_id,
            field_name="Call ID",
        ),
        "p_actor_identity_id": normalize_required_value(
            actor_identity_id,
            field_name="Actor identity ID",
        ),
    }
    if extra_parameters:
        parameters.update(extra_parameters)

    return call_rpc_row(
        access_token=access_token,
        function_name=function_name,
        parameters=parameters,
    )
