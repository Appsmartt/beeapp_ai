from __future__ import annotations

from typing import Any

from apps.calls.exceptions import (
    CallError,
    CallNotFoundError,
)
from apps.calls.services.call_supabase_service import (
    execute_call_rpc,
)
from apps.calls.services.call_session.validation_service import (
    extract_rpc_row,
)


def call_rpc_row(
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
    return extract_rpc_row(data)


def get_call_detail(
    *,
    access_token: str,
    call_id: str,
    actor_identity_id: str,
) -> dict[str, Any]:
    detail = call_rpc_row(
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


def get_actor_participant(
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


def extract_agora_uid(participant: dict[str, Any]) -> int:
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
