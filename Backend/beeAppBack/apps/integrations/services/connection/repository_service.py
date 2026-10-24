from __future__ import annotations

from datetime import datetime
from typing import Any

from apps.integrations.exceptions import (
    IntegrationConnectionNotFoundError,
    IntegrationCredentialError,
)
from apps.integrations.services.calendar_integration_link_service import (
    sync_calendar_integration_from_connection,
)
from apps.integrations.services.connection.event_service import (
    record_connection_event,
)
from apps.integrations.services.connection.shared import (
    SAFE_CONNECTION_COLUMNS,
    extract_single,
    get_supabase,
    merge_string_lists,
    normalize_string_list,
    utc_now_iso,
)
from apps.integrations.services.credential_crypto_service import (
    encrypt_integration_secret,
)
from apps.mail.services.mail_integration_link import (
    sync_mail_integration_from_connection,
)


def list_user_connections(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            get_supabase()
            .table("integration_connections_safe")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        data = getattr(response, "data", None)
        return data if isinstance(data, list) else []
    except Exception as error:
        raise IntegrationConnectionNotFoundError(
            "Could not retrieve integration connections."
        ) from error


def get_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> dict[str, Any]:
    try:
        response = (
            get_supabase()
            .table("integration_connections_safe")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("id", connection_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        connection = extract_single(response)

        if not connection:
            raise IntegrationConnectionNotFoundError(
                "Integration connection was not found."
            )

        return connection
    except IntegrationConnectionNotFoundError:
        raise
    except Exception as error:
        raise IntegrationConnectionNotFoundError(
            "Could not retrieve integration connection."
        ) from error


def get_connection_credentials(
    *,
    connection_id: str,
) -> dict[str, Any] | None:
    response = (
        get_supabase()
        .table("integration_credentials")
        .select(
            "connection_id,access_token_ciphertext,"
            "refresh_token_ciphertext,id_token_ciphertext,"
            "token_type,provider_metadata"
        )
        .eq("connection_id", connection_id)
        .maybe_single()
        .execute()
    )

    return extract_single(response)


def _find_existing_connection(
    *,
    user_id: str,
    provider: str,
    provider_account_id: str,
    provider_tenant_id: str | None,
) -> dict[str, Any] | None:
    query = (
        get_supabase()
        .table("integration_connections")
        .select("*")
        .eq("user_id", user_id)
        .eq("provider", provider)
        .eq("provider_account_id", provider_account_id)
    )

    if provider_tenant_id is None:
        query = query.is_("provider_tenant_id", "null")
    else:
        query = query.eq(
            "provider_tenant_id",
            provider_tenant_id,
        )

    return extract_single(query.maybe_single().execute())


def _get_existing_refresh_token_ciphertext(
    *,
    connection_id: str,
) -> str | None:
    response = (
        get_supabase()
        .table("integration_credentials")
        .select("refresh_token_ciphertext")
        .eq("connection_id", connection_id)
        .maybe_single()
        .execute()
    )

    credentials = extract_single(response)

    if not credentials:
        return None

    return credentials.get("refresh_token_ciphertext")


def upsert_connection(
    *,
    user_id: str,
    provider: str,
    provider_account_id: str,
    provider_tenant_id: str | None,
    provider_email: str | None,
    provider_display_name: str | None,
    provider_avatar_url: str | None,
    granted_scopes: list[str],
    requested_capabilities: list[str],
    token_data: dict[str, Any],
    token_expires_at: datetime | None,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    try:
        existing_connection = _find_existing_connection(
            user_id=user_id,
            provider=provider,
            provider_account_id=provider_account_id,
            provider_tenant_id=provider_tenant_id,
        )
        now = utc_now_iso()
        existing_capabilities = (
            existing_connection.get("capabilities", [])
            if existing_connection
            else []
        )
        merged_capabilities = merge_string_lists(
            existing_capabilities,
            requested_capabilities,
        )
        effective_granted_scopes = normalize_string_list(
            granted_scopes
        )
        connection_payload = {
            "user_id": user_id,
            "provider": provider,
            "provider_account_id": provider_account_id,
            "provider_tenant_id": provider_tenant_id,
            "provider_email": provider_email,
            "provider_display_name": provider_display_name,
            "provider_avatar_url": provider_avatar_url,
            "status": "connected",
            "granted_scopes": effective_granted_scopes,
            "capabilities": merged_capabilities,
            "token_expires_at": (
                token_expires_at.isoformat()
                if token_expires_at
                else None
            ),
            "last_successful_auth_at": now,
            "reauth_required_at": None,
            "disconnected_at": None,
            "last_error_code": None,
            "last_error_message": None,
            "metadata": metadata,
        }

        if existing_connection:
            connection_response = (
                get_supabase()
                .table("integration_connections")
                .update(connection_payload)
                .eq("id", existing_connection["id"])
                .execute()
            )
        else:
            connection_response = (
                get_supabase()
                .table("integration_connections")
                .insert(connection_payload)
                .execute()
            )

        connection = extract_single(connection_response)

        if not connection:
            raise IntegrationCredentialError(
                "Could not save integration connection."
            )

        existing_refresh_token = (
            _get_existing_refresh_token_ciphertext(
                connection_id=connection["id"],
            )
            if existing_connection
            else None
        )
        refresh_token_ciphertext = (
            encrypt_integration_secret(
                token_data.get("refresh_token")
            )
            or existing_refresh_token
        )
        credentials_payload = {
            "connection_id": connection["id"],
            "access_token_ciphertext": encrypt_integration_secret(
                token_data.get("access_token")
            ),
            "refresh_token_ciphertext": refresh_token_ciphertext,
            "id_token_ciphertext": encrypt_integration_secret(
                token_data.get("id_token")
            ),
            "token_type": token_data.get("token_type"),
            "token_encryption_version": 1,
            "provider_metadata": {
                "scope": token_data.get("scope"),
            },
        }
        credentials_response = (
            get_supabase()
            .table("integration_credentials")
            .upsert(
                credentials_payload,
                on_conflict="connection_id",
            )
            .execute()
        )

        if not extract_single(credentials_response):
            raise IntegrationCredentialError(
                "Could not save integration credentials."
            )

        sync_calendar_integration_from_connection(
            connection_id=connection["id"],
        )
        sync_mail_integration_from_connection(
            connection_id=connection["id"],
        )
        record_connection_event(
            connection_id=connection["id"],
            user_id=user_id,
            provider=provider,
            event_type="authorization_succeeded",
            metadata={
                "capabilities": merged_capabilities,
                "granted_scopes": effective_granted_scopes,
            },
        )

        return get_user_connection(
            user_id=user_id,
            connection_id=connection["id"],
        )
    except IntegrationCredentialError:
        raise
    except Exception as error:
        raise IntegrationCredentialError(
            f"Could not persist {provider} authorization."
        ) from error
