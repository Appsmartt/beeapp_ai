"""Dependency contracts for refactored integration views."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class OAuthDependencies:
    build_provider_authorization_url: Callable[..., str]
    create_oauth_request: Callable[..., dict[str, Any]]
    start_browser_oauth_request: Callable[..., dict[str, Any]]
    find_callback_oauth_request: Callable[..., dict[str, Any]]
    get_callback_oauth_request: Callable[..., dict[str, Any]]
    cancel_oauth_request: Callable[..., None]
    record_provider_callback: Callable[..., str]
    get_mobile_confirmation_context: Callable[..., dict[str, Any]]
    finalize_mobile_confirmation: Callable[..., None]
    exchange_google_authorization_code: Callable[..., dict[str, Any]]
    get_google_user_info: Callable[..., dict[str, Any]]
    exchange_microsoft_authorization_code: Callable[..., dict[str, Any]]
    get_microsoft_user_info: Callable[..., dict[str, Any]]
    upsert_google_connection: Callable[..., dict[str, Any]]
    upsert_microsoft_connection: Callable[..., dict[str, Any]]


@dataclass(frozen=True)
class ConnectionDependencies:
    list_user_connections: Callable[..., list[dict[str, Any]]]
    get_user_connection: Callable[..., dict[str, Any]]
    disconnect_user_connection: Callable[..., None]
    delete_inactive_user_connection: Callable[..., None]
