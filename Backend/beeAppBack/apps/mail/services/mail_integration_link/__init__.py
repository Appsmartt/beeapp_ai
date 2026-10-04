from .query_service import (
    get_mail_integration,
    list_mail_integrations,
)
from .synchronization_service import (
    sync_mail_integration_for_user_connection,
    sync_mail_integration_from_connection,
    sync_user_mail_integrations_from_connections,
)

__all__ = [
    "get_mail_integration",
    "list_mail_integrations",
    "sync_mail_integration_for_user_connection",
    "sync_mail_integration_from_connection",
    "sync_user_mail_integrations_from_connections",
]
