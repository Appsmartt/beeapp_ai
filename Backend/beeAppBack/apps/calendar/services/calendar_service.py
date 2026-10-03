"""Public compatibility facade for calendar service operations."""

from apps.calendar.services.calendar_service_modules.calendar_management import (
    create_calendar,
    create_calendar_tag,
    delete_calendar,
    delete_calendar_tag,
    list_calendar_tags,
    list_calendars,
    update_calendar,
    update_calendar_tag,
)
from apps.calendar.services.calendar_service_modules.calendar_preferences import (
    get_calendar_preferences,
    search_beeapp_users,
    update_calendar_preferences,
)
from apps.calendar.services.calendar_service_modules.event_create_commands import (
    create_calendar_event,
    duplicate_calendar_event,
)
from apps.calendar.services.calendar_service_modules.event_details import (
    get_calendar_event_details,
)
from apps.calendar.services.calendar_service_modules.event_listing import (
    get_calendar_bootstrap,
    list_calendar_events,
)
from apps.calendar.services.calendar_service_modules.event_update_commands import (
    delete_calendar_event,
    update_calendar_event,
)

__all__ = [
    "create_calendar",
    "create_calendar_event",
    "create_calendar_tag",
    "delete_calendar",
    "delete_calendar_event",
    "delete_calendar_tag",
    "duplicate_calendar_event",
    "get_calendar_bootstrap",
    "get_calendar_event_details",
    "get_calendar_preferences",
    "list_calendar_events",
    "list_calendar_tags",
    "list_calendars",
    "search_beeapp_users",
    "update_calendar",
    "update_calendar_event",
    "update_calendar_preferences",
    "update_calendar_tag",
]
