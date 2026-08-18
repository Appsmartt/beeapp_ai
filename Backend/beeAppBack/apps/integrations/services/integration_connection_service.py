from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
)

from apps.integrations.exceptions import (
    IntegrationConnectionNotFoundError,
    IntegrationCredentialError,
)
from apps.integrations.services.credential_crypto_service import (
    decrypt_integration_secret,
    encrypt_integration_secret,
)
from apps.integrations.services.google_oauth_service import (
    calculate_token_expiration,
    refresh_google_access_token,
)
from apps.integrations.services.integration_notification_service import (
    create_reauthorization_notification,
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


def _extract_single(response) -> dict[str, Any] | None:
    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_string_list(
    values: list[Any] | None,
) -> list[str]:
    normalized_values: list[str] = []

    for value in values or []:
        normalized_value = str(value).strip()

        if (
            normalized_value
            and normalized_value not in normalized_values
        ):
            normalized_values.append(normalized_value)

    return normalized_values


def _merge_string_lists(
    *values: list[Any] | None,
) -> list[str]:
    merged: list[str] = []

    for value_list in values:
        for value in _normalize_string_list(value_list):
            if value not in merged:
                merged.append(value)

    return merged


def _record_event(
    *,
    connection_id: str | None,
    user_id: str,
    provider: str,
    event_type: str,
    error_code: str | None = None,
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    try:
        (
            _supabase()
            .table("integration_events")
            .insert(
                {
                    "connection_id": connection_id,
                    "user_id": user_id,
                    "provider": provider,
                    "event_type": event_type,
                    "error_code": error_code,
                    "error_message": error_message,
                    "metadata": metadata or {},
                }
            )
            .execute()
        )
    except Exception:
        return


def list_user_connections(
    *,
    user_id: str,
) -> list[dict[str, Any]]:
    try:
        response = (
            _supabase()
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
            _supabase()
            .table("integration_connections_safe")
            .select(SAFE_CONNECTION_COLUMNS)
            .eq("id", connection_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        connection = getattr(response, "data", None)

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


def upsert_google_connection(
    *,
    user_id: str,
    oauth_request: dict[str, Any],
    token_data: dict[str, Any],
    user_info: dict[str, Any],
) -> dict[str, Any]:
    provider = "google"
    provider_account_id = str(user_info["sub"])
    provider_email = user_info.get("email")
    provider_display_name = user_info.get("name")
    provider_avatar_url = user_info.get("picture")
    granted_scopes = _normalize_string_list(
        str(token_data.get("scope", "")).split()
    )
    requested_capabilities = _normalize_string_list(
        oauth_request.get("requested_capabilities")
    )
    token_expires_at = calculate_token_expiration(token_data)
    now = _utc_now_iso()

    try:
        existing_response = (
            _supabase()
            .table("integration_connections")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", provider)
            .eq("provider_account_id", provider_account_id)
            .is_("provider_tenant_id", "null")
            .maybe_single()
            .execute()
        )

        existing_connection = getattr(
            existing_response,
            "data",
            None,
        )

        connection_payload = {
            "user_id": user_id,
            "provider": provider,
            "provider_account_id": provider_account_id,
            "provider_tenant_id": None,
            "provider_email": provider_email,
            "provider_display_name": provider_display_name,
            "provider_avatar_url": provider_avatar_url,
            "status": "connected",
            "granted_scopes": _merge_string_lists(
                (
                    existing_connection.get(
                        "granted_scopes",
                        [],
                    )
                    if existing_connection
                    else []
                ),
                granted_scopes,
            ),
            "capabilities": _merge_string_lists(
                (
                    existing_connection.get(
                        "capabilities",
                        [],
                    )
                    if existing_connection
                    else []
                ),
                requested_capabilities,
            ),
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
            "metadata": {
                "email_verified": bool(
                    user_info.get("email_verified")
                ),
            },
        }

        if existing_connection:
            connection_response = (
                _supabase()
                .table("integration_connections")
                .update(connection_payload)
                .eq("id", existing_connection["id"])
                .execute()
            )
        else:
            connection_response = (
                _supabase()
                .table("integration_connections")
                .insert(connection_payload)
                .execute()
            )

        connection = _extract_single(connection_response)

        if not connection:
            raise IntegrationCredentialError(
                "Could not save integration connection."
            )

        existing_refresh_token = None

        if existing_connection:
            credentials_response = (
                _supabase()
                .table("integration_credentials")
                .select("refresh_token_ciphertext")
                .eq("connection_id", connection["id"])
                .maybe_single()
                .execute()
            )

            existing_credentials = getattr(
                credentials_response,
                "data",
                None,
            )

            if existing_credentials:
                existing_refresh_token = existing_credentials.get(
                    "refresh_token_ciphertext"
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
            _supabase()
            .table("integration_credentials")
            .upsert(
                credentials_payload,
                on_conflict="connection_id",
            )
            .execute()
        )

        if not _extract_single(credentials_response):
            raise IntegrationCredentialError(
                "Could not save integration credentials."
            )

        _record_event(
            connection_id=connection["id"],
            user_id=user_id,
            provider=provider,
            event_type="authorization_succeeded",
            metadata={
                "capabilities": requested_capabilities,
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
            "Could not persist Google authorization."
        ) from error


def mark_connection_reauth_required(
    *,
    connection_id: str,
    reason: str,
) -> None:
    try:
        response = (
            _supabase()
            .table("integration_connections")
            .select("id,user_id,provider")
            .eq("id", connection_id)
            .maybe_single()
            .execute()
        )

        connection = getattr(response, "data", None)

        if not connection:
            return

        now = _utc_now_iso()

        (
            _supabase()
            .table("integration_connections")
            .update(
                {
                    "status": "reauth_required",
                    "reauth_required_at": now,
                    "last_error_code": "reauth_required",
                    "last_error_message": (
                        "La cuenta debe conectarse nuevamente."
                    ),
                }
            )
            .eq("id", connection_id)
            .execute()
        )

        _record_event(
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


def get_valid_google_access_token(
    *,
    user_id: str,
    connection_id: str,
) -> str:
    connection = get_user_connection(
        user_id=user_id,
        connection_id=connection_id,
    )

    if connection["provider"] != "google":
        raise IntegrationCredentialError(
            "Requested connection is not a Google connection."
        )

    if connection["status"] != "connected":
        raise IntegrationCredentialError(
            "Google connection is not active."
        )

    try:
        credentials_response = (
            _supabase()
            .table("integration_credentials")
            .select("*")
            .eq("connection_id", connection_id)
            .maybe_single()
            .execute()
        )

        credentials = getattr(
            credentials_response,
            "data",
            None,
        )

        if not credentials:
            raise IntegrationCredentialError(
                "Google credentials are unavailable."
            )

        access_token = decrypt_integration_secret(
            credentials.get("access_token_ciphertext")
        )
        refresh_token = decrypt_integration_secret(
            credentials.get("refresh_token_ciphertext")
        )
        expires_at_raw = connection.get("token_expires_at")

        needs_refresh = True

        if access_token and expires_at_raw:
            expires_at = datetime.fromisoformat(
                expires_at_raw.replace("Z", "+00:00")
            )
            now = datetime.now(timezone.utc)

            needs_refresh = expires_at <= (
                now.replace(microsecond=0)
            )

        if not needs_refresh:
            return access_token

        if not refresh_token:
            mark_connection_reauth_required(
                connection_id=connection_id,
                reason="Google did not provide a refresh token.",
            )
            raise IntegrationCredentialError(
                "Google connection requires reauthorization."
            )

        refreshed_token_data = refresh_google_access_token(
            refresh_token=refresh_token,
        )

        refreshed_access_token = refreshed_token_data[
            "access_token"
        ]
        refreshed_refresh_token = (
            refreshed_token_data.get("refresh_token")
            or refresh_token
        )
        token_expires_at = calculate_token_expiration(
            refreshed_token_data
        )
        now = _utc_now_iso()

        (
            _supabase()
            .table("integration_credentials")
            .update(
                {
                    "access_token_ciphertext": (
                        encrypt_integration_secret(
                            refreshed_access_token
                        )
                    ),
                    "refresh_token_ciphertext": (
                        encrypt_integration_secret(
                            refreshed_refresh_token
                        )
                    ),
                    "token_type": refreshed_token_data.get(
                        "token_type"
                    ),
                    "provider_metadata": {
                        "scope": refreshed_token_data.get(
                            "scope"
                        ),
                    },
                }
            )
            .eq("connection_id", connection_id)
            .execute()
        )

        (
            _supabase()
            .table("integration_connections")
            .update(
                {
                    "token_expires_at": (
                        token_expires_at.isoformat()
                        if token_expires_at
                        else None
                    ),
                    "last_token_refresh_at": now,
                    "last_error_code": None,
                    "last_error_message": None,
                }
            )
            .eq("id", connection_id)
            .execute()
        )

        _record_event(
            connection_id=connection_id,
            user_id=user_id,
            provider="google",
            event_type="token_refreshed",
        )

        return refreshed_access_token
    except IntegrationCredentialError:
        raise
    except Exception as error:
        mark_connection_reauth_required(
            connection_id=connection_id,
            reason="Google token refresh failed.",
        )
        raise IntegrationCredentialError(
            "Could not obtain valid Google credentials."
        ) from error


def disconnect_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> None:
    connection = get_user_connection(
        user_id=user_id,
        connection_id=connection_id,
    )

    now = _utc_now_iso()

    try:
        (
            _supabase()
            .table("integration_credentials")
            .delete()
            .eq("connection_id", connection_id)
            .execute()
        )

        (
            _supabase()
            .table("integration_connections")
            .update(
                {
                    "status": "disconnected",
                    "disconnected_at": now,
                    "token_expires_at": None,
                    "last_token_refresh_at": None,
                    "reauth_required_at": None,
                    "last_error_code": None,
                    "last_error_message": None,
                }
            )
            .eq("id", connection_id)
            .eq("user_id", user_id)
            .execute()
        )

        _record_event(
            connection_id=connection_id,
            user_id=user_id,
            provider=connection["provider"],
            event_type="disconnected",
        )
    except Exception as error:
        raise IntegrationCredentialError(
            "Could not disconnect integration."
        ) from error


def delete_inactive_user_connection(
    *,
    user_id: str,
    connection_id: str,
) -> None:
    """
    Removes a previously disconnected/inactive connection from the
    user's visible integration list.

    Active connections cannot be removed through this endpoint. They
    must be disconnected first so their credentials are deleted.
    """
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
            _supabase()
            .table("integration_credentials")
            .delete()
            .eq("connection_id", connection_id)
            .execute()
        )

        _record_event(
            connection_id=connection_id,
            user_id=user_id,
            provider=connection["provider"],
            event_type="integration_record_deleted",
            metadata={
                "previous_status": connection["status"],
            },
        )

        (
            _supabase()
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