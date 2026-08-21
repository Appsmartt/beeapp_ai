from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)


GOOGLE_MAIL_SCOPES = (
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
)

MICROSOFT_MAIL_SCOPES = (
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
)

MAIL_INTEGRATION_COLUMNS = (
    "id,user_id,integration_connection_id,provider,"
    "provider_account_id,provider_email,provider_display_name,"
    "status,connected_at,initial_sync_completed_at,"
    "initial_sync_started_at,last_successful_sync_at,"
    "last_attempted_sync_at,next_sync_at,sync_cursor,"
    "sync_cursor_updated_at,reauth_required_at,disconnected_at,"
    "last_error_code,last_error_message,metadata,"
    "created_at,updated_at"
)

SAFE_CONNECTION_COLUMNS = (
    "id,user_id,provider,provider_account_id,"
    "provider_tenant_id,provider_email,"
    "provider_display_name,provider_avatar_url,status,"
    "granted_scopes,capabilities,token_expires_at,"
    "last_token_refresh_at,last_successful_auth_at,"
    "reauth_required_at,disconnected_at,last_error_code,"
    "last_error_message,metadata,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_single(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_data(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized: list[str] = []

    for item in value:
        normalized_item = str(item).strip()

        if (
            normalized_item
            and normalized_item not in normalized
        ):
            normalized.append(normalized_item)

    return normalized


def _has_mail_capability(
    connection: dict[str, Any],
) -> bool:
    capabilities = _normalize_string_list(
        connection.get("capabilities")
    )

    return "mail" in capabilities


def _has_mail_scopes(
    *,
    provider: str,
    granted_scopes: list[str],
) -> bool:
    scopes = set(granted_scopes)

    if provider == "google":
        return (
            "https://www.googleapis.com/auth/gmail.modify"
            in scopes
        )

    if provider == "microsoft":
        return (
            "Mail.ReadWrite" in scopes
            and "Mail.Send" in scopes
        )

    return False


def _derive_mail_status(
    *,
    connection: dict[str, Any],
) -> tuple[str, str | None, str | None]:
    provider = str(connection.get("provider") or "")
    connection_status = str(connection.get("status") or "")
    granted_scopes = _normalize_string_list(
        connection.get("granted_scopes")
    )

    if connection_status == "disconnected":
        return (
            "disconnected",
            None,
            None,
        )

    if connection_status == "revoked":
        return (
            "reauth_required",
            connection.get("last_error_code") or "oauth_revoked",
            connection.get("last_error_message")
            or "El proveedor revocó el acceso a la cuenta.",
        )

    if connection_status == "reauth_required":
        return (
            "reauth_required",
            connection.get("last_error_code") or "reauth_required",
            connection.get("last_error_message")
            or "La cuenta requiere reconexión.",
        )

    if connection_status != "connected":
        return (
            "error",
            connection.get("last_error_code") or "oauth_unavailable",
            connection.get("last_error_message")
            or "La conexión OAuth no está disponible.",
        )

    if provider not in ("google", "microsoft"):
        return (
            "error",
            "unsupported_mail_provider",
            "El proveedor no es compatible con Email.",
        )

    if not _has_mail_capability(connection):
        return (
            "inactive",
            "mail_capability_not_enabled",
            "La cuenta no tiene habilitada la capacidad de Email.",
        )

    if not _has_mail_scopes(
        provider=provider,
        granted_scopes=granted_scopes,
    ):
        return (
            "reauth_required",
            "missing_mail_scope",
            (
                f"La cuenta de {provider.title()} requiere "
                "reconexión para autorizar Email."
            ),
        )

    return (
        "active",
        None,
        None,
    )


def _serialize_mail_integration(
    *,
    integration: dict[str, Any],
    connection: dict[str, Any] | None,
) -> dict[str, Any]:
    metadata = integration.get("metadata")

    normalized_metadata = (
        metadata
        if isinstance(metadata, dict)
        else {}
    )

    return {
        **integration,
        "provider": str(integration.get("provider") or ""),
        "metadata": normalized_metadata,
        "integration_connection": connection,
        "sync_status": (
            "ready"
            if integration.get("status") == "active"
            else (
                "reauthorize"
                if integration.get("status") == "reauth_required"
                else "unavailable"
            )
        ),
        "can_sync": integration.get("status") == "active",
        "requires_reauthorization": (
            integration.get("status") == "reauth_required"
        ),
        "status_reason": (
            integration.get("last_error_message")
        ),
    }


def _get_connection_map(
    *,
    user_id: str,
    connection_ids: list[str],
) -> dict[str, dict[str, Any]]:
    normalized_ids = list(
        dict.fromkeys(
            connection_id
            for connection_id in connection_ids
            if connection_id
        )
    )

    if not normalized_ids:
        return {}

    try:
        response = (
            _supabase()
            .table("integration_connections_safe")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("user_id", user_id)
            .in_("id", normalized_ids)
            .execute()
        )

        return {
            str(connection["id"]): connection
            for connection in _response_data(response)
        }

    except Exception:
        return {}


def sync_mail_integration_from_connection(
    *,
    connection_id: str,
) -> dict[str, Any] | None:
    """
    Crea o actualiza el estado operativo de Email desde una
    conexión OAuth genérica. No consulta ni expone credenciales.
    """

    try:
        connection_response = (
            _supabase()
            .table("integration_connections")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("id", connection_id)
            .maybe_single()
            .execute()
        )

        connection = _extract_single(connection_response)

        if not connection:
            return None

        provider = str(connection.get("provider") or "")

        if provider not in ("google", "microsoft"):
            return None

        status_value, error_code, error_message = (
            _derive_mail_status(connection=connection)
        )

        now = _utc_now_iso()

        payload = {
            "user_id": connection["user_id"],
            "integration_connection_id": connection["id"],
            "provider": provider,
            "provider_account_id": connection[
                "provider_account_id"
            ],
            "provider_email": connection.get("provider_email"),
            "provider_display_name": connection.get(
                "provider_display_name"
            ),
            "status": status_value,
            "connected_at": (
                connection.get("last_successful_auth_at")
                or connection.get("created_at")
                or now
            ),
            "reauth_required_at": (
                connection.get("reauth_required_at")
                or (
                    now
                    if status_value == "reauth_required"
                    else None
                )
            ),
            "disconnected_at": (
                connection.get("disconnected_at")
                or (
                    now
                    if status_value == "disconnected"
                    else None
                )
            ),
            "last_error_code": error_code,
            "last_error_message": error_message,
            "metadata": {
                "integration_connection_id": connection["id"],
                "connection_provider": provider,
                "connection_status": connection.get("status"),
                "mail_capability_enabled": (
                    _has_mail_capability(connection)
                ),
                "mail_scope_ready": _has_mail_scopes(
                    provider=provider,
                    granted_scopes=_normalize_string_list(
                        connection.get("granted_scopes")
                    ),
                ),
                "linked_or_updated_at": now,
            },
        }

        existing_response = (
            _supabase()
            .table("mail_integrations")
            .select("id,metadata")
            .eq(
                "integration_connection_id",
                connection["id"],
            )
            .maybe_single()
            .execute()
        )

        existing = _extract_single(existing_response)

        if existing:
            existing_metadata = existing.get("metadata")

            merged_metadata = {
                **(
                    existing_metadata
                    if isinstance(existing_metadata, dict)
                    else {}
                ),
                **payload["metadata"],
            }

            response = (
                _supabase()
                .table("mail_integrations")
                .update(
                    {
                        **payload,
                        "metadata": merged_metadata,
                    }
                )
                .eq("id", existing["id"])
                .execute()
            )
        else:
            response = (
                _supabase()
                .table("mail_integrations")
                .insert(payload)
                .execute()
            )

        return _extract_single(response)

    except Exception:
        return None


def sync_mail_integration_for_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> dict[str, Any] | None:
    """
    Verifica ownership antes de sincronizar una conexión iniciada
    desde una petición autenticada de usuario.
    """

    try:
        connection_response = (
            _supabase()
            .table("integration_connections")
            .select("id,user_id")
            .eq("id", connection_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        connection = _extract_single(connection_response)

        if not connection:
            return None

        return sync_mail_integration_from_connection(
            connection_id=connection_id,
        )

    except Exception:
        return None


def sync_user_mail_integrations_from_connections(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    """
    Sincroniza los registros Mail a partir de todas las conexiones
    Google/Microsoft existentes del usuario.

    Esto permite adoptar cuentas que fueron conectadas antes de
    crear el módulo Email.
    """

    try:
        response = (
            _supabase()
            .table("integration_connections")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("user_id", user_id)
            .in_("provider", ["google", "microsoft"])
            .execute()
        )

        connections = _response_data(response)

        synced: list[dict[str, Any]] = []

        for connection in connections:
            integration = sync_mail_integration_from_connection(
                connection_id=str(connection["id"]),
            )

            if integration:
                synced.append(integration)

        return synced

    except Exception:
        return []


def list_mail_integrations(
    *,
    user_id: str,
    provider: str | None = None,
    include_inactive: bool = True,
) -> list[dict[str, Any]]:
    """
    Devuelve las cuentas de Email del usuario junto con su conexión
    OAuth segura, sin credenciales.
    """

    try:
        query = (
            _supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
        )

        if provider:
            query = query.eq("provider", provider)

        if not include_inactive:
            query = query.eq("status", "active")

        response = query.execute()
        integrations = _response_data(response)

        connection_map = _get_connection_map(
            user_id=user_id,
            connection_ids=[
                str(item["integration_connection_id"])
                for item in integrations
                if item.get("integration_connection_id")
            ],
        )

        return [
            _serialize_mail_integration(
                integration=integration,
                connection=connection_map.get(
                    str(
                        integration.get(
                            "integration_connection_id"
                        )
                        or ""
                    )
                ),
            )
            for integration in integrations
        ]

    except Exception:
        return []


def get_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any] | None:
    """
    Recupera una sola integración Mail, siempre filtrada por dueño.
    """

    try:
        response = (
            _supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
            .eq("id", integration_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        integration = _extract_single(response)

        if not integration:
            return None

        connection_map = _get_connection_map(
            user_id=user_id,
            connection_ids=[
                str(integration["integration_connection_id"])
            ],
        )

        return _serialize_mail_integration(
            integration=integration,
            connection=connection_map.get(
                str(integration["integration_connection_id"])
            ),
        )

    except Exception:
        return None