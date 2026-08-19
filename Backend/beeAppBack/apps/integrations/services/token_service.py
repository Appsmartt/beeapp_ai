from apps.integrations.services.integration_connection_service import (
    get_valid_google_access_token,
    get_valid_microsoft_access_token,
)


def get_valid_provider_access_token(
    *,
    user_id: str,
    connection_id: str,
    provider: str,
) -> str:
    if provider == "google":
        return get_valid_google_access_token(
            user_id=user_id,
            connection_id=connection_id,
        )

    if provider == "microsoft":
        return get_valid_microsoft_access_token(
            user_id=user_id,
            connection_id=connection_id,
        )

    raise ValueError(
        f"Unsupported integration provider: {provider}"
    )