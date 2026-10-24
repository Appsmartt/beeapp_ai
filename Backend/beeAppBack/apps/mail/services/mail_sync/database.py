from __future__ import annotations

from datetime import timedelta
from typing import Any

from apps.mail.exceptions import (
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailSyncError,
)

from .common import (
    MAIL_INTEGRATION_COLUMNS,
    extract_single,
    get_supabase,
    response_data,
    utc_now,
    utc_now_iso,
)


def get_mail_integration(
    *,
    user_id: str,
    integration_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
            .eq("id", integration_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        integration = extract_single(response)

        if not integration:
            raise MailIntegrationNotFoundError(
                "La integración de Email no fue encontrada."
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
    except (
        MailIntegrationNotFoundError,
        MailIntegrationInactiveError,
    ):
        raise
    except Exception as error:
        raise MailIntegrationNotFoundError(
            "No fue posible cargar la integración de Email."
        ) from error


def create_sync_run(
    *,
    user_id: str,
    integration: dict[str, Any],
    trigger: str,
    is_full_sync: bool,
) -> dict[str, Any]:
    now = utc_now_iso()

    try:
        response = (
            get_supabase()
            .table("mail_sync_runs")
            .insert(
                {
                    "user_id": user_id,
                    "mail_integration_id": integration["id"],
                    "trigger": trigger,
                    "status": "running",
                    "is_full_sync": is_full_sync,
                    "started_at": now,
                    "cursor_before": integration.get("sync_cursor"),
                    "metadata": {
                        "provider": integration["provider"],
                        "requested_at": now,
                    },
                }
            )
            .execute()
        )
        sync_run = extract_single(response)

        if not sync_run:
            raise MailSyncError(
                "No fue posible crear el registro de sincronización."
            )

        return sync_run
    except MailSyncError:
        raise
    except Exception as error:
        raise MailSyncError(
            "No fue posible crear el registro de sincronización."
        ) from error


def mark_sync_run_succeeded(
    *,
    sync_run_id: str,
    counts: dict[str, int],
    cursor_after: str | None,
    metadata: dict[str, Any],
) -> dict[str, Any] | None:
    now = utc_now_iso()

    try:
        response = (
            get_supabase()
            .table("mail_sync_runs")
            .update(
                {
                    "status": "succeeded",
                    "completed_at": now,
                    "messages_fetched_count": counts["fetched"],
                    "messages_created_count": counts["created"],
                    "messages_updated_count": counts["updated"],
                    "messages_deleted_count": counts["deleted"],
                    "messages_skipped_count": counts["skipped"],
                    "cursor_after": cursor_after,
                    "metadata": metadata,
                }
            )
            .eq("id", sync_run_id)
            .execute()
        )
        return extract_single(response)
    except Exception:
        return None


def mark_sync_run_failed(
    *,
    sync_run_id: str,
    error_code: str,
    error_message: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    now = utc_now_iso()

    try:
        response = (
            get_supabase()
            .table("mail_sync_runs")
            .update(
                {
                    "status": "failed",
                    "completed_at": now,
                    "error_code": error_code[:120],
                    "error_message": error_message[:500],
                    "metadata": metadata or {},
                }
            )
            .eq("id", sync_run_id)
            .execute()
        )
        return extract_single(response)
    except Exception:
        return None


def mark_mail_integration_sync_success(
    *,
    integration_id: str,
    cursor_after: str | None,
    initial_sync: bool,
) -> None:
    now = utc_now_iso()
    payload: dict[str, Any] = {
        "status": "active",
        "last_attempted_sync_at": now,
        "last_successful_sync_at": now,
        "next_sync_at": (
            utc_now() + timedelta(minutes=10)
        ).isoformat(),
        "last_error_code": None,
        "last_error_message": None,
    }

    if cursor_after:
        payload["sync_cursor"] = cursor_after
        payload["sync_cursor_updated_at"] = now

    if initial_sync:
        payload["initial_sync_completed_at"] = now

    try:
        (
            get_supabase()
            .table("mail_integrations")
            .update(payload)
            .eq("id", integration_id)
            .execute()
        )
    except Exception as error:
        raise MailSyncError(
            "No fue posible actualizar el estado de sincronización."
        ) from error


def mark_mail_integration_sync_failure(
    *,
    integration_id: str,
    error_code: str,
    error_message: str,
) -> None:
    now = utc_now_iso()

    try:
        (
            get_supabase()
            .table("mail_integrations")
            .update(
                {
                    "last_attempted_sync_at": now,
                    "next_sync_at": (
                        utc_now() + timedelta(minutes=10)
                    ).isoformat(),
                    "last_error_code": error_code[:120],
                    "last_error_message": error_message[:500],
                }
            )
            .eq("id", integration_id)
            .execute()
        )
    except Exception:
        return


def get_due_mail_integrations() -> list[dict[str, Any]]:
    try:
        now = utc_now_iso()
        response = (
            get_supabase()
            .table("mail_integrations")
            .select(MAIL_INTEGRATION_COLUMNS)
            .eq("status", "active")
            .or_(
                "next_sync_at.is.null,"
                f"next_sync_at.lte.{now}"
            )
            .execute()
        )
        return response_data(response)
    except Exception as error:
        raise MailSyncError(
            "No fue posible cargar las cuentas pendientes de sync."
        ) from error
