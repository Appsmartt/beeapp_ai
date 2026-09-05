class StatusError(Exception):
    """Base exception for the BeeApp statuses module."""


class StatusAccessError(StatusError):
    """Raised when the authenticated user cannot access a status resource."""


class StatusNotFoundError(StatusError):
    """Raised when a status resource does not exist or is unavailable."""


class StatusOperationError(StatusError):
    """Raised when a status operation cannot be completed."""


class StatusValidationError(StatusError):
    """Raised when a status payload is invalid."""


class StatusMediaError(StatusError):
    """Raised when a status media file is invalid or unavailable."""


class StatusMediaUploadError(StatusMediaError):
    """Raised when media upload to the statuses bucket fails."""


class StatusViewError(StatusError):
    """Raised when a view cannot be recorded."""


class StatusViewerAccessError(StatusAccessError):
    """Raised when a non-owner tries to see status viewers."""


class StatusArchiveError(StatusError):
    """Raised when a story cannot be archived by its owner."""


class StatusReplyError(StatusError):
    """Raised when a status reply cannot be sent through chat."""


class StatusMentionError(StatusError):
    """Raised when status mentions cannot be processed."""


class StatusFollowError(StatusError):
    """Base exception for status follow operations."""


class StatusFollowNotFoundError(StatusFollowError):
    """Raised when a follow relationship does not exist."""


class StatusFollowAccessError(StatusFollowError):
    """Raised when the user cannot manage a follow relationship."""


class StatusFollowValidationError(StatusFollowError):
    """Raised when a follow operation contains invalid data."""
