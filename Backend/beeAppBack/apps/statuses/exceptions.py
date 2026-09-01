class StatusError(Exception):
    """Base exception for the BeeApp statuses module."""


class StatusAccessError(StatusError):
    """Raised when the authenticated user cannot access a status resource."""


class StatusNotFoundError(StatusError):
    """Raised when a status resource does not exist or is unavailable."""


class StatusOperationError(StatusError):
    """Raised when a status operation cannot be completed."""


class StatusFollowError(StatusError):
    """Base exception for status follow operations."""


class StatusFollowNotFoundError(StatusFollowError):
    """Raised when a follow relationship does not exist."""


class StatusFollowAccessError(StatusFollowError):
    """Raised when the user cannot manage a follow relationship."""


class StatusFollowValidationError(StatusFollowError):
    """Raised when a follow operation contains invalid data."""
