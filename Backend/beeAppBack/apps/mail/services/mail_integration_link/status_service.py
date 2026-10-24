from __future__ import annotations

from typing import Any


def normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized: list[str] = []

    for item in value:
        normalized_item = str(item).strip()

        if normalized_item and normalized_item not in normalized:
            normalized.append(normalized_item)

    return normalized


def has_mail_capability(connection: dict[str, Any]) -> bool:
    capabilities = normalize_string_list(connection.get("capabilities"))
    return "mail" in capabilities


def has_mail_scopes(
    *,
    provider: str,
    granted_scopes: list[str],
) -> bool:
    scopes = set(granted_scopes)

    if provider == "google":
        return (
            "https://www.googleapis.com/auth/gmail.modify"
            in scopes
        )

    if provider == "microsoft":
        return "Mail.ReadWrite" in scopes and "Mail.Send" in scopes

    return False


def derive_mail_status(
    *,
    connection: dict[str, Any],
) -> tuple[str, str | None, str | None]:
    provider = str(connection.get("provider") or "")
    connection_status = str(connection.get("status") or "")
    granted_scopes = normalize_string_list(
        connection.get("granted_scopes")
    )

    if connection_status == "disconnected":
        return "disconnected", None, None

    if connection_status == "revoked":
        return (
            "reauth_required",
            connection.get("last_error_code") or "oauth_revoked",
            connection.get("last_error_message")
            or "El proveedor revocó el acceso a la cuenta.",
        )

    if connection_status == "reauth_required":
        return (
            "reauth_required",
            connection.get("last_error_code") or "reauth_required",
            connection.get("last_error_message")
            or "La cuenta requiere reconexión.",
        )

    if connection_status != "connected":
        return (
            "error",
            connection.get("last_error_code") or "oauth_unavailable",
            connection.get("last_error_message")
            or "La conexión OAuth no está disponible.",
        )

    if provider not in ("google", "microsoft"):
        return (
            "error",
            "unsupported_mail_provider",
            "El proveedor no es compatible con Email.",
        )

    if not has_mail_capability(connection):
        return (
            "inactive",
            "mail_capability_not_enabled",
            "La cuenta no tiene habilitada la capacidad de Email.",
        )

    if not has_mail_scopes(
        provider=provider,
        granted_scopes=granted_scopes,
    ):
        return (
            "reauth_required",
            "missing_mail_scope",
            (
                f"La cuenta de {provider.title()} requiere "
                "reconexión para autorizar Email."
            ),
        )

    return "active", None, None
