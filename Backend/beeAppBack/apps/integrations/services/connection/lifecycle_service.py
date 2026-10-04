from __future__ import annotations

from typing import Any

from apps.integrations.exceptions import (
    IntegrationCredentialError,
)
from apps.integrations.services.calendar_integration_link_service import (
    sync_calendar_integration_from_connection,
)
from apps.integrations.services.connection.event_service import (
    record_connection_event,
)
from apps.integrations.services.connection.repository_service import (
    get_user_connection,
)
from apps.integrations.services.connection.shared import (
    extract_single,
    get_supabase,
    utc_now_iso,
)
from apps.integrations.services.integration_notification_service import (
    create_reauthorization_notification,
)
from apps.mail.services.mail_integration_link import (
    sync_mail_integration_from_connection,
)


def _sync_connected_integrations(
    *,
    connection_id: str,
) -> None:
    sync_calendar_integration_from_connection(
        connection_id=connection_id,
    )
    sync_mail_integration_from_connection(
        connection_id=connection_id,
    )


def mark_connection_reauth_required(
    *,
    connection_id: str,
    reason: str,
) -> None:
    try:
        response = (
            get_supabase()
            .table("integration_connections")
            .select("id,user_id,provider")
            .eq("id", connection_id)
            .maybe_single()
            .execute()
        )
        connection = extract_single(response)

        if not connection:
            return

        (
            get_supabase()
            .table("integration_connections")
            .update(
                {
                    "status": "reauth_required",
                    "reauth_required_at": utc_now_iso(),
                    "last_error_code": "reauth_required",
                    "last_error_message": (
                        "La cuenta debe conectarse nuevamente."
                    ),
                }
            )
            .eq("id", connection_id)
            .execute()
        )
        _sync_connected_integrations(
            connection_id=connection_id,
        )
        record_connection_event(
            connection_id=connection_id,
            user_id=connection["user_id"],
            provider=connection["provider"],
            event_type="reauth_required",
            error_code="reauth_required",
            error_message=reason,
        )
        create_reauthorization_notification(
            connection_id=connection_id,
            user_id=connection["user_id"],
            provider=connection["provider"],
        )
    except Exception:
        return


def disconnect_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> None:
    connection = get_user_connection(
        user_id=user_id,
        connection_id=connection_id,
    )

    try:
        response = (
            get_supabase()
            .rpc(
                "disconnect_integration_and_delete_connected_data",
                {
                    "p_user_id": user_id,
                    "p_connection_id": connection_id,
                },
            )
            .execute()
        )
        result = extract_single(response)

        if not result:
            raise IntegrationCredentialError(
                "Could not disconnect integration."
            )

        record_connection_event(
            connection_id=None,
            user_id=user_id,
            provider=connection["provider"],
            event_type=(
                "disconnected_and_connected_data_deleted"
            ),
            metadata={
                "deleted_connection_id": str(
                    result["deleted_connection_id"]
                ),
                "deleted_calendar_integration_count": (
                    result[
                        "deleted_calendar_integration_count"
                    ]
                ),
                "deleted_calendar_count": (
                    result["deleted_calendar_count"]
                ),
                "deleted_mail_integration_count": (
                    result[
                        "deleted_mail_integration_count"
                    ]
                ),
                "deleted_mail_message_count": (
                    result[
                        "deleted_mail_message_count"
                    ]
                ),
                "deleted_mail_draft_count": (
                    result[
                        "deleted_mail_draft_count"
                    ]
                ),
            },
        )
    except IntegrationCredentialError:
        raise
    except Exception as error:
        raise IntegrationCredentialError(
            "Could not disconnect integration."
        ) from error


def delete_inactive_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> None:
    connection = get_user_connection(
        user_id=user_id,
        connection_id=connection_id,
    )

    if connection["status"] == "connected":
        raise IntegrationCredentialError(
            "Disconnect the integration before removing it."
        )

    try:
        (
            get_supabase()
            .table("integration_credentials")
            .delete()
            .eq("connection_id", connection_id)
            .execute()
        )
        record_connection_event(
            connection_id=connection_id,
            user_id=user_id,
            provider=connection["provider"],
            event_type="integration_record_deleted",
            metadata={
                "previous_status": connection["status"],
            },
        )
        (
            get_supabase()
            .table("integration_connections")
            .delete()
            .eq("id", connection_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as error:
        raise IntegrationCredentialError(
            "Could not remove integration from the list."
        ) from error
