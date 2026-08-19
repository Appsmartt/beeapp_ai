from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.calendar.exceptions import CalendarError


CALENDAR_INTEGRATION_COLUMNS = (
    "id,user_id,provider,provider_account_id,provider_email,"
    "provider_display_name,granted_scopes,token_expires_at,status,"
    "connected_at,last_successful_sync_at,last_attempted_sync_at,"
    "next_sync_at,reauth_required_at,disconnected_at,"
    "last_error_code,last_error_message,metadata,created_at,"
    "updated_at,integration_connection_id"
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


def _normalize_string_list(
    values: Any,
) -> list[str]:
    if not isinstance(values, list):
        return []

    normalized_values: list[str] = []

    for value in values:
        normalized_value = str(value).strip()

        if (
            normalized_value
            and normalized_value not in normalized_values
        ):
            normalized_values.append(normalized_value)

    return normalized_values


def _has_capability(
    connection: dict[str, Any],
    capability: str,
) -> bool:
    capabilities = _normalize_string_list(
        connection.get("capabilities")
    )

    return capability in capabilities


def _provider_has_calendar_scope(
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


def _derive_sync_status(
    *,
    integration: dict[str, Any],
    connection: dict[str, Any] | None,
) -> dict[str, Any]:
    provider = str(integration.get("provider") or "")
    integration_status = str(
        integration.get("status") or ""
    )

    if not connection:
        return {
            "sync_status": "unavailable",
            "can_sync": False,
            "requires_reauthorization": False,
            "status_reason": (
                "La conexión OAuth vinculada ya no existe."
            ),
        }

    connection_status = str(connection.get("status") or "")

    if connection_status != "connected":
        requires_reauthorization = (
            connection_status == "reauth_required"
        )

        return {
            "sync_status": (
                "reauthorize"
                if requires_reauthorization
                else "unavailable"
            ),
            "can_sync": False,
            "requires_reauthorization": (
                requires_reauthorization
            ),
            "status_reason": (
                connection.get("last_error_message")
                or "La conexión OAuth no está activa."
            ),
        }

    if not _has_capability(connection, "calendar"):
        return {
            "sync_status": "unavailable",
            "can_sync": False,
            "requires_reauthorization": False,
            "status_reason": (
                "La cuenta no tiene habilitada la capacidad "
                "de Agenda."
            ),
        }

    granted_scopes = _normalize_string_list(
        connection.get("granted_scopes")
    )

    if not _provider_has_calendar_scope(
        provider=provider,
        granted_scopes=granted_scopes,
    ):
        return {
            "sync_status": "reauthorize",
            "can_sync": False,
            "requires_reauthorization": True,
            "status_reason": (
                integration.get("last_error_message")
                or "La cuenta requiere autorización para "
                "acceder al calendario."
            ),
        }

    if integration_status != "active":
        requires_reauthorization = (
            integration_status == "reauth_required"
        )

        return {
            "sync_status": (
                "reauthorize"
                if requires_reauthorization
                else "unavailable"
            ),
            "can_sync": False,
            "requires_reauthorization": (
                requires_reauthorization
            ),
            "status_reason": (
                integration.get("last_error_message")
                or "La integración de Agenda no está activa."
            ),
        }

    return {
        "sync_status": "ready",
        "can_sync": True,
        "requires_reauthorization": False,
        "status_reason": None,
    }


def _serialize_calendar_integration(
    *,
    integration: dict[str, Any],
    connection: dict[str, Any] | None,
) -> dict[str, Any]:
    provider = str(integration.get("provider") or "")

    derived_status = _derive_sync_status(
        integration=integration,
        connection=connection,
    )

    return {
        **integration,
        "provider": provider,
        "granted_scopes": _normalize_string_list(
            integration.get("granted_scopes")
        ),
        "integration_connection": connection,
        **derived_status,
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

    except Exception as error:
        raise CalendarError(
            "Could not retrieve linked OAuth connections."
        ) from error


def list_calendar_integrations(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            _supabase()
            .table("calendar_integrations")
            .select(CALENDAR_INTEGRATION_COLUMNS)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        integrations = _response_data(response)

        connection_map = _get_connection_map(
            user_id=user_id,
            connection_ids=[
                str(integration["integration_connection_id"])
                for integration in integrations
                if integration.get("integration_connection_id")
            ],
        )

        return [
            _serialize_calendar_integration(
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

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not retrieve calendar integrations."
        ) from error


def get_calendar_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    try:
        response = (
            _supabase()
            .table("calendar_integrations")
            .select(CALENDAR_INTEGRATION_COLUMNS)
            .eq("id", integration_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        integration = _extract_single(response)

        if not integration:
            raise CalendarError(
                "Calendar integration was not found."
            )

        connection_id = integration.get(
            "integration_connection_id"
        )

        connection_map = _get_connection_map(
            user_id=user_id,
            connection_ids=(
                [str(connection_id)]
                if connection_id
                else []
            ),
        )

        return _serialize_calendar_integration(
            integration=integration,
            connection=connection_map.get(
                str(connection_id or "")
            ),
        )

    except CalendarError:
        raise

    except Exception as error:
        raise CalendarError(
            "Could not retrieve calendar integration."
        ) from error