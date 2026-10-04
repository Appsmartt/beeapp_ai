from __future__ import annotations

from typing import Any

from .constants import SAFE_CONNECTION_COLUMNS
from .response_helpers import (
    extract_single,
    get_supabase,
    response_data,
    utc_now_iso,
)
from .status_service import (
    derive_mail_status,
    has_mail_capability,
    has_mail_scopes,
    normalize_string_list,
)


def sync_mail_integration_from_connection(
    *,
    connection_id: str,
) -> dict[str, Any] | None:
    try:
        connection_response = (
            get_supabase()
            .table("integration_connections")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("id", connection_id)
            .maybe_single()
            .execute()
        )
        connection = extract_single(connection_response)

        if not connection:
            return None

        provider = str(connection.get("provider") or "")

        if provider not in ("google", "microsoft"):
            return None

        status_value, error_code, error_message = derive_mail_status(
            connection=connection
        )
        now = utc_now_iso()

        payload = {
            "user_id": connection["user_id"],
            "integration_connection_id": connection["id"],
            "provider": provider,
            "provider_account_id": connection["provider_account_id"],
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
                "mail_capability_enabled": has_mail_capability(
                    connection
                ),
                "mail_scope_ready": has_mail_scopes(
                    provider=provider,
                    granted_scopes=normalize_string_list(
                        connection.get("granted_scopes")
                    ),
                ),
                "linked_or_updated_at": now,
            },
        }

        existing_response = (
            get_supabase()
            .table("mail_integrations")
            .select("id,metadata")
            .eq("integration_connection_id", connection["id"])
            .maybe_single()
            .execute()
        )
        existing = extract_single(existing_response)

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
                get_supabase()
                .table("mail_integrations")
                .update({**payload, "metadata": merged_metadata})
                .eq("id", existing["id"])
                .execute()
            )
        else:
            response = (
                get_supabase()
                .table("mail_integrations")
                .insert(payload)
                .execute()
            )

        return extract_single(response)
    except Exception:
        return None


def sync_mail_integration_for_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> dict[str, Any] | None:
    try:
        connection_response = (
            get_supabase()
            .table("integration_connections")
            .select("id,user_id")
            .eq("id", connection_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        connection = extract_single(connection_response)

        if not connection:
            return None

        return sync_mail_integration_from_connection(
            connection_id=connection_id
        )
    except Exception:
        return None


def sync_user_mail_integrations_from_connections(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase()
            .table("integration_connections")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("user_id", user_id)
            .in_("provider", ["google", "microsoft"])
            .execute()
        )
        connections = response_data(response)
        synced: list[dict[str, Any]] = []

        for connection in connections:
            integration = sync_mail_integration_from_connection(
                connection_id=str(connection["id"])
            )

            if integration:
                synced.append(integration)

        return synced
    except Exception:
        return []
