from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialProfileNotFoundError,
)


COMMERCIAL_PROFILE_OWNER_COLUMNS = (
    "id,owner_id,is_public,is_available,publication_status,"
    "verification_status,archived_at,suspended_at"
)

COMMERCE_REQUEST_OWNER_COLUMNS = (
    "id,client_id,commercial_profile_id,status,request_type,"
    "expires_at"
)


def _extract_first_row(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    return data if isinstance(data, dict) else None


def get_commercial_profile(
    *,
    commercial_profile_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commercial_profiles")
                .select(COMMERCIAL_PROFILE_OWNER_COLUMNS)
                .eq("id", str(commercial_profile_id))
                .maybe_single()
                .execute()
            )
        )

        profile = _extract_first_row(response)

        if not profile:
            raise CommercialProfileNotFoundError(
                "Commercial profile was not found."
            )

        return profile

    except CommercialProfileNotFoundError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not verify commercial profile access.",
            code="COMMERCIAL_PROFILE_LOOKUP_FAILED",
        ) from error


def require_commercial_profile_owner(
    *,
    user_id: str,
    commercial_profile_id: str,
) -> dict[str, Any]:
    profile = get_commercial_profile(
        commercial_profile_id=str(commercial_profile_id),
    )

    if str(profile.get("owner_id")) != str(user_id):
        raise CommercialAccessError(
            "You cannot manage this commercial profile.",
            code="COMMERCIAL_PROFILE_NOT_OWNED_BY_USER",
            details={
                "commercial_profile_id": str(
                    commercial_profile_id
                ),
            },
        )

    return profile


def get_commerce_request(
    *,
    commerce_request_id: str,
) -> dict[str, Any]:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table("commerce_requests")
                .select(COMMERCE_REQUEST_OWNER_COLUMNS)
                .eq("id", str(commerce_request_id))
                .maybe_single()
                .execute()
            )
        )

        request_row = _extract_first_row(response)

        if not request_row:
            raise CommercialNotFoundError(
                "Commercial request was not found.",
                code="COMMERCE_REQUEST_NOT_FOUND",
            )

        return request_row

    except CommercialNotFoundError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not verify commercial request access.",
            code="COMMERCE_REQUEST_LOOKUP_FAILED",
        ) from error


def require_commerce_request_customer(
    *,
    user_id: str,
    commerce_request_id: str,
) -> dict[str, Any]:
    request_row = get_commerce_request(
        commerce_request_id=str(commerce_request_id),
    )

    if str(request_row.get("client_id")) != str(user_id):
        raise CommercialAccessError(
            "You cannot access this commercial request as customer.",
            code="COMMERCE_REQUEST_CUSTOMER_REQUIRED",
            details={
                "commerce_request_id": str(
                    commerce_request_id
                ),
            },
        )

    return request_row


def require_commerce_request_owner(
    *,
    user_id: str,
    commerce_request_id: str,
    commercial_profile_id: str | None = None,
) -> dict[str, Any]:
    request_row = get_commerce_request(
        commerce_request_id=str(commerce_request_id),
    )

    request_profile_id = str(
        request_row.get("commercial_profile_id") or ""
    )

    if (
        commercial_profile_id is not None
        and request_profile_id != str(commercial_profile_id)
    ):
        raise CommercialAccessError(
            "The commercial request does not belong to this profile.",
            code="COMMERCE_REQUEST_PROFILE_MISMATCH",
            details={
                "commerce_request_id": str(
                    commerce_request_id
                ),
                "commercial_profile_id": str(
                    commercial_profile_id
                ),
            },
        )

    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=request_profile_id,
    )

    return request_row


def require_commerce_request_party(
    *,
    user_id: str,
    commerce_request_id: str,
) -> dict[str, Any]:
    request_row = get_commerce_request(
        commerce_request_id=str(commerce_request_id),
    )

    if str(request_row.get("client_id")) == str(user_id):
        return request_row

    try:
        require_commercial_profile_owner(
            user_id=str(user_id),
            commercial_profile_id=str(
                request_row["commercial_profile_id"]
            ),
        )
    except CommercialAccessError as error:
        raise CommercialAccessError(
            "You cannot access this commercial request.",
            code="COMMERCE_REQUEST_PARTY_REQUIRED",
            details={
                "commerce_request_id": str(
                    commerce_request_id
                ),
            },
        ) from error

    return request_row


def require_commercial_child_profile(
    *,
    user_id: str,
    commercial_profile_id: str,
    child_table: str,
    child_id: str,
    profile_column: str = "commercial_profile_id",
) -> dict[str, Any]:
    """
    Validates a child record belongs to the specified owned profile.

    child_table and profile_column are internal constants supplied by
    backend services only; they must never come from HTTP input.
    """
    require_commercial_profile_owner(
        user_id=str(user_id),
        commercial_profile_id=str(commercial_profile_id),
    )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client.table(child_table)
                .select(f"id,{profile_column}")
                .eq("id", str(child_id))
                .eq(profile_column, str(commercial_profile_id))
                .maybe_single()
                .execute()
            )
        )

        child = _extract_first_row(response)

        if not child:
            raise CommercialNotFoundError(
                "Commercial resource was not found.",
                code="COMMERCIAL_CHILD_NOT_FOUND",
            )

        return child

    except CommercialNotFoundError:
        raise

    except Exception as error:
        raise CommercialOperationError(
            "Could not verify commercial resource ownership.",
            code="COMMERCIAL_CHILD_LOOKUP_FAILED",
        ) from error


def require_admin_permission(
    *,
    user_id: str,
    capability: str,
) -> None:
    """
    Punto único de autorización administrativa comercial.

    Por seguridad niega acceso hasta que se conecte con el mecanismo
    real de roles/capacidades de BeeApp en Supabase. BACK-04 no debe
    exponer revisión de verificaciones ni suspensión administrativa
    usando solo un flag enviado por el cliente.
    """
    normalized_capability = str(capability or "").strip()

    if not normalized_capability:
        raise CommercialAccessError(
            "An administrative capability is required.",
            code="COMMERCIAL_ADMIN_CAPABILITY_REQUIRED",
        )

    raise CommercialAccessError(
        "Administrative permission is not configured.",
        code="COMMERCIAL_ADMIN_PERMISSION_NOT_CONFIGURED",
        details={
            "capability": normalized_capability,
            "user_id": str(user_id),
        },
    )
