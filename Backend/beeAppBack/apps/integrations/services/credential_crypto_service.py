from __future__ import annotations

from cryptography.fernet import (
    Fernet,
    InvalidToken,
)
from django.conf import settings

from apps.integrations.exceptions import (
    IntegrationConfigurationError,
    IntegrationCredentialError,
)


def _get_fernet() -> Fernet:
    encryption_key = getattr(
        settings,
        "INTEGRATION_TOKEN_ENCRYPTION_KEY",
        "",
    )

    if not encryption_key:
        raise IntegrationConfigurationError(
            "Integration token encryption key is missing."
        )

    try:
        return Fernet(encryption_key.encode("utf-8"))
    except (TypeError, ValueError) as error:
        raise IntegrationConfigurationError(
            "Integration token encryption key is invalid."
        ) from error


def encrypt_integration_secret(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()

    if not normalized_value:
        return None

    try:
        return _get_fernet().encrypt(
            normalized_value.encode("utf-8")
        ).decode("utf-8")
    except IntegrationConfigurationError:
        raise
    except Exception as error:
        raise IntegrationCredentialError(
            "Could not encrypt integration secret."
        ) from error


def decrypt_integration_secret(
    ciphertext: str | None,
) -> str | None:
    if ciphertext is None:
        return None

    normalized_ciphertext = ciphertext.strip()

    if not normalized_ciphertext:
        return None

    try:
        return _get_fernet().decrypt(
            normalized_ciphertext.encode("utf-8")
        ).decode("utf-8")
    except IntegrationConfigurationError:
        raise
    except InvalidToken as error:
        raise IntegrationCredentialError(
            "Stored integration secret cannot be decrypted."
        ) from error
    except Exception as error:
        raise IntegrationCredentialError(
            "Could not decrypt integration secret."
        ) from error