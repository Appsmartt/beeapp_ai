from __future__ import annotations

from typing import Any, TypedDict

from apps.chat.services.chat_conversation_service import create_or_get_direct_conversation
from apps.chat.services.chat_identity_service import sync_chat_identities_for_user
from apps.commercial.exceptions import CommercialAccessError, CommercialNotFoundError
from apps.commercial.services.commercial_supabase_service import get_commercial_user_supabase_client


class CommercialChatIdentityContext(TypedDict):
    commercial_profile: dict[str, Any]
    client_identity: dict[str, Any]
    commercial_identity: dict[str, Any]


def _find_profile_chat_identity(
    identities: list[dict[str, Any]],
    profile_id: str,
) -> dict[str, Any] | None:
    return next(
        (
            identity
            for identity in identities
            if identity.get("identity_type") == "profile"
            and str(identity.get("profile_id")) == str(profile_id)
        ),
        None,
    )


def _find_commercial_chat_identity(
    identities: list[dict[str, Any]],
    commercial_profile_id: str,
) -> dict[str, Any] | None:
    return next(
        (
            identity
            for identity in identities
            if identity.get("identity_type") == "commercial_profile"
            and str(identity.get("commercial_profile_id"))
            == str(commercial_profile_id)
        ),
        None,
    )


def resolve_commercial_chat_identity_context(
    *,
    access_token: str,
    client_profile_id: str,
    commercial_profile_id: str,
) -> CommercialChatIdentityContext:
    client = get_commercial_user_supabase_client(
        access_token=access_token,
    )
    response = (
        client.table("commercial_profiles")
        .select(
            "id, owner_id, is_public, is_available, "
            "publication_status, archived_at"
        )
        .eq("id", str(commercial_profile_id))
        .maybe_single()
        .execute()
    )
    commercial_profile = response.data

    if not commercial_profile:
        raise CommercialNotFoundError(
            "El negocio comercial no existe."
        )

    if (
        commercial_profile.get("archived_at") is not None
        or not commercial_profile.get("is_public")
        or not commercial_profile.get("is_available")
        or commercial_profile.get("publication_status") != "published"
    ):
        raise CommercialNotFoundError(
            "El negocio comercial no está disponible."
        )

    owner_profile_id = str(commercial_profile["owner_id"])
    if owner_profile_id == str(client_profile_id):
        raise CommercialAccessError(
            "No puedes iniciar una conversación comercial con tu propio negocio."
        )

    client_identities = sync_chat_identities_for_user(
        user_id=str(client_profile_id),
    )
    owner_identities = sync_chat_identities_for_user(
        user_id=owner_profile_id,
    )

    client_identity = _find_profile_chat_identity(
        identities=client_identities,
        profile_id=str(client_profile_id),
    )
    commercial_identity = _find_commercial_chat_identity(
        identities=owner_identities,
        commercial_profile_id=str(commercial_profile_id),
    )

    if not client_identity or not commercial_identity:
        raise CommercialNotFoundError(
            "No fue posible resolver las identidades de chat del negocio."
        )

    return {
        "commercial_profile": commercial_profile,
        "client_identity": client_identity,
        "commercial_identity": commercial_identity,
    }


def find_existing_commercial_chat_conversation(
    *,
    access_token: str,
    client_profile_id: str,
    commercial_profile_id: str,
) -> dict[str, Any] | None:
    client = get_commercial_user_supabase_client(
        access_token=access_token,
    )
    response = (
        client.table("commerce_chat_conversations")
        .select(
        "conversation_id, commercial_profile_id, client_profile_id, "
        "created_by_profile_id, created_at, updated_at"
        )
        .eq("client_profile_id", str(client_profile_id))
        .eq("commercial_profile_id", str(commercial_profile_id))
        .maybe_single()
        .execute()
    )
    return response.data


COMMERCIAL_CHAT_UNIQUE_CONSTRAINT = (
    "commerce_chat_conversations_unique_business_client"
)


def _is_existing_commercial_chat_link_conflict(error: Exception) -> bool:
    message = str(error)
    return (
        COMMERCIAL_CHAT_UNIQUE_CONSTRAINT in message
        or (
            "23505" in message
            and "commerce_chat_conversations" in message
        )
    )


def open_or_create_commercial_chat_conversation(
    *,
    access_token: str,
    client_profile_id: str,
    commercial_profile_id: str,
) -> dict[str, Any]:
    existing_link = find_existing_commercial_chat_conversation(
        access_token=access_token,
        client_profile_id=client_profile_id,
        commercial_profile_id=commercial_profile_id,
    )
    if existing_link:
        return {
            "conversation_id": existing_link["conversation_id"],
            "commercial_profile_id": existing_link["commercial_profile_id"],
            "client_profile_id": existing_link["client_profile_id"],
            "created": False,
        }

    context = resolve_commercial_chat_identity_context(
        access_token=access_token,
        client_profile_id=client_profile_id,
        commercial_profile_id=commercial_profile_id,
    )
    chat_result = create_or_get_direct_conversation(
        user_id=str(client_profile_id),
        access_token=access_token,
        sender_identity_id=context["client_identity"]["id"],
        recipient_identity_id=context["commercial_identity"]["id"],
    )
    conversation_id = str(chat_result["conversation"]["id"])

    client = get_commercial_user_supabase_client(
        access_token=access_token,
    )
    try:
        client.table("commerce_chat_conversations").insert(
            {
                "conversation_id": conversation_id,
                "commercial_profile_id": str(commercial_profile_id),
                "client_profile_id": str(client_profile_id),
                "created_by_profile_id": str(client_profile_id),
            }
        ).execute()
    except Exception as error:
        if not _is_existing_commercial_chat_link_conflict(error):
            raise

        existing_link = find_existing_commercial_chat_conversation(
            access_token=access_token,
            client_profile_id=client_profile_id,
            commercial_profile_id=commercial_profile_id,
        )
        if not existing_link:
            raise
        return {
            "conversation_id": existing_link["conversation_id"],
            "commercial_profile_id": existing_link["commercial_profile_id"],
            "client_profile_id": existing_link["client_profile_id"],
            "created": False,
        }

    return {
        "conversation_id": conversation_id,
        "commercial_profile_id": str(commercial_profile_id),
        "client_profile_id": str(client_profile_id),
        "created": bool(chat_result.get("created")),
    }
