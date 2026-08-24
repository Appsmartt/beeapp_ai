from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
    get_supabase_admin_client,
)

from apps.chat.exceptions import (
    ChatIdentityError,
    ChatIdentityNotFoundError,
)


CHAT_IDENTITY_COLUMNS = (
    "id,owner_id,identity_type,profile_id,"
    "commercial_profile_id,is_active,created_at,updated_at"
)

PROFILE_COLUMNS = (
    "id,first_name,last_name"
)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,display_name,logo_file_id,is_public,"
    "is_available,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _extract_first_row(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def sync_chat_identities_for_user(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    """
    Crea o reactiva la identidad privada y todas las identidades
    comerciales del usuario mediante la RPC de Supabase.

    La función SQL debe existir con esta firma:

    public.sync_chat_identities_for_user(
        p_user_id uuid default auth.uid()
    )
    """
    try:
        execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "sync_chat_identities_for_user",
                    {
                        "p_user_id": str(user_id),
                    },
                )
                .execute()
            ),
        )

        return list_chat_identities(
            user_id=user_id,
            active_only=True,
        )

    except ChatIdentityError:
        raise

    except Exception as error:
        message = str(error)

        if "PROFILE_NOT_FOUND" in message:
            raise ChatIdentityNotFoundError(
                "BeeApp profile was not found."
            ) from error

        if (
            "Could not find the function"
            in message
            or "function public.sync_chat_identities_for_user"
            in message
            or "PGRST202" in message
        ):
            raise ChatIdentityError(
                "Chat identity synchronization RPC was not found. "
                "Verify public.sync_chat_identities_for_user exists "
                "in the connected Supabase project."
            ) from error

        raise ChatIdentityError(
            "Could not synchronize chat identities. "
            f"Supabase detail: {message}"
        ) from error


def list_chat_identities(
    *,
    user_id: str,
    active_only: bool = True,
) -> list[dict[str, Any]]:
    """
    Devuelve únicamente las identidades administradas por user_id.

    La respuesta se enriquece con:
    - nombre del profile privado;
    - display_name y logo_file_id del perfil comercial.
    """
    try:
        def fetch_identities():
            def operation(client):
                query = (
                    client
                    .table("chat_identities")
                    .select(CHAT_IDENTITY_COLUMNS)
                    .eq("owner_id", str(user_id))
                    .order("created_at")
                )

                if active_only:
                    query = query.eq("is_active", True)

                return query.execute()

            return execute_with_supabase_admin_retry(
                operation,
            )

        identities_response = fetch_identities()
        identities = _response_rows(identities_response)

        if not identities:
            return []

        profile_ids = [
            identity["profile_id"]
            for identity in identities
            if identity.get("profile_id")
        ]

        commercial_profile_ids = [
            identity["commercial_profile_id"]
            for identity in identities
            if identity.get("commercial_profile_id")
        ]

        profiles_by_id = _get_profiles_by_ids(profile_ids)
        commercial_profiles_by_id = (
            _get_commercial_profiles_by_ids(
                commercial_profile_ids
            )
        )

        return [
            _serialize_chat_identity(
                identity=identity,
                profile=profiles_by_id.get(
                    identity.get("profile_id")
                ),
                commercial_profile=(
                    commercial_profiles_by_id.get(
                        identity.get("commercial_profile_id")
                    )
                ),
            )
            for identity in identities
        ]

    except ChatIdentityError:
        raise

    except Exception as error:
        raise ChatIdentityError(
            "Could not retrieve chat identities."
        ) from error


def get_owned_chat_identity(
    *,
    user_id: str,
    identity_id: str,
    require_active: bool = True,
) -> dict[str, Any]:
    """
    Obtiene una identidad siempre que pertenezca al usuario autenticado.
    """
    try:
        def operation(client):
            query = (
                client
                .table("chat_identities")
                .select(CHAT_IDENTITY_COLUMNS)
                .eq("id", str(identity_id))
                .eq("owner_id", str(user_id))
            )

            if require_active:
                query = query.eq("is_active", True)

            return query.maybe_single().execute()

        response = execute_with_supabase_admin_retry(
            operation,
        )

        identity = _extract_first_row(response)

        if not identity:
            raise ChatIdentityNotFoundError(
                "Chat identity was not found or is unavailable."
            )

        profile = None
        commercial_profile = None

        if identity.get("profile_id"):
            profile = _get_profiles_by_ids(
                [identity["profile_id"]]
            ).get(identity["profile_id"])

        if identity.get("commercial_profile_id"):
            commercial_profile = (
                _get_commercial_profiles_by_ids(
                    [identity["commercial_profile_id"]]
                ).get(identity["commercial_profile_id"])
            )

        return _serialize_chat_identity(
            identity=identity,
            profile=profile,
            commercial_profile=commercial_profile,
        )

    except ChatIdentityNotFoundError:
        raise

    except Exception as error:
        raise ChatIdentityNotFoundError(
            "Could not retrieve chat identity."
        ) from error


def get_chat_identity(
    *,
    identity_id: str,
    require_active: bool = True,
) -> dict[str, Any]:
    """
    Obtiene una identidad pública mínima para mostrar destinatarios,
    participantes y contrapartes de chat.

    No expone owner_id como dato de presentación.
    """
    try:
        def operation(client):
            query = (
                client
                .table("chat_identities")
                .select(CHAT_IDENTITY_COLUMNS)
                .eq("id", str(identity_id))
            )

            if require_active:
                query = query.eq("is_active", True)

            return query.maybe_single().execute()

        response = execute_with_supabase_admin_retry(
            operation,
        )

        identity = _extract_first_row(response)

        if not identity:
            raise ChatIdentityNotFoundError(
                "Chat identity was not found or is unavailable."
            )

        profile = None
        commercial_profile = None

        if identity.get("profile_id"):
            profile = _get_profiles_by_ids(
                [identity["profile_id"]]
            ).get(identity["profile_id"])

        if identity.get("commercial_profile_id"):
            commercial_profile = (
                _get_commercial_profiles_by_ids(
                    [identity["commercial_profile_id"]]
                ).get(identity["commercial_profile_id"])
            )

        return _serialize_chat_identity(
            identity=identity,
            profile=profile,
            commercial_profile=commercial_profile,
        )

    except ChatIdentityNotFoundError:
        raise

    except Exception as error:
        raise ChatIdentityNotFoundError(
            "Could not retrieve chat identity."
        ) from error


def _get_profiles_by_ids(
    profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not profile_ids:
        return {}

    response = execute_with_supabase_admin_retry(
        lambda client: (
            client
            .table("profile")
            .select(PROFILE_COLUMNS)
            .in_("id", profile_ids)
            .execute()
        ),
    )

    return {
        profile["id"]: profile
        for profile in _response_rows(response)
    }


def _get_commercial_profiles_by_ids(
    commercial_profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not commercial_profile_ids:
        return {}

    response = execute_with_supabase_admin_retry(
        lambda client: (
            client
            .table("commercial_profiles")
            .select(COMMERCIAL_PROFILE_COLUMNS)
            .in_("id", commercial_profile_ids)
            .execute()
        ),
    )

    return {
        profile["id"]: profile
        for profile in _response_rows(response)
    }


def _serialize_chat_identity(
    *,
    identity: dict[str, Any],
    profile: dict[str, Any] | None,
    commercial_profile: dict[str, Any] | None,
) -> dict[str, Any]:
    identity_type = identity.get("identity_type")

    if identity_type == "profile":
        first_name = (
            profile.get("first_name", "")
            if profile
            else ""
        )
        last_name = (
            profile.get("last_name", "")
            if profile
            else ""
        )

        display_name = " ".join(
            value
            for value in (
                first_name.strip(),
                last_name.strip(),
            )
            if value
        ).strip() or "Usuario BeeApp"

        avatar_file_id = None
        is_available = True
    else:
        display_name = (
            commercial_profile.get("display_name")
            if commercial_profile
            else None
        ) or "Negocio BeeApp"

        avatar_file_id = (
            commercial_profile.get("logo_file_id")
            if commercial_profile
            else None
        )

        is_available = bool(
            commercial_profile
            and commercial_profile.get(
                "is_available",
                True,
            )
        )

    return {
        "id": identity["id"],
        "identity_type": identity_type,
        "profile_id": identity.get("profile_id"),
        "commercial_profile_id": identity.get(
            "commercial_profile_id"
        ),
        "display_name": display_name,
        "avatar_file_id": avatar_file_id,
        "is_active": bool(identity.get("is_active")),
        "is_available": is_available,
        "created_at": identity.get("created_at"),
        "updated_at": identity.get("updated_at"),
    }
