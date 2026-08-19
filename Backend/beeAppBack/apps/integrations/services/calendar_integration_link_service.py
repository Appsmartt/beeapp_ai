from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)


GOOGLE_CALENDAR_SCOPES = (
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
)

MICROSOFT_CALENDAR_SCOPES = (
    "Calendars.ReadWrite",
    "Calendars.Read",
    "Calendars.Read.Shared",
    "Calendars.ReadWrite.Shared",
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


def _normalize_string_list(
    values: Any,
) -> list[str]:
    if not isinstance(values, list):
        return []

    normalized: list[str] = []

    for value in values:
        normalized_value = str(value).strip()

        if (
            normalized_value
            and normalized_value not in normalized
        ):
            normalized.append(normalized_value)

    return normalized


def _has_calendar_scope(
    *,
    provider: str,
    granted_scopes: list[str],
) -> bool:
    scopes = set(granted_scopes)

    if provider == "google":
        return bool(
            scopes.intersection(GOOGLE_CALENDAR_SCOPES)
        )

    if provider == "microsoft":
        return bool(
            scopes.intersection(MICROSOFT_CALENDAR_SCOPES)
        )

    return False


def _has_calendar_capability(
    connection: dict[str, Any],
) -> bool:
    capabilities = _normalize_string_list(
        connection.get("capabilities")
    )

    return "calendar" in capabilities


def _derive_calendar_integration_status(
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
            "revoked",
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

    if not _has_calendar_capability(connection):
        return (
            "error",
            "calendar_capability_not_enabled",
            "La cuenta no tiene habilitada la capacidad de Agenda.",
        )

    if not _has_calendar_scope(
        provider=provider,
        granted_scopes=granted_scopes,
    ):
        return (
            "reauth_required",
            "missing_calendar_scope",
            (
                f"La cuenta de {provider.title()} requiere "
                "reconexión para autorizar Calendar."
            ),
        )

    return (
        "active",
        None,
        None,
    )


def sync_calendar_integration_from_connection(
    *,
    connection_id: str,
) -> dict[str, Any] | None:
    """
    Sincroniza el estado público-operativo de Agenda desde la
    conexión OAuth genérica.

    No consulta ni copia credenciales de integration_credentials.
    """

    try:
        connection_response = (
            _supabase()
            .table("integration_connections")
            .select(
                "id,user_id,provider,provider_account_id,"
                "provider_email,provider_display_name,status,"
                "granted_scopes,capabilities,token_expires_at,"
                "last_successful_auth_at,reauth_required_at,"
                "disconnected_at,last_error_code,"
                "last_error_message,metadata,created_at,updated_at"
            )
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
            _derive_calendar_integration_status(
                connection=connection,
            )
        )

        now = _utc_now_iso()

        payload = {
            "user_id": connection["user_id"],
            "provider": provider,
            "provider_account_id": connection[
                "provider_account_id"
            ],
            "provider_email": connection.get("provider_email"),
            "provider_display_name": connection.get(
                "provider_display_name"
            ),
            "granted_scopes": _normalize_string_list(
                connection.get("granted_scopes")
            ),
            "token_expires_at": connection.get(
                "token_expires_at"
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
                "calendar_capability_enabled": (
                    _has_calendar_capability(connection)
                ),
                "calendar_scope_ready": (
                    _has_calendar_scope(
                        provider=provider,
                        granted_scopes=_normalize_string_list(
                            connection.get("granted_scopes")
                        ),
                    )
                ),
                "linked_or_updated_at": now,
            },
            "integration_connection_id": connection["id"],
        }

        existing_response = (
            _supabase()
            .table("calendar_integrations")
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
            merged_metadata = {
                **(
                    existing.get("metadata")
                    if isinstance(
                        existing.get("metadata"),
                        dict,
                    )
                    else {}
                ),
                **payload["metadata"],
            }

            update_payload = {
                **payload,
                "metadata": merged_metadata,
                "updated_at": now,
            }

            response = (
                _supabase()
                .table("calendar_integrations")
                .update(update_payload)
                .eq("id", existing["id"])
                .execute()
            )
        else:
            response = (
                _supabase()
                .table("calendar_integrations")
                .insert(payload)
                .execute()
            )

        return _extract_single(response)

    except Exception:
        return None


def sync_calendar_integration_for_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> dict[str, Any] | None:
    """
    Evita sincronizar una conexión ajena si este servicio se invoca
    desde una operación autenticada por usuario.
    """

    try:
        response = (
            _supabase()
            .table("integration_connections")
            .select("id,user_id")
            .eq("id", connection_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        connection = _extract_single(response)

        if not connection:
            return None

        return sync_calendar_integration_from_connection(
            connection_id=connection_id,
        )

    except Exception:
        return None