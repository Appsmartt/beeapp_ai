"""Validation for outbound Microsoft Graph URLs."""

from urllib.parse import urlparse

from apps.mail.services.mail_provider_service import MailProviderError


def validate_microsoft_graph_url(url: str) -> None:
    """Reject URLs outside the exact HTTPS Microsoft Graph host."""
    parsed_url = urlparse(url)

    try:
        is_allowed_graph_url = (
            parsed_url.scheme == "https"
            and parsed_url.hostname == "graph.microsoft.com"
            and parsed_url.port in (None, 443)
        )
    except ValueError:
        is_allowed_graph_url = False

    if not is_allowed_graph_url:
        raise MailProviderError(
            "Microsoft Graph devolvió una URL no permitida."
        )
