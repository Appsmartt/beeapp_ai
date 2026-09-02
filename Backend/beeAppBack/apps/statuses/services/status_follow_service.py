from __future__ import annotations

import logging
from typing import Any

from postgrest import CountMethod

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.statuses.exceptions import (
    StatusFollowAccessError,
    StatusFollowError,
    StatusFollowNotFoundError,
    StatusFollowValidationError,
)


FOLLOW_COLUMNS = (
    "id,follower_profile_id,target_actor_type,target_profile_id,"
    "target_commercial_profile_id,state,requested_at,responded_at,"
    "accepted_at,rejected_at,created_at,updated_at"
)

PROFILE_COLUMNS = "id,first_name,last_name"


logger = logging.getLogger(__name__)

COMMERCIAL_PROFILE_COLUMNS = (
    "id,owner_id,display_name,logo_file_id,is_public,is_available"
)


def request_follow(
    *,
    user_id: str,
    target_actor_type: str,
    target_profile_id: str | None = None,
    target_commercial_profile_id: str | None = None,
) -> dict[str, Any]:
    """
    Crea una solicitud para un perfil personal o sigue de inmediato
    un perfil comercial.

    El user_id viene exclusivamente de get_authenticated_user(request);
    el cliente nunca puede sustituirlo con un campo del payload.
    """
    normalized_type = _normalize_actor_type(target_actor_type)

    _validate_follow_target_payload(
        target_actor_type=normalized_type,
        target_profile_id=target_profile_id,
        target_commercial_profile_id=target_commercial_profile_id,
    )

    _validate_target_exists(
        target_actor_type=normalized_type,
        target_profile_id=target_profile_id,
        target_commercial_profile_id=target_commercial_profile_id,
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_request_follow",
                    {
                        "p_follower_profile_id": str(user_id),
                        "p_target_actor_type": normalized_type,
                        "p_target_profile_id": (
                            str(target_profile_id)
                            if target_profile_id
                            else None
                        ),
                        "p_target_commercial_profile_id": (
                            str(target_commercial_profile_id)
                            if target_commercial_profile_id
                            else None
                        ),
                    },
                )
                .execute()
            ),
        )

        follow = _extract_first_row(response)

        if not follow:
            raise StatusFollowError(
                "Supabase did not return the follow relationship."
            )

        return _serialize_follow(follow)

    except (
        StatusFollowError,
        StatusFollowNotFoundError,
        StatusFollowValidationError,
    ):
        raise

    except Exception as error:
        _raise_follow_rpc_error(error)


def accept_follow_request(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    """
    Acepta una solicitud pendiente dirigida al perfil personal del usuario.
    """
    _require_follow_response_owner(
        user_id=user_id,
        follow_id=follow_id,
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_accept_follow_request",
                    {
                        "p_target_owner_profile_id": str(user_id),
                        "p_follow_id": str(follow_id),
                    },
                )
                .execute()
            ),
        )

        follow = _extract_first_row(response)

        if not follow:
            raise StatusFollowError(
                "Supabase did not return the accepted follow request."
            )

        return _serialize_follow(follow)

    except (
        StatusFollowError,
        StatusFollowAccessError,
        StatusFollowNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_follow_rpc_error(error)


def reject_follow_request(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    """
    Rechaza una solicitud pendiente dirigida al perfil personal del usuario.
    """
    _require_follow_response_owner(
        user_id=user_id,
        follow_id=follow_id,
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_reject_follow_request",
                    {
                        "p_target_owner_profile_id": str(user_id),
                        "p_follow_id": str(follow_id),
                    },
                )
                .execute()
            ),
        )

        follow = _extract_first_row(response)

        if not follow:
            raise StatusFollowError(
                "Supabase did not return the rejected follow request."
            )

        return _serialize_follow(follow)

    except (
        StatusFollowError,
        StatusFollowAccessError,
        StatusFollowNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_follow_rpc_error(error)


def unfollow(
    *,
    user_id: str,
    follow_id: str,
) -> None:
    """
    Elimina una relación aceptada o cancela una solicitud pendiente.
    Solo puede hacerlo quien inició el seguimiento.
    """
    follow = _get_follow_by_id(follow_id=follow_id)

    if str(follow["follower_profile_id"]) != str(user_id):
        raise StatusFollowAccessError(
            "You cannot remove this follow relationship."
        )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_unfollow",
                    {
                        "p_follower_profile_id": str(user_id),
                        "p_follow_id": str(follow_id),
                    },
                )
                .execute()
            ),
        )

        if getattr(response, "data", None) is not True:
            raise StatusFollowError(
                "Follow relationship could not be removed."
            )

    except (
        StatusFollowError,
        StatusFollowAccessError,
        StatusFollowNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_follow_rpc_error(error)


def get_follow_for_user(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    """
    Consulta una relación solo para el seguidor o el dueño del objetivo.
    """
    follow = _get_follow_by_id(follow_id=follow_id)

    is_follower = (
        str(follow["follower_profile_id"]) == str(user_id)
    )

    is_personal_target_owner = (
        follow["target_actor_type"] == "profile"
        and str(follow["target_profile_id"]) == str(user_id)
    )

    is_commercial_target_owner = False

    if follow["target_actor_type"] == "commercial_profile":
        commercial = _get_commercial_profile(
            commercial_profile_id=follow[
                "target_commercial_profile_id"
            ]
        )
        is_commercial_target_owner = (
            str(commercial["owner_id"]) == str(user_id)
        )

    if not (
        is_follower
        or is_personal_target_owner
        or is_commercial_target_owner
    ):
        raise StatusFollowAccessError(
            "You cannot access this follow relationship."
        )

    return _serialize_follow(follow)


def _normalize_actor_type(value: str) -> str:
    normalized = str(value or "").strip()

    if normalized not in {
        "profile",
        "commercial_profile",
    }:
        raise StatusFollowValidationError(
            "target_actor_type must be profile or commercial_profile."
        )

    return normalized


def _validate_follow_target_payload(
    *,
    target_actor_type: str,
    target_profile_id: str | None,
    target_commercial_profile_id: str | None,
) -> None:
    if target_actor_type == "profile":
        if not target_profile_id or target_commercial_profile_id:
            raise StatusFollowValidationError(
                "A personal target_profile_id is required."
            )
        return

    if not target_commercial_profile_id or target_profile_id:
        raise StatusFollowValidationError(
            "A commercial target_commercial_profile_id is required."
        )


def _validate_target_exists(
    *,
    target_actor_type: str,
    target_profile_id: str | None,
    target_commercial_profile_id: str | None,
) -> None:
    if target_actor_type == "profile":
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("profile")
                .select("id")
                .eq("id", str(target_profile_id))
                .maybe_single()
                .execute()
            ),
        )

        if not _extract_first_row(response):
            raise StatusFollowNotFoundError(
                "The target profile was not found."
            )
        return

    commercial = _get_commercial_profile(
        commercial_profile_id=str(target_commercial_profile_id),
    )

    if not commercial.get("is_public", False):
        raise StatusFollowAccessError(
            "The commercial profile is not available for follows."
        )


def _require_follow_response_owner(
    *,
    user_id: str,
    follow_id: str,
) -> dict[str, Any]:
    follow = _get_follow_by_id(follow_id=follow_id)

    if follow["target_actor_type"] != "profile":
        raise StatusFollowValidationError(
            "Only personal follow requests can be answered."
        )

    if str(follow["target_profile_id"]) != str(user_id):
        raise StatusFollowAccessError(
            "You cannot respond to this follow request."
        )

    if follow["state"] != "pending":
        raise StatusFollowValidationError(
            "Only pending follow requests can be answered."
        )

    return follow


def _get_follow_by_id(
    *,
    follow_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("status_follows")
                .select(FOLLOW_COLUMNS)
                .eq("id", str(follow_id))
                .maybe_single()
                .execute()
            ),
        )

        follow = _extract_first_row(response)

        if not follow:
            raise StatusFollowNotFoundError(
                "Follow relationship was not found."
            )

        return follow

    except StatusFollowNotFoundError:
        raise

    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve follow relationship."
        ) from error


def _get_commercial_profile(
    *,
    commercial_profile_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select(COMMERCIAL_PROFILE_COLUMNS)
                .eq("id", str(commercial_profile_id))
                .maybe_single()
                .execute()
            ),
        )

        commercial = _extract_first_row(response)

        if not commercial:
            raise StatusFollowNotFoundError(
                "Commercial profile was not found."
            )

        return commercial

    except StatusFollowNotFoundError:
        raise

    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve commercial profile."
        ) from error


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


def _serialize_follow(
    follow: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": str(follow["id"]),
        "follower_profile_id": str(
            follow["follower_profile_id"]
        ),
        "target_actor_type": follow["target_actor_type"],
        "target_profile_id": (
            str(follow["target_profile_id"])
            if follow.get("target_profile_id")
            else None
        ),
        "target_commercial_profile_id": (
            str(follow["target_commercial_profile_id"])
            if follow.get("target_commercial_profile_id")
            else None
        ),
        "state": follow["state"],
        "requested_at": follow.get("requested_at"),
        "responded_at": follow.get("responded_at"),
        "accepted_at": follow.get("accepted_at"),
        "rejected_at": follow.get("rejected_at"),
        "created_at": follow.get("created_at"),
        "updated_at": follow.get("updated_at"),
    }


def _raise_follow_rpc_error(
    error: Exception,
) -> None:
    message = str(error)

    if (
        "STATUS_FOLLOW_NOT_FOUND"
        in message
        or "STATUS_FOLLOW_NOT_FOUND_OR_NOT_OWNED" in message
    ):
        raise StatusFollowNotFoundError(
            "Follow relationship was not found."
        ) from error

    if (
        "STATUS_FOLLOW_RESPONSE_REQUIRES_TARGET_OWNER"
        in message
        or "STATUS_CANNOT_FOLLOW_SELF" in message
        or "STATUS_CANNOT_FOLLOW_OWN_COMMERCIAL_PROFILE"
        in message
    ):
        raise StatusFollowAccessError(
            "You cannot perform this follow operation."
        ) from error

    if (
        "STATUS_PROFILE_TARGET_REQUIRED" in message
        or "STATUS_COMMERCIAL_TARGET_REQUIRED" in message
        or "STATUS_TARGET_ACTOR_TYPE_INVALID" in message
        or "STATUS_FOLLOW_NOT_PENDING" in message
    ):
        raise StatusFollowValidationError(
            "The follow operation is not valid in its current state."
        ) from error

    raise StatusFollowError(
        f"Could not complete follow operation: {message}"
    ) from error


def list_following(
    *,
    user_id: str,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    """
    Lista cuentas que el usuario autenticado sigue y cuyos estados puede ver.

    Solo devuelve relaciones accepted; las solicitudes pending no son
    seguimientos activos todavía.
    """
    return _list_and_serialize_follow_list(
        user_id=user_id,
        mode="following",
        actor_type=None,
        commercial_profile_id=None,
        target_profile_id=None,
        limit=limit,
        cursor=cursor,
    )


def list_followers(
    *,
    user_id: str,
    actor_type: str = "profile",
    commercial_profile_id: str | None = None,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    """
    Lista seguidores accepted del perfil personal autenticado o de un
    perfil comercial administrado por el usuario autenticado.
    """
    normalized_actor_type = _normalize_actor_type(actor_type)

    if normalized_actor_type == "profile":
        target_profile_id = str(user_id)
        target_commercial_profile_id = None
    else:
        commercial = _get_commercial_profile(
            commercial_profile_id=str(commercial_profile_id),
        )

        if str(commercial["owner_id"]) != str(user_id):
            raise StatusFollowAccessError(
                "You cannot access followers of this commercial profile."
            )

        target_profile_id = None
        target_commercial_profile_id = str(
            commercial_profile_id
        )

    return _list_and_serialize_follow_list(
        user_id=user_id,
        mode="followers",
        actor_type=normalized_actor_type,
        commercial_profile_id=target_commercial_profile_id,
        target_profile_id=target_profile_id,
        limit=limit,
        cursor=cursor,
    )


def list_received_follow_requests(
    *,
    user_id: str,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    """
    Lista solicitudes pending recibidas por el perfil personal del usuario.
    """
    return _list_and_serialize_follow_list(
        user_id=user_id,
        mode="requests",
        actor_type="profile",
        commercial_profile_id=None,
        target_profile_id=str(user_id),
        limit=limit,
        cursor=cursor,
    )


def _list_and_serialize_follow_list(
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    target_profile_id: str | None,
    limit: int,
    cursor: str | None,
) -> dict[str, Any]:
    total_count = _count_follow_rows(
        user_id=user_id,
        mode=mode,
        actor_type=actor_type,
        commercial_profile_id=commercial_profile_id,
        target_profile_id=target_profile_id,
    )

    rows = _list_follow_rows(
        user_id=user_id,
        mode=mode,
        actor_type=actor_type,
        commercial_profile_id=commercial_profile_id,
        target_profile_id=target_profile_id,
        limit=limit,
        cursor=cursor,
    )

    return _serialize_follow_list(
        rows=rows,
        mode=mode,
        limit=limit,
        count=total_count,
    )


def _apply_follow_list_filters(
    query,
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    target_profile_id: str | None,
):
    if mode == "following":
        return (
            query
            .eq("follower_profile_id", str(user_id))
            .eq("state", "accepted")
        )

    if mode == "followers":
        query = query.eq("state", "accepted")

        if actor_type == "profile":
            return query.eq(
                "target_profile_id",
                str(target_profile_id),
            )

        return query.eq(
            "target_commercial_profile_id",
            str(commercial_profile_id),
        )

    if mode == "requests":
        return (
            query
            .eq("target_actor_type", "profile")
            .eq("target_profile_id", str(target_profile_id))
            .eq("state", "pending")
        )

    raise StatusFollowValidationError(
        "Unsupported follow list mode."
    )


def _count_follow_rows(
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    target_profile_id: str | None,
) -> int:
    try:
        def operation(client):
            query = (
                client
                .table("status_follows")
                .select("id", count=CountMethod.exact)
            )

            return _apply_follow_list_filters(
                query,
                user_id=user_id,
                mode=mode,
                actor_type=actor_type,
                commercial_profile_id=commercial_profile_id,
                target_profile_id=target_profile_id,
            ).execute()

        response = execute_with_supabase_admin_retry(operation)
        return int(getattr(response, "count", 0) or 0)

    except StatusFollowValidationError:
        raise

    except Exception as error:
        logger.exception(
            "status_follow_count_failed mode=%s actor_type=%s "
            "target_profile_id=%s commercial_profile_id=%s "
            "error_type=%s error_message=%s",
            mode,
            actor_type,
            target_profile_id,
            commercial_profile_id,
            type(error).__name__,
            str(error),
        )
        raise StatusFollowError(
            f"Could not count follow relationships: {error}"
        ) from error


def _list_follow_rows(
    *,
    user_id: str,
    mode: str,
    actor_type: str | None,
    commercial_profile_id: str | None,
    limit: int,
    cursor: str | None,
    target_profile_id: str | None = None,
) -> list[dict[str, Any]]:
    normalized_limit = max(1, min(int(limit), 50))
    page_size = normalized_limit + 1

    try:
        def operation(client):
            query = (
                client
                .table("status_follows")
                .select(FOLLOW_COLUMNS)
                .order("requested_at", desc=True)
                .order("id", desc=True)
                .limit(page_size)
            )

            query = _apply_follow_list_filters(
                query,
                user_id=user_id,
                mode=mode,
                actor_type=actor_type,
                commercial_profile_id=commercial_profile_id,
                target_profile_id=target_profile_id,
            )

            if cursor:
                cursor_requested_at, cursor_follow_id = (
                    _parse_follow_cursor(cursor)
                )

                query = query.or_(
                    (
                        "requested_at.lt."
                        f"{cursor_requested_at},"
                        "and("
                        f"requested_at.eq.{cursor_requested_at},"
                        f"id.lt.{cursor_follow_id}"
                        ")"
                    )
                )

            return query.execute()

        response = execute_with_supabase_admin_retry(operation)
        return _response_rows(response)

    except StatusFollowValidationError:
        raise

    except Exception as error:
        logger.exception(
            "status_follow_list_failed mode=%s actor_type=%s "
            "target_profile_id=%s commercial_profile_id=%s "
            "cursor_present=%s",
            mode,
            actor_type,
            target_profile_id,
            commercial_profile_id,
            bool(cursor),
        )
        raise StatusFollowError(
            f"Could not retrieve follow relationships: {error}"
        ) from error


def _serialize_follow_list(
    *,
    rows: list[dict[str, Any]],
    mode: str,
    limit: int,
    count: int,
) -> dict[str, Any]:
    normalized_limit = max(1, min(int(limit), 50))
    has_next_page = len(rows) > normalized_limit
    page_rows = rows[:normalized_limit]

    profile_ids: list[str] = []
    commercial_profile_ids: list[str] = []

    for row in page_rows:
        if mode == "following":
            if row["target_actor_type"] == "profile":
                profile_ids.append(row["target_profile_id"])
            else:
                commercial_profile_ids.append(
                    row["target_commercial_profile_id"]
                )
        else:
            profile_ids.append(row["follower_profile_id"])

    profiles_by_id = _get_profiles_for_follow_list(
        profile_ids=profile_ids,
    )

    commercials_by_id = _get_commercial_profiles_for_follow_list(
        commercial_profile_ids=commercial_profile_ids,
    )

    items: list[dict[str, Any]] = []

    for row in page_rows:
        target = _serialize_follow_list_target(
            row=row,
            mode=mode,
            profiles_by_id=profiles_by_id,
            commercials_by_id=commercials_by_id,
        )

        if target is None:
            continue

        items.append(
            {
                "id": str(row["id"]),
                "state": row["state"],
                "requested_at": row["requested_at"],
                "responded_at": row.get("responded_at"),
                "accepted_at": row.get("accepted_at"),
                "rejected_at": row.get("rejected_at"),
                "target": target,
            }
        )

    next_cursor = None

    if has_next_page and page_rows:
        last_row = page_rows[-1]
        next_cursor = (
            f"{last_row['requested_at']}|{last_row['id']}"
        )

    return {
        "items": items,
        "count": count,
        "limit": normalized_limit,
        "next_cursor": next_cursor,
    }


def _parse_follow_cursor(
    cursor: str,
) -> tuple[str, str]:
    try:
        requested_at, follow_id = cursor.rsplit("|", 1)

        if not requested_at.strip() or not follow_id.strip():
            raise ValueError

        return requested_at.strip(), follow_id.strip()

    except (AttributeError, ValueError) as error:
        raise StatusFollowValidationError(
            "Invalid follow cursor."
        ) from error


def _serialize_follow_list_target(
    *,
    row: dict[str, Any],
    mode: str,
    profiles_by_id: dict[str, dict[str, Any]],
    commercials_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    if mode == "following":
        if row["target_actor_type"] == "profile":
            profile = profiles_by_id.get(
                row["target_profile_id"]
            )

            if not profile:
                return None

            return {
                "actor_type": "profile",
                "profile_id": str(profile["id"]),
                "commercial_profile_id": None,
                "display_name": _display_name_for_profile(profile),
                "avatar_file_id": (
                    str(profile["avatar_file_id"])
                    if profile.get("avatar_file_id")
                    else None
                ),
                "is_available": True,
            }

        commercial = commercials_by_id.get(
            row["target_commercial_profile_id"]
        )

        if not commercial:
            return None

        return {
            "actor_type": "commercial_profile",
            "profile_id": None,
            "commercial_profile_id": str(commercial["id"]),
            "display_name": commercial["display_name"],
            "avatar_file_id": (
                str(commercial["logo_file_id"])
                if commercial.get("logo_file_id")
                else None
            ),
            "is_available": bool(
                commercial.get("is_available", False)
            ),
        }

    profile = profiles_by_id.get(row["follower_profile_id"])

    if not profile:
        return None

    return {
        "actor_type": "profile",
        "profile_id": str(profile["id"]),
        "commercial_profile_id": None,
        "display_name": _display_name_for_profile(profile),
        "avatar_file_id": (
            str(profile["avatar_file_id"])
            if profile.get("avatar_file_id")
            else None
        ),
        "is_available": True,
    }


def _get_profiles_for_follow_list(
    *,
    profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    normalized_ids = sorted(
        {
            str(profile_id)
            for profile_id in profile_ids
            if profile_id
        }
    )

    if not normalized_ids:
        return {}

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("profile")
                .select("id,first_name,last_name,avatar_file_id")
                .in_("id", normalized_ids)
                .execute()
            ),
        )

        return {
            str(profile["id"]): profile
            for profile in _response_rows(response)
            if profile.get("id")
        }

    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve profiles for follow list."
        ) from error


def _get_commercial_profiles_for_follow_list(
    *,
    commercial_profile_ids: list[str],
) -> dict[str, dict[str, Any]]:
    normalized_ids = sorted(
        {
            str(commercial_profile_id)
            for commercial_profile_id in commercial_profile_ids
            if commercial_profile_id
        }
    )

    if not normalized_ids:
        return {}

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select(
                    "id,display_name,logo_file_id,"
                    "is_public,is_available"
                )
                .in_("id", normalized_ids)
                .execute()
            ),
        )

        return {
            str(commercial["id"]): commercial
            for commercial in _response_rows(response)
            if commercial.get("id")
        }

    except Exception as error:
        raise StatusFollowError(
            "Could not retrieve commercial profiles for follow list."
        ) from error


def _display_name_for_profile(
    profile: dict[str, Any],
) -> str:
    return " ".join(
        part.strip()
        for part in (
            str(profile.get("first_name") or ""),
            str(profile.get("last_name") or ""),
        )
        if part and part.strip()
    ) or "Usuario"


def discover_follow_targets(
    *,
    user_id: str,
    query: str,
    limit: int = 20,
    cursor: str | None = None,
) -> dict[str, Any]:
    """
    Busca objetivos públicos de Estados mediante la RPC dedicada.

    Mantiene los criterios de Chat para nombre, correo y teléfono,
    pero no exige chat_identities ni usa is_available.
    """
    normalized_query = str(query or "").strip().lower()

    if len(normalized_query) < 2:
        raise StatusFollowValidationError(
            "Search query must contain at least 2 characters."
        )

    normalized_limit = max(1, min(int(limit), 20))
    normalized_cursor = str(cursor).strip() if cursor else None

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .rpc(
                    "status_discover_follow_targets",
                    {
                        "p_follower_profile_id": str(user_id),
                        "p_query": normalized_query,
                        "p_limit": normalized_limit,
                        "p_cursor": normalized_cursor,
                    },
                )
                .execute()
            ),
        )
        rows = _response_rows(response)
    except StatusFollowValidationError:
        raise
    except Exception as error:
        message = str(error)

        if "STATUS_DISCOVER_QUERY_TOO_SHORT" in message:
            raise StatusFollowValidationError(
                "Search query must contain at least 2 characters."
            ) from error

        if "STATUS_DISCOVER_CURSOR_INVALID" in message:
            raise StatusFollowValidationError(
                "Invalid discovery cursor."
            ) from error

        logger.exception(
            "status_follow_discover_failed user_id=%s "
            "cursor_present=%s",
            user_id,
            bool(normalized_cursor),
        )
        raise StatusFollowError(
            f"Could not discover follow targets: {message}"
        ) from error

    next_cursor = None

    if rows:
        next_cursor = rows[0].get("next_cursor")

    items = [
        {
            "actor_type": row["actor_type"],
            "profile_id": (
                str(row["profile_id"])
                if row.get("profile_id")
                else None
            ),
            "commercial_profile_id": (
                str(row["commercial_profile_id"])
                if row.get("commercial_profile_id")
                else None
            ),
            "display_name": row["display_name"],
            "avatar_file_id": (
                str(row["avatar_file_id"])
                if row.get("avatar_file_id")
                else None
            ),
            "follow_id": (
                str(row["follow_id"])
                if row.get("follow_id")
                else None
            ),
            "follow_state": row.get("follow_state"),
        }
        for row in rows
    ]

    return {
        "query": normalized_query,
        "limit": normalized_limit,
        "items": items,
        "next_cursor": next_cursor,
    }
