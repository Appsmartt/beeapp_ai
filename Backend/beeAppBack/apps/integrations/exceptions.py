class IntegrationError(Exception):
    """Base exception for third-party integration errors."""


class IntegrationConfigurationError(IntegrationError):
    """Required integration configuration is unavailable."""


class IntegrationAuthorizationError(IntegrationError):
    """OAuth authorization or callback validation failed."""


class IntegrationConnectionNotFoundError(IntegrationError):
    """Requested connection does not exist or does not belong to user."""


class IntegrationCredentialError(IntegrationError):
    """Token encryption, persistence, or refresh failed."""


class IntegrationProviderError(IntegrationError):
    """Provider returned an unexpected or unusable response."""


class IntegrationReauthorizationRequiredError(IntegrationError):
    """Provider authorization must be granted again by the user."""