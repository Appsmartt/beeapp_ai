from __future__ import annotations

import secrets
from typing import Any

from apps.calls.exceptions import (
    CallError,
    CallNotFoundError,
    CallValidationError,
)
from apps.calls.services.agora_token_service import (
    AgoraRtcToken,
    build_agora_rtc_token,
)
from apps.calls.services.call_supabase_service import (
    execute_call_rpc,
)


GROUP_AGORA_UID_MIN = 10_000
GROUP_AGORA_UID_MAX = 2_000_000_000


def _normalize_required_value(
    value: object,
    *,
    field_name: str,
) -> str:
    normalized_value = str(value or "").strip()

    if not normalized_value:
        raise CallValidationError(
            f"{field_name} is required."
        )

    return normalized_value


def _normalize_call_type(value: object) -> str:
    normalized_value = str(value or "").strip().lower()

    if normalized_value not in {"voice", "video"}:
        raise CallValidationError(
            "Call type must be voice or video."
        )

    return normalized_value


def _extract_rpc_row(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        if not data:
            raise CallNotFoundError(
                "Call resource was not found."
            )

        data = data[0]

    if not isinstance(data, dict):
        raise CallError(
            "Unexpected response from call service."
        )

    return data


def _new_agora_channel_name() -> str:
    return f"beeapp_{secrets.token_urlsafe(24)}"


def _new_group_agora_uid() -> int:
    return (
        secrets.randbelow(
            GROUP_AGORA_UID_MAX
            - GROUP_AGORA_UID_MIN
            + 1
        )
        + GROUP_AGORA_UID_MIN
    )


def _call_rpc_row(
    *,
    access_token: str,
    function_name: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    data = execute_call_rpc(
        access_token=access_token,
        function_name=function_name,
        parameters=parameters,
    )

    return _extract_rpc_row(data)


def _get_call_detail(
    *,
    access_token: str,
    call_id: str,
    actor_identity_id: str,
) -> dict[str, Any]:
    detail = _call_rpc_row(
        access_token=access_token,
        function_name="get_call_session_detail",
        parameters={
            "p_call_id": call_id,
            "p_actor_identity_id": actor_identity_id,
        },
    )

    call = detail.get("call")
    participants = detail.get("participants")

    if not isinstance(call, dict):
        raise CallError(
            "Call detail response did not include a call."
        )

    if not isinstance(participants, list):
        raise CallError(
            "Call detail response did not include participants."
        )

    return detail


def _get_actor_participant(
    *,
    call_detail: dict[str, Any],
    actor_identity_id: str,
    required: bool = True,
) -> dict[str, Any] | None:
    for participant in call_detail["participants"]:
        if (
            isinstance(participant, dict)
            and str(participant.get("identity_id"))
            == actor_identity_id
        ):
            return participant

    if required:
        raise CallNotFoundError(
            "Call participant was not found."
        )

    return None


def _extract_agora_uid(
    participant: dict[str, Any],
) -> int:
    try:
        agora_uid = int(participant.get("agora_uid"))
    except (TypeError, ValueError) as error:
        raise CallError(
            "Call participant has an invalid Agora UID."
        ) from error

    if agora_uid <= 0:
        raise CallError(
            "Call participant has an invalid Agora UID."
        )

    return agora_uid


def _build_join_credentials(
    *,
    call_detail: dict[str, Any],
    actor_identity_id: str,
) -> dict[str, Any]:
    call = call_detail["call"]
    participant = _get_actor_participant(
        call_detail=call_detail,
        actor_identity_id=actor_identity_id,
    )

    channel_name = str(
        call.get("agora_channel_name") or ""
    ).strip()

    if not channel_name:
        raise CallError(
            "Call does not have an Agora channel."
        )

    agora_token: AgoraRtcToken = build_agora_rtc_token(
        channel_name=channel_name,
        agora_uid=_extract_agora_uid(participant),
    )

    return {
        "call": call,
        "participant": participant,
        "can_end_call": bool(
            call_detail.get("can_end_call")
        ),
        "can_kick_participants": bool(
            call_detail.get("can_kick_participants")
        ),
        "participants": call_detail["participants"],
        "agora": {
            "app_id": agora_token.app_id,
            "channel_name": agora_token.channel_name,
            "uid": agora_token.agora_uid,
            "token": agora_token.token,
            "expires_at": agora_token.expires_at,
        },
    }


def create_call_session(
    *,
    access_token: str,
    conversation_id: object,
    actor_identity_id: object,
    call_type: object,
) -> dict[str, Any]:
    normalized_conversation_id = _normalize_required_value(
        conversation_id,
        field_name="Conversation ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    call = _call_rpc_row(
        access_token=access_token,
        function_name="create_call_session",
        parameters={
            "p_conversation_id": normalized_conversation_id,
            "p_actor_identity_id": normalized_actor_identity_id,
            "p_call_type": _normalize_call_type(call_type),
            "p_agora_channel_name": _new_agora_channel_name(),
        },
    )

    call_id = _normalize_required_value(
        call.get("id"),
        field_name="Call ID",
    )

    call_detail = _get_call_detail(
        access_token=access_token,
        call_id=call_id,
        actor_identity_id=normalized_actor_identity_id,
    )

    return _build_join_credentials(
        call_detail=call_detail,
        actor_identity_id=normalized_actor_identity_id,
    )


def join_call_session(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    call_detail = _get_call_detail(
        access_token=access_token,
        call_id=normalized_call_id,
        actor_identity_id=normalized_actor_identity_id,
    )
    call = call_detail["call"]
    conversation_type = str(
        call.get("conversation_type") or ""
    ).strip().lower()

    participant = _get_actor_participant(
        call_detail=call_detail,
        actor_identity_id=normalized_actor_identity_id,
        required=conversation_type == "direct",
    )

    if conversation_type == "direct":
        agora_uid = _extract_agora_uid(participant)
    elif conversation_type == "group":
        if participant is not None:
            agora_uid = _extract_agora_uid(participant)
        else:
            agora_uid = _new_group_agora_uid()
    else:
        raise CallError(
            "Call has an unsupported conversation type."
        )

    _call_rpc_row(
        access_token=access_token,
        function_name="join_call_session",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
            "p_agora_uid": agora_uid,
        },
    )

    updated_detail = _get_call_detail(
        access_token=access_token,
        call_id=normalized_call_id,
        actor_identity_id=normalized_actor_identity_id,
    )

    return _build_join_credentials(
        call_detail=updated_detail,
        actor_identity_id=normalized_actor_identity_id,
    )


def confirm_call_joined(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    return _call_rpc_row(
        access_token=access_token,
        function_name="confirm_call_joined",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
        },
    )


def cancel_call_join_attempt(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
    failure_reason: object = None,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )
    normalized_failure_reason = str(
        failure_reason or ""
    ).strip() or None

    return _call_rpc_row(
        access_token=access_token,
        function_name="cancel_call_join_attempt",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
            "p_failure_reason": normalized_failure_reason,
        },
    )


def decline_direct_call(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    return _call_rpc_row(
        access_token=access_token,
        function_name="decline_direct_call",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
        },
    )


def leave_call_session(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    return _call_rpc_row(
        access_token=access_token,
        function_name="leave_call_session",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
        },
    )


def end_call_session(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    return _call_rpc_row(
        access_token=access_token,
        function_name="end_call_session",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
        },
    )


def get_call_session_detail(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    return _get_call_detail(
        access_token=access_token,
        call_id=normalized_call_id,
        actor_identity_id=normalized_actor_identity_id,
    )


def get_active_call_for_conversation(
    *,
    access_token: str,
    conversation_id: object,
    actor_identity_id: object,
) -> dict[str, Any] | None:
    normalized_conversation_id = _normalize_required_value(
        conversation_id,
        field_name="Conversation ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    data = execute_call_rpc(
        access_token=access_token,
        function_name="get_active_call_for_conversation",
        parameters={
            "p_conversation_id": normalized_conversation_id,
            "p_actor_identity_id": normalized_actor_identity_id,
        },
    )

    if data is None:
        return None

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    raise CallError(
        "Unexpected response from call service."
    )


def get_call_history_for_conversation(
    *,
    access_token: str,
    conversation_id: object,
    actor_identity_id: object,
    limit: object = 50,
    before_created_at: object = None,
) -> list[dict[str, Any]]:
    normalized_conversation_id = _normalize_required_value(
        conversation_id,
        field_name="Conversation ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

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

    normalized_before_created_at = (
        str(before_created_at).strip()
        if before_created_at is not None
        else None
    )

    data = execute_call_rpc(
        access_token=access_token,
        function_name="get_call_history_for_conversation",
        parameters={
            "p_conversation_id": normalized_conversation_id,
            "p_actor_identity_id": normalized_actor_identity_id,
            "p_limit": normalized_limit,
            "p_before_created_at": (
                normalized_before_created_at
                or None
            ),
        },
    )

    if data is None:
        return []

    if not isinstance(data, list):
        raise CallError(
            "Unexpected response from call service."
        )

    if not all(isinstance(row, dict) for row in data):
        raise CallError(
            "Unexpected response from call service."
        )

    return data


def refresh_call_rtc_token(
    *,
    access_token: str,
    call_id: object,
    actor_identity_id: object,
) -> dict[str, Any]:
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )

    call_detail = _get_call_detail(
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

    participant = _get_actor_participant(
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

    return _build_join_credentials(
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
    normalized_call_id = _normalize_required_value(
        call_id,
        field_name="Call ID",
    )
    normalized_actor_identity_id = _normalize_required_value(
        actor_identity_id,
        field_name="Actor identity ID",
    )
    normalized_target_identity_id = _normalize_required_value(
        target_identity_id,
        field_name="Target identity ID",
    )

    if (
        normalized_actor_identity_id
        == normalized_target_identity_id
    ):
        raise CallValidationError(
            "You cannot remove yourself from a call."
        )

    return _call_rpc_row(
        access_token=access_token,
        function_name="kick_call_participant",
        parameters={
            "p_call_id": normalized_call_id,
            "p_actor_identity_id": normalized_actor_identity_id,
            "p_target_identity_id": (
                normalized_target_identity_id
            ),
        },
    )
