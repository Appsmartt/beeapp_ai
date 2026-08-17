class CalendarError(Exception):
    """Base exception for calendar domain errors."""


class CalendarNotFoundError(CalendarError):
    """Raised when a calendar cannot be found or accessed."""


class CalendarCreateError(CalendarError):
    """Raised when a calendar cannot be created."""


class CalendarUpdateError(CalendarError):
    """Raised when a calendar cannot be updated."""


class CalendarDeleteError(CalendarError):
    """Raised when a calendar cannot be deleted."""


class CalendarEventNotFoundError(CalendarError):
    """Raised when an event cannot be found or accessed."""


class CalendarEventCreateError(CalendarError):
    """Raised when an event cannot be created."""


class CalendarEventUpdateError(CalendarError):
    """Raised when an event cannot be updated."""


class CalendarEventDeleteError(CalendarError):
    """Raised when an event cannot be deleted."""


class CalendarTagNotFoundError(CalendarError):
    """Raised when a calendar tag cannot be found or accessed."""


class CalendarTagError(CalendarError):
    """Raised when a calendar tag operation fails."""


class CalendarPreferencesError(CalendarError):
    """Raised when calendar preferences cannot be accessed or updated."""


class CalendarUserSearchError(CalendarError):
    """Raised when invited-user search fails."""


class CalendarInvitationError(CalendarError):
    """Raised when invitation, RSVP, or attendee operations fail."""


class CalendarShareError(CalendarError):
    """Raised when calendar sharing operations fail."""