from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from apps.integrations.exceptions import (
    IntegrationCredentialError,
    IntegrationReauthorizationRequiredError,
)
from apps.integrations.services.calendar_integration_link_service import (
    sync_calendar_integration_from_connection,
)
from apps.integrations.services.connection.event_service import (
    record_connection_event,
)
from apps.integrations.services.connection.lifecycle_service import (
    mark_connection_reauth_required,
)
from apps.integrations.services.connection.repository_service import (
    get_connection_credentials,
    get_user_connection,
)
from apps.integrations.services.connection.shared import (
    get_supabase,
    utc_now_iso,
)
from apps.integrations.services.credential_crypto_service import (
    decrypt_integration_secret,
    encrypt_integration_secret,
)
from apps.integrations.services.google_oauth_service import (
    calculate_token_expiration as calculate_google_token_expiration,
    refresh_google_access_token,
)
from apps.integrations.services.microsoft_oauth_service import (
    calculate_token_expiration as calculate_microsoft_token_expiration,
    refresh_microsoft_access_token,
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


def _is_access_token_refresh_required(
    *,
    access_token: str | None,
    expires_at_raw: Any,
) -> bool:
    if not access_token or not expires_at_raw:
        return True

    expires_at = datetime.fromisoformat(
        str(expires_at_raw).replace("Z", "+00:00")
    )
    now = datetime.now(timezone.utc)

    return expires_at <= now.replace(microsecond=0)


def _update_refreshed_credentials(
    *,
    connection_id: str,
    token_data: dict[str, Any],
    refresh_token: str,
    token_expires_at: datetime | None,
) -> None:
    refreshed_access_token = token_data["access_token"]
    refreshed_refresh_token = (
        token_data.get("refresh_token")
        or refresh_token
    )

    (
        get_supabase()
        .table("integration_credentials")
        .update(
            {
                "access_token_ciphertext": encrypt_integration_secret(
                    refreshed_access_token
                ),
                "refresh_token_ciphertext": encrypt_integration_secret(
                    refreshed_refresh_token
                ),
                "token_type": token_data.get("token_type"),
                "provider_metadata": {
                    "scope": token_data.get("scope"),
                },
            }
        )
        .eq("connection_id", connection_id)
        .execute()
    )

    (
        get_supabase()
        .table("integration_connections")
        .update(
            {
                "token_expires_at": (
                    token_expires_at.isoformat()
                    if token_expires_at
                    else None
                ),
                "last_token_refresh_at": utc_now_iso(),
                "last_error_code": None,
                "last_error_message": None,
            }
        )
        .eq("id", connection_id)
        .execute()
    )


def _get_valid_provider_access_token(
    *,
    user_id: str,
    connection_id: str,
    expected_provider: str,
    refresh_token_function: Callable[..., dict[str, Any]],
    calculate_expiration_function: Callable[
        [dict[str, Any]],
        datetime | None,
    ],
) -> str:
    connection = get_user_connection(
        user_id=user_id,
        connection_id=connection_id,
    )

    if connection["provider"] != expected_provider:
        raise IntegrationCredentialError(
            "Requested connection belongs to another provider."
        )

    if connection["status"] != "connected":
        raise IntegrationCredentialError(
            f"{expected_provider.title()} connection is not active."
        )

    try:
        credentials = get_connection_credentials(
            connection_id=connection_id,
        )

        if not credentials:
            raise IntegrationCredentialError(
                f"{expected_provider.title()} credentials "
                "are unavailable."
            )

        access_token = decrypt_integration_secret(
            credentials.get("access_token_ciphertext")
        )
        refresh_token = decrypt_integration_secret(
            credentials.get("refresh_token_ciphertext")
        )

        if not _is_access_token_refresh_required(
            access_token=access_token,
            expires_at_raw=connection.get("token_expires_at"),
        ):
            return access_token

        if not refresh_token:
            mark_connection_reauth_required(
                connection_id=connection_id,
                reason=(
                    f"{expected_provider.title()} did not provide "
                    "a refresh token."
                ),
            )
            raise IntegrationCredentialError(
                f"{expected_provider.title()} connection "
                "requires reauthorization."
            )

        refreshed_token_data = refresh_token_function(
            refresh_token=refresh_token,
        )
        token_expires_at = calculate_expiration_function(
            refreshed_token_data
        )
        _update_refreshed_credentials(
            connection_id=connection_id,
            token_data=refreshed_token_data,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
        )
        _sync_connected_integrations(
            connection_id=connection_id,
        )
        record_connection_event(
            connection_id=connection_id,
            user_id=user_id,
            provider=expected_provider,
            event_type="token_refreshed",
        )

        return refreshed_token_data["access_token"]
    except IntegrationCredentialError:
        raise
    except IntegrationReauthorizationRequiredError as error:
        mark_connection_reauth_required(
            connection_id=connection_id,
            reason=str(error),
        )
        raise IntegrationCredentialError(
            f"{expected_provider.title()} connection "
            "requires reauthorization."
        ) from error
    except Exception as error:
        mark_connection_reauth_required(
            connection_id=connection_id,
            reason=(
                f"{expected_provider.title()} token refresh failed."
            ),
        )
        raise IntegrationCredentialError(
            "Could not obtain valid "
            f"{expected_provider.title()} credentials."
        ) from error


def get_valid_google_access_token(
    *,
    user_id: str,
    connection_id: str,
) -> str:
    return _get_valid_provider_access_token(
        user_id=user_id,
        connection_id=connection_id,
        expected_provider="google",
        refresh_token_function=refresh_google_access_token,
        calculate_expiration_function=(
            calculate_google_token_expiration
        ),
    )


def get_valid_microsoft_access_token(
    *,
    user_id: str,
    connection_id: str,
) -> str:
    return _get_valid_provider_access_token(
        user_id=user_id,
        connection_id=connection_id,
        expected_provider="microsoft",
        refresh_token_function=refresh_microsoft_access_token,
        calculate_expiration_function=(
            calculate_microsoft_token_expiration
        ),
    )
