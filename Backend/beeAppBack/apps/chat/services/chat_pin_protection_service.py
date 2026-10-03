from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.services.account_security_pin_service import (
    account_security_pin_is_configured,
    verify_account_security_pin,
)
from apps.chat.services.chat_conversation import (
    get_conversation,
)


class ChatPinProtectionError(Exception):
    pass


def _require_membership(*, user_id: str, conversation_id: str) -> None:
    get_conversation(
        user_id=user_id,
        conversation_id=conversation_id,
        include_participants=False,
    )


def list_protected_chat_ids(*, user_id: str) -> list[str]:
    try:
        client = get_supabase_admin_client()
        identifiers = []
        offset = 0
        page_size = 500

        while True:
            response = (
                client.table("chat_pin_protections")
                .select("conversation_id")
                .eq("user_id", user_id)
                .order("conversation_id")
                .range(offset, offset + page_size - 1)
                .execute()
            )
            rows = response.data or []
            identifiers.extend(
                str(row["conversation_id"]) for row in rows
            )
            if len(rows) < page_size:
                return identifiers
            offset += page_size
    except Exception as error:
        raise ChatPinProtectionError(
            "Could not list protected chats."
        ) from error


def is_chat_pin_protected(
    *, user_id: str, conversation_id: str
) -> bool:
    _require_membership(
        user_id=user_id, conversation_id=conversation_id
    )
    try:
        response = (
            get_supabase_admin_client()
            .table("chat_pin_protections")
            .select("conversation_id")
            .eq("user_id", user_id)
            .eq("conversation_id", conversation_id)
            .limit(1)
            .execute()
        )
        return bool(response.data)
    except Exception as error:
        raise ChatPinProtectionError(
            "Could not read chat protection."
        ) from error


def protect_chat_with_pin(
    *, user_id: str, conversation_id: str
) -> str:
    _require_membership(
        user_id=user_id, conversation_id=conversation_id
    )
    if not account_security_pin_is_configured(user_id=user_id):
        return "pin_required"
    try:
        (
            get_supabase_admin_client()
            .table("chat_pin_protections")
            .upsert(
                {
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                },
                on_conflict="user_id,conversation_id",
                ignore_duplicates=True,
            )
            .execute()
        )
        return "protected"
    except Exception as error:
        raise ChatPinProtectionError(
            "Could not protect chat."
        ) from error


def remove_chat_pin_protection(
    *, user_id: str, conversation_id: str, pin: str
) -> str:
    _require_membership(
        user_id=user_id, conversation_id=conversation_id
    )
    result = verify_account_security_pin(
        user_id=user_id, pin=pin
    )
    if result != "verified":
        return result
    try:
        (
            get_supabase_admin_client()
            .table("chat_pin_protections")
            .delete()
            .eq("user_id", user_id)
            .eq("conversation_id", conversation_id)
            .execute()
        )
        return "removed"
    except Exception as error:
        raise ChatPinProtectionError(
            "Could not remove chat protection."
        ) from error
