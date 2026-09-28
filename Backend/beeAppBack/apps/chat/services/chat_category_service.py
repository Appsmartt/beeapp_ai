from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
)
from apps.chat.services.chat_identity_service import get_owned_chat_identity
from apps.chat.services.chat_supabase_service import get_chat_user_supabase_client
from beeAppBack.core.supabase_client import get_supabase_admin_client


def _client(access_token):
    return get_chat_user_supabase_client(access_token=access_token)


def _require_identity(user_id, identity_id):
    get_owned_chat_identity(user_id=user_id, identity_id=identity_id)


def _require_participant(user_id, identity_id, conversation_id):
    _require_identity(user_id, identity_id)
    response = (
        get_supabase_admin_client()
        .table("chat_conversation_participants")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("identity_id", identity_id)
        .is_("left_at", "null")
        .is_("removed_at", "null")
        .limit(1)
        .execute()
    )
    if not response.data:
        raise ChatConversationNotFoundError(
            "Conversation was not found or is inaccessible."
        )


def list_chat_categories(*, user_id, access_token, identity_id):
    _require_identity(user_id, identity_id)
    response = (
        _client(access_token)
        .table("chat_categories")
        .select("id,name,icon,color,created_at")
        .eq("owner_id", user_id)
        .eq("identity_id", identity_id)
        .order("created_at")
        .limit(100)
        .execute()
    )
    return response.data or []


def create_chat_category(*, user_id, access_token, identity_id, name, icon, color):
    _require_identity(user_id, identity_id)
    existing = list_chat_categories(
        user_id=user_id,
        access_token=access_token,
        identity_id=identity_id,
    )
    if len(existing) >= 100:
        raise ValueError("No puedes crear más de 100 categorías.")
    response = (
        _client(access_token)
        .table("chat_categories")
        .insert({
            "owner_id": user_id,
            "identity_id": identity_id,
            "name": name.strip(),
            "icon": icon,
            "color": color,
        })
        .execute()
    )
    if not response.data:
        raise ChatConversationAccessError("Category could not be created.")
    return response.data[0]


def delete_chat_category(*, user_id, access_token, identity_id, category_id):
    _require_identity(user_id, identity_id)
    response = (
        _client(access_token)
        .table("chat_categories")
        .delete()
        .eq("id", category_id)
        .eq("owner_id", user_id)
        .eq("identity_id", identity_id)
        .execute()
    )
    if not response.data:
        raise ChatConversationNotFoundError("Category was not found.")


def list_chat_category_assignments(
    *, user_id, access_token, identity_id, conversation_ids
):
    _require_identity(user_id, identity_id)
    if not conversation_ids:
        return []
    response = (
        _client(access_token)
        .table("chat_category_assignments")
        .select("conversation_id,category_id")
        .eq("owner_id", user_id)
        .eq("identity_id", identity_id)
        .in_("conversation_id", conversation_ids)
        .limit(2000)
        .execute()
    )
    return response.data or []


def set_chat_categories(
    *, user_id, access_token, identity_id, conversation_id, category_ids
):
    _require_participant(user_id, identity_id, conversation_id)
    _client(access_token).rpc(
        "set_chat_conversation_categories",
        {
            "p_identity_id": identity_id,
            "p_conversation_id": conversation_id,
            "p_category_ids": category_ids,
        },
    ).execute()
    return [
        row["category_id"]
        for row in list_chat_category_assignments(
            user_id=user_id,
            access_token=access_token,
            identity_id=identity_id,
            conversation_ids=[conversation_id],
        )
    ]
