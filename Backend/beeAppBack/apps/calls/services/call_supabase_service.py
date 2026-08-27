from __future__ import annotations

import re
import logging

from typing import Any

logger = logging.getLogger(__name__)

from beeAppBack.core.supabase_client import (
    get_supabase_user_client,
)

from apps.calls.exceptions import (
    CallAccessError,
    CallCapacityError,
    CallError,
    CallNotFoundError,
    CallStateError,
    CallValidationError,
)


def get_call_user_supabase_client(
    *,
    access_token: str,
):
    return get_supabase_user_client(
        access_token=access_token,
    )


def extract_rpc_data(response) -> Any:
    if response is None:
        return None

    return getattr(response, "data", None)


def extract_rpc_row(response) -> dict[str, Any]:
    data = extract_rpc_data(response)

    if isinstance(data, list):
        if not data:
            raise CallNotFoundError("Call resource was not found.")

        data = data[0]

    if not isinstance(data, dict):
        raise CallError("Unexpected response from call service.")

    return data


def extract_call_error_code(
    message: str,
) -> str | None:
    match = re.search(
        r"\b(CALL_[A-Z0-9_]+)\b",
        message.upper(),
    )

    return match.group(1) if match else None


def translate_call_rpc_error(error: Exception) -> CallError:
    message = str(error)
    normalized_message = message.upper()
    error_code = extract_call_error_code(message)

    if "CALL_NOT_FOUND" in normalized_message:
        return CallNotFoundError(
            "Call session was not found.",
            code=error_code,
        )

    if any(
        code in normalized_message
        for code in (
            "AUTHENTICATION_REQUIRED",
            "CALL_IDENTITY_NOT_OWNED_BY_USER",
            "CALL_IDENTITY_NOT_ACTIVE_CONVERSATION_PARTICIPANT",
            "CALL_IDENTITY_NOT_FOUND_OR_INACTIVE",
            "CALL_PARTICIPANT_NOT_AUTHORIZED",
            "CALL_DIRECT_PARTICIPANT_NOT_INVITED",
            "CALL_PARTICIPANT_KICKED",
            "CALL_USER_BUSY",
            "CALL_RECIPIENT_BUSY",
            "CALL_GROUP_MANAGER_REQUIRED_TO_END",
            "CALL_GROUP_MANAGER_REQUIRED_TO_KICK",
            "CALL_PARTICIPANT_CANNOT_END",
        )
    ):
        return CallAccessError(
            "You are not allowed to perform this call action.",
            code=error_code,
        )

    if "CALL_FULL" in normalized_message:
        return CallCapacityError(
            "This call has reached its participant limit.",
            code=error_code,
        )

    if any(
        code in normalized_message
        for code in (
            "CALL_ALREADY_ACTIVE_IN_CONVERSATION",
            "CALL_EXPIRED",
            "CALL_NOT_ACTIVE",
            "CALL_NOT_OPEN",
            "CALL_NOT_RINGING",
            "CALL_GROUP_NOT_READY",
            "CALL_GROUP_CALLS_NOT_ALLOWED",
            "CALL_DECLINE_ONLY_SUPPORTED_FOR_DIRECT_CALLS",
            "CALL_KICK_ONLY_SUPPORTED_FOR_GROUPS",
            "CALL_PARTICIPANT_CANNOT_CANCEL_JOIN_ATTEMPT",
            "CALL_PARTICIPANT_CANNOT_CONFIRM_JOIN",
            "CALL_PARTICIPANT_CANNOT_DECLINE",
            "CALL_PARTICIPANT_CANNOT_JOIN",
            "CALL_PARTICIPANT_NOT_JOINED",
            "CALL_TARGET_NOT_JOINED",
            "CALL_TARGET_NOT_PARTICIPATING",
            "CALL_DIRECT_COUNTERPART_NOT_AVAILABLE",
            "CALL_DIRECT_CONVERSATION_MUST_HAVE_TWO_ACTIVE_PARTICIPANTS",
            "CALL_CONVERSATION_NOT_FOUND_OR_INACTIVE",
        )
    ):
        return CallStateError(
            "This call is not available for that action.",
            code=error_code,
        )

    if any(
        code in normalized_message
        for code in (
            "CALL_ACTOR_IDENTITY_REQUIRED",
            "CALL_AGORA_CHANNEL_REQUIRED",
            "CALL_AGORA_UID_INVALID",
            "CALL_CANNOT_KICK_SELF",
            "CALL_CONVERSATION_AND_ACTOR_IDENTITY_REQUIRED",
            "CALL_CONVERSATION_ID_REQUIRED",
            "CALL_CONVERSATION_NOT_FOUND",
            "CALL_CONVERSATION_TYPE_NOT_SUPPORTED",
            "CALL_HISTORY_LIMIT_MUST_BE_BETWEEN_1_AND_100",
            "CALL_ID_ACTOR_AND_TARGET_REQUIRED",
            "CALL_ID_AND_ACTOR_IDENTITY_REQUIRED",
            "CALL_ID_REQUIRED",
            "CALL_JOIN_ATTEMPT_MAX_AGE_INVALID",
            "CALL_OWNER_ID_REQUIRED",
            "CALL_TYPE_INVALID",
            "CALL_TYPE_REQUIRED",
        )
    ):
        return CallValidationError(
            "Invalid call request.",
            code=error_code,
        )

    return CallError(
        "Call service request failed.",
        code=error_code,
    )


def execute_call_rpc(
    *,
    access_token: str,
    function_name: str,
    parameters: dict[str, Any],
) -> Any:
    try:
        supabase = get_call_user_supabase_client(
            access_token=access_token,
        )

        response = supabase.rpc(
            function_name,
            parameters,
        ).execute()
    except CallError:
        raise
    except Exception as error:
        logger.exception(
            "Supabase call RPC failed: function=%s error=%s",
            function_name,
            str(error),
        )
        raise translate_call_rpc_error(error) from error

    return extract_rpc_data(response)
