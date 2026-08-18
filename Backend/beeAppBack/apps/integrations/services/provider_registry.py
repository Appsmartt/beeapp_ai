from apps.integrations.exceptions import (
    IntegrationConfigurationError,
)
from apps.integrations.services.google_oauth_service import (
    build_google_authorization_url,
)


def build_provider_authorization_url(
    *,
    provider: str,
    state: str,
    code_challenge: str,
    requested_scopes: list[str],
) -> str:
    if provider == "google":
        return build_google_authorization_url(
            state=state,
            code_challenge=code_challenge,
            requested_scopes=requested_scopes,
        )

    raise IntegrationConfigurationError(
        f"Unsupported integration provider: {provider}"
    )