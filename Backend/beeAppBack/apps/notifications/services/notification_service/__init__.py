from __future__ import annotations

from apps.notifications.services.notification_service.database import (
    NOTIFICATION_COLUMNS,
    get_supabase,
)
from apps.notifications.services.notification_service.module_notifications import (
    create_calendar_notification,
    create_incoming_call_notification,
    create_mail_message_received_notification,
    create_module_notification,
    create_storage_notification,
)
from apps.notifications.services.notification_service.notification_queries import (
    get_unread_notification_count,
    hide_protected_chat_notification_previews,
    list_notifications,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)
from apps.notifications.services.notification_service.push_delivery import (
    send_module_push,
)
from apps.notifications.services.notification_service.push_devices import (
    deactivate_push_device,
    register_push_device,
)
from apps.notifications.services.notification_service.session_notifications import (
    send_mobile_session_revoked_push,
)
from apps.notifications.services.notification_service.upload_notifications import (
    UPLOAD_NOTIFICATION_WINDOW_SECONDS,
    create_or_update_upload_success_notification,
    upload_notification_content,
)


def _supabase():
    return get_supabase()


_hide_protected_chat_notification_previews = (
    hide_protected_chat_notification_previews
)
_send_module_push = send_module_push
_upload_notification_content = upload_notification_content


__all__ = [
    "NOTIFICATION_COLUMNS",
    "UPLOAD_NOTIFICATION_WINDOW_SECONDS",
    "_hide_protected_chat_notification_previews",
    "_send_module_push",
    "_supabase",
    "_upload_notification_content",
    "create_calendar_notification",
    "create_incoming_call_notification",
    "create_mail_message_received_notification",
    "create_module_notification",
    "create_or_update_upload_success_notification",
    "create_storage_notification",
    "deactivate_push_device",
    "get_unread_notification_count",
    "list_notifications",
    "mark_all_notifications_as_read",
    "mark_notification_as_read",
    "register_push_device",
    "send_mobile_session_revoked_push",
]
