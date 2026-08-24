from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatIdentityNotFoundError,
)


CHAT_IDENTITY_COLUMNS = (
    "id,owner_id,identity_type,profile_id,"
    "commercial_profile_id,is_active"
)

PRIVATE_PROFILE_COLUMNS = (
    "id,first_name,last_name,occupation,location,"
    "avatar_file_id"
)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,display_name,logo_file_id,is_available"
)

SOCIAL_LINK_COLUMNS = "platform,url"


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _extract_first_row(
    response,
) -> dict[str, Any] | None:
    rows = _response_rows(response)
    return rows[0] if rows else None


def _public_display_name(
    *,
    first_name: Any,
    last_name: Any,
) -> str:
    return " ".join(
        value
        for value in (
            str(first_name or "").strip(),
            str(last_name or "").strip(),
        )
        if value
    ) or "Usuario BeeApp"


def _get_contact_identity(
    *,
    identity_id: str,
) -> dict[str, Any]:
    response = execute_with_supabase_admin_retry(
        lambda client: (
            client
            .table("chat_identities")
            .select(CHAT_IDENTITY_COLUMNS)
            .eq("id", str(identity_id))
            .eq("is_active", True)
            .maybe_single()
            .execute()
        ),
    )

    identity = _extract_first_row(response)

    if not identity:
        raise ChatIdentityNotFoundError(
            "Contact was not found."
        )

    return identity


def _require_shared_conversation_access(
    *,
    user_id: str,
    contact_identity_id: str,
) -> None:
    """
    El usuario puede consultar este perfil solo si tiene al menos una
    identidad activa que comparte una conversación activa con la
    identidad del contacto.

    Esta comprobación usa únicamente Chat y no modifica bootstrap,
    inbox, participantes ni sus RPCs.
    """
    own_identities_response = execute_with_supabase_admin_retry(
        lambda client: (
            client
            .table("chat_identities")
            .select("id")
            .eq("owner_id", str(user_id))
            .eq("is_active", True)
            .execute()
        ),
    )

    own_identity_ids = [
        str(identity["id"])
        for identity in _response_rows(
            own_identities_response,
        )
        if identity.get("id")
    ]

    if not own_identity_ids:
        raise ChatConversationAccessError(
            "Contact was not found."
        )

    own_participations_response = (
        execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("chat_conversation_participants")
                .select("conversation_id")
                .in_("identity_id", own_identity_ids)
                .is_("left_at", "null")
                .is_("removed_at", "null")
                .execute()
            ),
        )
    )

    conversation_ids = [
        str(participation["conversation_id"])
        for participation in _response_rows(
            own_participations_response,
        )
        if participation.get("conversation_id")
    ]

    if not conversation_ids:
        raise ChatConversationAccessError(
            "Contact was not found."
        )

    contact_participation_response = (
        execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("chat_conversation_participants")
                .select("id")
                .eq("identity_id", str(contact_identity_id))
                .in_("conversation_id", conversation_ids)
                .is_("left_at", "null")
                .is_("removed_at", "null")
                .limit(1)
                .execute()
            ),
        )
    )

    if not _extract_first_row(contact_participation_response):
        raise ChatConversationAccessError(
            "Contact was not found."
        )


def _get_social_links(
    *,
    profile_id: str,
) -> list[dict[str, str]]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("profile_social_links")
                .select(SOCIAL_LINK_COLUMNS)
                .eq("profile_id", str(profile_id))
                .order("platform")
                .execute()
            ),
        )

        return [
            {
                "platform": str(link["platform"]),
                "url": str(link["url"]),
            }
            for link in _response_rows(response)
            if link.get("platform") and link.get("url")
        ]
    except Exception:
        return []


def get_chat_contact_profile(
    *,
    user_id: str,
    identity_id: str,
) -> dict[str, Any]:
    """
    Perfil mínimo de una contraparte de Chat.

    Nunca retorna: email, teléfono, owner_id, bucket_id, storage_path,
    ni una URL firmada. avatar_file_id se resuelve en móvil mediante el
    endpoint existente y autenticado de Storage.
    """
    identity = _get_contact_identity(
        identity_id=str(identity_id),
    )

    _require_shared_conversation_access(
        user_id=str(user_id),
        contact_identity_id=str(identity_id),
    )

    identity_type = identity["identity_type"]

    if identity_type == "commercial_profile":
        commercial_profile_id = identity.get(
            "commercial_profile_id",
        )

        if not commercial_profile_id:
            raise ChatIdentityNotFoundError(
                "Contact was not found."
            )

        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select(COMMERCIAL_PROFILE_COLUMNS)
                .eq("id", str(commercial_profile_id))
                .eq("is_available", True)
                .maybe_single()
                .execute()
            ),
        )

        commercial_profile = _extract_first_row(response)

        if not commercial_profile:
            raise ChatIdentityNotFoundError(
                "Contact was not found."
            )

        return {
            "identity_id": identity["id"],
            "identity_type": "commercial_profile",
            "profile_id": None,
            "commercial_profile_id": commercial_profile["id"],
            "display_name": (
                commercial_profile.get("display_name")
                or "Negocio BeeApp"
            ),
            "occupation": None,
            "location": None,
            "social_links": [],
            "avatar_file_id": commercial_profile.get(
                "logo_file_id",
            ),
            "is_available": True,
        }

    profile_id = identity.get("profile_id")

    if not profile_id:
        raise ChatIdentityNotFoundError(
            "Contact was not found."
        )

    profile_response = execute_with_supabase_admin_retry(
        lambda client: (
            client
            .table("profile")
            .select(PRIVATE_PROFILE_COLUMNS)
            .eq("id", str(profile_id))
            .maybe_single()
            .execute()
        ),
    )

    profile = _extract_first_row(profile_response)

    if not profile:
        raise ChatIdentityNotFoundError(
            "Contact was not found."
        )

    return {
        "identity_id": identity["id"],
        "identity_type": "profile",
        "profile_id": profile["id"],
        "commercial_profile_id": None,
        "display_name": _public_display_name(
            first_name=profile.get("first_name"),
            last_name=profile.get("last_name"),
        ),
        "occupation": profile.get("occupation"),
        "location": profile.get("location"),
        "social_links": _get_social_links(
            profile_id=profile["id"],
        ),
        "avatar_file_id": profile.get("avatar_file_id"),
        "is_available": True,
    }
