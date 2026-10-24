"""Compatibility facade for refactored integration API views."""

from __future__ import annotations

from apps.integrations.refactored_views.dependencies import (
    ConnectionDependencies,
    OAuthDependencies,
)
from apps.integrations.refactored_views.factory import build_view_classes
from apps.integrations.refactored_views.oauth_redirects import (
    MOBILE_RETURN_PATH,
    OAUTH_CALLBACK_COOKIE_MAX_AGE_SECONDS,
    OAUTH_CALLBACK_COOKIE_PATH,
    OAUTH_CALLBACK_COOKIE_PREFIX,
    WEB_RETURN_PATH,
    BeeAppRedirectResponse,
    append_unique_scopes,
    build_callback_failure_response,
    build_callback_redirect_response,
    build_redirect_url,
    build_authorization_response_payload,
    callback_cookie_name,
    create_authorization_request,
    delete_callback_cookie,
    get_callback_redirect_base_url,
    get_identity_scopes,
    get_mobile_result_redirect_url,
    get_web_result_redirect_url,
    normalize_capabilities,
    set_callback_cookie,
    unauthorized_response,
)
from apps.integrations.services.connection.lifecycle_service import (
    delete_inactive_user_connection,
    disconnect_user_connection,
)
from apps.integrations.services.connection.provider_connection_service import (
    upsert_google_connection,
    upsert_microsoft_connection,
)
from apps.integrations.services.connection.repository_service import (
    get_user_connection,
    list_user_connections,
)
from apps.integrations.services.google_oauth_service import (
    exchange_google_authorization_code,
    get_google_user_info,
)
from apps.integrations.services.microsoft_oauth_service import (
    exchange_microsoft_authorization_code,
    get_microsoft_user_info,
)
from apps.integrations.services.oauth_request_service import (
    cancel_oauth_request,
    create_oauth_request,
    finalize_mobile_confirmation,
    find_callback_oauth_request,
    get_callback_oauth_request,
    get_mobile_confirmation_context,
    record_provider_callback,
    start_browser_oauth_request,
)
from apps.integrations.services.provider_registry import (
    build_provider_authorization_url,
)


def build_oauth_dependencies() -> OAuthDependencies:
    """Build fresh OAuth dependencies from facade-level symbols."""
    return OAuthDependencies(
        build_provider_authorization_url=(
            build_provider_authorization_url
        ),
        create_oauth_request=create_oauth_request,
        start_browser_oauth_request=start_browser_oauth_request,
        find_callback_oauth_request=find_callback_oauth_request,
        get_callback_oauth_request=get_callback_oauth_request,
        cancel_oauth_request=cancel_oauth_request,
        record_provider_callback=record_provider_callback,
        get_mobile_confirmation_context=(
            get_mobile_confirmation_context
        ),
        finalize_mobile_confirmation=finalize_mobile_confirmation,
        exchange_google_authorization_code=(
            exchange_google_authorization_code
        ),
        get_google_user_info=get_google_user_info,
        exchange_microsoft_authorization_code=(
            exchange_microsoft_authorization_code
        ),
        get_microsoft_user_info=get_microsoft_user_info,
        upsert_google_connection=upsert_google_connection,
        upsert_microsoft_connection=upsert_microsoft_connection,
    )


def build_connection_dependencies() -> ConnectionDependencies:
    """Build fresh connection dependencies from facade-level symbols."""
    return ConnectionDependencies(
        list_user_connections=list_user_connections,
        get_user_connection=get_user_connection,
        disconnect_user_connection=disconnect_user_connection,
        delete_inactive_user_connection=(
            delete_inactive_user_connection
        ),
    )


_view_classes = build_view_classes(
    oauth_dependency_factory=build_oauth_dependencies,
    connection_dependency_factory=build_connection_dependencies,
)

IntegrationCatalogView = _view_classes["IntegrationCatalogView"]
IntegrationConnectionListView = _view_classes[
    "IntegrationConnectionListView"
]
StartIntegrationAuthorizationView = _view_classes[
    "StartIntegrationAuthorizationView"
]
BrowserOAuthStartView = _view_classes["BrowserOAuthStartView"]
GoogleOAuthCallbackView = _view_classes["GoogleOAuthCallbackView"]
MicrosoftOAuthCallbackView = _view_classes[
    "MicrosoftOAuthCallbackView"
]
ConfirmIntegrationOAuthView = _view_classes[
    "ConfirmIntegrationOAuthView"
]
IntegrationConnectionDetailView = _view_classes[
    "IntegrationConnectionDetailView"
]
DeleteIntegrationConnectionRecordView = _view_classes[
    "DeleteIntegrationConnectionRecordView"
]
ReauthorizeIntegrationConnectionView = _view_classes[
    "ReauthorizeIntegrationConnectionView"
]

_normalize_capabilities = normalize_capabilities
_append_unique_scopes = append_unique_scopes
_cookie_name = callback_cookie_name
_set_callback_cookie = set_callback_cookie
_delete_callback_cookie = delete_callback_cookie


def _authorization_response_payload(*, oauth_request, request):
    """Preserve the legacy helper signature."""
    del request
    return build_authorization_response_payload(
        oauth_request=oauth_request,
        dependencies=build_oauth_dependencies(),
    )


def _create_authorization_request(
    *,
    request,
    authenticated_user,
    provider,
    requested_scopes,
    requested_capabilities,
    client_channel,
    existing_connection_id=None,
):
    """Preserve the legacy helper signature."""
    return create_authorization_request(
        request=request,
        authenticated_user=authenticated_user,
        provider=provider,
        requested_scopes=requested_scopes,
        requested_capabilities=requested_capabilities,
        client_channel=client_channel,
        existing_connection_id=existing_connection_id,
        dependencies=build_oauth_dependencies(),
    )


def _handle_provider_callback(*, request, provider, provider_name):
    """Preserve the legacy callback helper signature."""
    view_class = {
        "google": GoogleOAuthCallbackView,
        "microsoft": MicrosoftOAuthCallbackView,
    }.get(provider)
    if view_class is None:
        return build_callback_failure_response(
            provider_name=provider_name,
            detail="Unsupported integration provider.",
        )
    view = view_class()
    view.provider = provider
    view.provider_name = provider_name
    view.oauth_dependencies = build_oauth_dependencies()
    return view.handle_provider_callback(request=request)
