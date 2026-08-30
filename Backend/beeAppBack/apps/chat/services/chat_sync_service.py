from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_user_client,
)

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatError,
)


BOOTSTRAP_REQUIRED_KEYS = (
    "server_time",
    "sync_cursor",
    "identities",
    "conversations",
    "participants",
    "messages",
    "reactions",
    "invites",
)


def _user_supabase(
    *,
    access_token: str,
):
    return get_supabase_user_client(
        access_token=access_token,
    )


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return [
            row
            for row in data
            if isinstance(row, dict)
        ]

    if isinstance(data, dict):
        return [data]

    return []


def _response_data(response) -> Any:
    if response is None:
        return None

    return getattr(response, "data", None)


def _normalize_bootstrap_payload(
    value: Any,
) -> dict[str, Any]:
    if isinstance(value, list):
        value = value[0] if value else None

    if not isinstance(value, dict):
        raise ChatError(
            "Chat bootstrap did not return a valid JSON object."
        )

    normalized: dict[str, Any] = {
        **value,
    }

    for key in BOOTSTRAP_REQUIRED_KEYS:
        if key not in normalized:
            if key in {
                "identities",
                "conversations",
                "participants",
                "messages",
                "reactions",
                "invites",
            }:
                normalized[key] = []
            elif key == "sync_cursor":
                normalized[key] = 0
            else:
                normalized[key] = None

    for key in (
        "identities",
        "conversations",
        "participants",
        "messages",
        "reactions",
        "invites",
    ):
        if not isinstance(normalized[key], list):
            normalized[key] = []

    try:
        normalized["sync_cursor"] = int(
            normalized["sync_cursor"] or 0
        )
    except (
        TypeError,
        ValueError,
    ) as error:
        raise ChatError(
            "Chat bootstrap returned an invalid sync cursor."
        ) from error

    return normalized


def _normalize_sync_changes(
    *,
    rows: list[dict[str, Any]],
    after_event_sequence: int,
) -> dict[str, Any]:
    events: list[dict[str, Any]] = []
    has_more = False
    next_event_sequence = int(after_event_sequence)

    for row in rows:
        event_sequence = row.get("event_sequence")

        try:
            normalized_sequence = int(event_sequence)
        except (
            TypeError,
            ValueError,
        ) as error:
            raise ChatError(
                "Chat sync returned an invalid event sequence."
            ) from error

        next_value = row.get("next_event_sequence")

        try:
            normalized_next_value = int(
                next_value
                if next_value is not None
                else normalized_sequence
            )
        except (
            TypeError,
            ValueError,
        ) as error:
            raise ChatError(
                "Chat sync returned an invalid next cursor."
            ) from error

        has_more = bool(row.get("has_more", False))
        next_event_sequence = max(
            next_event_sequence,
            normalized_next_value,
            normalized_sequence,
        )

        events.append(
            {
                "id": row.get("event_id"),
                "event_sequence": normalized_sequence,
                "event_type": row.get("event_type"),
                "conversation_id": row.get(
                    "conversation_id"
                ),
                "message_id": row.get("message_id"),
                "reaction_id": row.get("reaction_id"),
                "invite_id": row.get("invite_id"),
                "payload": (
                    row.get("payload")
                    if isinstance(row.get("payload"), dict)
                    else {}
                ),
                "created_at": row.get("created_at"),
            }
        )

    return {
        "events": events,
        "count": len(events),
        "has_more": has_more,
        "next_event_sequence": next_event_sequence,
    }


def _raise_sync_error(
    *,
    error: Exception,
    operation: str,
) -> None:
    message = str(error)

    if "AUTHENTICATION_REQUIRED" in message:
        raise ChatConversationAccessError(
            "A valid user access token is required."
        ) from error

    if "CHAT_SYNC_CURSOR_MUST_BE_ZERO_OR_GREATER" in message:
        raise ChatError(
            "Chat sync cursor must be zero or greater."
        ) from error

    if "CHAT_SYNC_LIMIT_MUST_BE_BETWEEN_1_AND_500" in message:
        raise ChatError(
            "Chat sync limit must be between 1 and 500."
        ) from error

    if (
        "CHAT_BOOTSTRAP_DIRECT_LIMIT_MUST_BE_BETWEEN_1_AND_20"
        in message
    ):
        raise ChatError(
            "Chat bootstrap direct limit must be between 1 and 20."
        ) from error

    if (
        "CHAT_BOOTSTRAP_GROUP_LIMIT_MUST_BE_BETWEEN_1_AND_20"
        in message
    ):
        raise ChatError(
            "Chat bootstrap group limit must be between 1 and 20."
        ) from error

    if (
        "CHAT_BOOTSTRAP_MESSAGES_PER_CONVERSATION_MUST_BE_"
        "BETWEEN_1_AND_200"
        in message
    ):
        raise ChatError(
            "Chat bootstrap messages per conversation must be "
            "between 1 and 200."
        ) from error

    if (
        "CHAT_BOOTSTRAP_MESSAGES_SINCE_MUST_BE_WITHIN_30_DAYS"
        in message
    ):
        raise ChatError(
            "Chat bootstrap messages_since must be within 30 days."
        ) from error

    raise ChatError(
        f"Could not {operation}: {message}"
    ) from error


def get_chat_sync_bootstrap(
    *,
    user_id: str,
    access_token: str,
    direct_limit: int = 10,
    group_limit: int = 5,
    messages_since: str | None = None,
    messages_per_conversation: int = 100,
) -> dict[str, Any]:
    """
    Lee el estado mínimo necesario de Chat al finalizar login.

    La autorización de datos se ejecuta en la RPC SQL mediante auth.uid().
    user_id se conserva en la firma para mantener la convención de servicios
    autenticados de Chat y para validación explícita del llamador.
    """
    if not str(user_id or "").strip():
        raise ChatConversationAccessError(
            "A valid authenticated user is required."
        )

    try:
        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "get_chat_bootstrap",
                {
                    "p_direct_limit": int(direct_limit),
                    "p_group_limit": int(group_limit),
                    "p_messages_since": messages_since,
                    "p_messages_per_conversation": int(
                        messages_per_conversation
                    ),
                },
            )
            .execute()
        )

        return _normalize_bootstrap_payload(
            _response_data(response),
        )

    except (
        ChatConversationAccessError,
        ChatError,
    ):
        raise

    except Exception as error:
        _raise_sync_error(
            error=error,
            operation="retrieve chat bootstrap",
        )


def get_chat_sync_changes(
    *,
    user_id: str,
    access_token: str,
    after_event_sequence: int = 0,
    limit: int = 200,
) -> dict[str, Any]:
    """
    Lee únicamente eventos posteriores al cursor local del cliente.

    Debe invocarse en login, regreso a foreground, reconexión de red,
    recuperación posterior a push o reanudación de Realtime; nunca
    mediante polling periódico.
    """
    if not str(user_id or "").strip():
        raise ChatConversationAccessError(
            "A valid authenticated user is required."
        )

    try:
        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "get_chat_sync_changes",
                {
                    "p_after_event_sequence": int(
                        after_event_sequence
                    ),
                    "p_limit": int(limit),
                },
            )
            .execute()
        )

        return _normalize_sync_changes(
            rows=_response_rows(response),
            after_event_sequence=int(after_event_sequence),
        )

    except (
        ChatConversationAccessError,
        ChatError,
    ):
        raise

    except Exception as error:
        _raise_sync_error(
            error=error,
            operation="retrieve chat sync changes",
        )
