from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import get_supabase_admin_client


_QUERY_BATCH_SIZE = 100


def _rows(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)
    return (
        [row for row in data if isinstance(row, dict)]
        if isinstance(data, list)
        else []
    )


def _sequence(message: dict[str, Any] | None) -> int | None:
    if not message:
        return None
    value = message.get("sequence_number")
    if isinstance(value, bool):
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _message_time(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else None


def _eligible_recipient(
    participant: dict[str, Any],
    message: dict[str, Any],
) -> bool:
    joined = _message_time(participant.get("joined_at"))
    created = _message_time(message.get("created_at"))
    return (
        joined is not None
        and created is not None
        and joined.astimezone(timezone.utc)
        <= created.astimezone(timezone.utc)
    )


def _fetch_in_batches(
    client: Any,
    table: str,
    columns: str,
    field: str,
    ids: set[str],
    *,
    active_only: bool = False,
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    ordered = sorted(ids)
    for start in range(0, len(ordered), _QUERY_BATCH_SIZE):
        query = (
            client.table(table)
            .select(columns)
            .in_(field, ordered[start:start + _QUERY_BATCH_SIZE])
        )
        if active_only:
            query = query.is_("left_at", "null").is_(
                "removed_at", "null"
            )
        result.extend(_rows(query.execute()))
    return result


def attach_chat_inbox_receipts(
    inbox: dict[str, Any],
    identity_id: str,
) -> dict[str, Any]:
    conversations = [
        {**row, "last_message_receipt_status": "sent"}
        for row in inbox.get("conversations", [])
    ]
    result = {**inbox, "conversations": conversations}
    outgoing = [
        row for row in conversations
        if (row.get("id") or row.get("conversation_id"))
        and row.get("last_message_id")
        and str(row.get("last_message_sender_identity_id"))
        == str(identity_id)
    ]
    if not outgoing:
        return result

    conversation_ids = {
        str(row.get("id") or row.get("conversation_id"))
        for row in outgoing
    }
    client = get_supabase_admin_client()
    participants = _fetch_in_batches(
        client,
        "chat_conversation_participants",
        "conversation_id,identity_id,joined_at,left_at,"
        "removed_at,last_read_message_id,last_delivered_message_id",
        "conversation_id",
        conversation_ids,
        active_only=True,
    )
    participants = [
        p for p in participants
        if str(p.get("conversation_id")) in conversation_ids
    ]
    cursor_ids = {
        str(cursor)
        for participant in participants
        for cursor in (
            participant.get("last_read_message_id"),
            participant.get("last_delivered_message_id"),
        )
        if cursor
    }
    message_ids = cursor_ids | {
        str(row["last_message_id"]) for row in outgoing
    }
    messages = _fetch_in_batches(
        client,
        "chat_messages",
        "id,conversation_id,sequence_number,created_at",
        "id",
        message_ids,
    )
    by_id = {
        str(message["id"]): message
        for message in messages
        if message.get("id")
        and str(message.get("conversation_id")) in conversation_ids
    }

    for row in outgoing:
        conversation_id = str(
            row.get("id") or row.get("conversation_id")
        )
        last_message = by_id.get(str(row["last_message_id"]))
        if (
            not last_message
            or str(last_message.get("conversation_id"))
            != conversation_id
        ):
            continue
        sequence = _sequence(last_message)
        if sequence is None:
            continue
        recipients = [
            p for p in participants
            if str(p.get("conversation_id")) == conversation_id
            and str(p.get("identity_id")) != str(identity_id)
            and _eligible_recipient(p, last_message)
        ]
        if not recipients:
            continue

        def cursor_sequence(
            participant: dict[str, Any],
            field: str,
        ) -> int:
            cursor = participant.get(field)
            record = by_id.get(str(cursor)) if cursor else None
            if (
                not record
                or str(record.get("conversation_id"))
                != conversation_id
            ):
                return 0
            return _sequence(record) or 0

        if all(
            cursor_sequence(p, "last_read_message_id") >= sequence
            for p in recipients
        ):
            row["last_message_receipt_status"] = "read"
        elif all(
            max(
                cursor_sequence(p, "last_delivered_message_id"),
                cursor_sequence(p, "last_read_message_id"),
            ) >= sequence
            for p in recipients
        ):
            row["last_message_receipt_status"] = "delivered"

    return result
