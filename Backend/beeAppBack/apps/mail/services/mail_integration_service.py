from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.mail.exceptions import (
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailSyncError,
)
from apps.mail.services.mail_sync_service import (
    sync_mail_integration,
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


def _get_raw_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
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
            raise MailIntegrationNotFoundError(
                "La integración de Email no fue encontrada."
            )

        return integration

    except MailIntegrationNotFoundError:
        raise

    except Exception as error:
        raise MailIntegrationNotFoundError(
            "No fue posible cargar la integración de Email."
        ) from error


def require_active_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    integration = _get_raw_mail_integration(
        user_id=user_id,
        integration_id=integration_id,
    )

    if integration["status"] != "active":
        raise MailIntegrationInactiveError(
            integration.get("last_error_message")
            or "La integración de Email requiere reconexión."
        )

    if not integration.get("integration_connection_id"):
        raise MailIntegrationInactiveError(
            "La integración de Email no tiene conexión OAuth."
        )

    return integration


def request_mail_sync(
    *,
    user_id: str,
    integration_ids: list[str] | None = None,
    force_full_sync: bool = False,
    trigger: str = "manual",
) -> dict[str, Any]:
    """
    Ejecuta sincronización real para cada integración seleccionada.

    Gmail está implementado en este bloque.
    Microsoft Graph se incorporará en el siguiente adaptador.
    """

    if integration_ids:
        raw_integrations = [
            _get_raw_mail_integration(
                user_id=user_id,
                integration_id=integration_id,
            )
            for integration_id in integration_ids
        ]
    else:
        try:
            response = (
                _supabase()
                .table("mail_integrations")
                .select(MAIL_INTEGRATION_COLUMNS)
                .eq("user_id", user_id)
                .eq("status", "active")
                .execute()
            )

            raw_integrations = _response_data(response)

        except Exception as error:
            raise MailIntegrationNotFoundError(
                "No fue posible cargar las integraciones de Email."
            ) from error

    if not raw_integrations:
        return {
            "requested_integration_count": 0,
            "synced_integration_count": 0,
            "failed_integration_count": 0,
            "results": [],
            "failures": [],
        }

    results: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []

    for integration in raw_integrations:
        integration_id = str(integration["id"])

        try:
            result = sync_mail_integration(
                user_id=user_id,
                integration_id=integration_id,
                trigger=trigger,
                force_full_sync=force_full_sync,
            )

            results.append(result)

        except (
            MailIntegrationNotFoundError,
            MailIntegrationInactiveError,
            MailSyncError,
        ) as error:
            failures.append(
                {
                    "integration_id": integration_id,
                    "detail": str(error),
                }
            )

    return {
        "requested_integration_count": len(raw_integrations),
        "synced_integration_count": len(results),
        "failed_integration_count": len(failures),
        "results": results,
        "failures": failures,
    }