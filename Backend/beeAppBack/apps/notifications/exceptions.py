class NotificationError(Exception):
    """Base exception for notification domain errors."""


class PushDeviceError(NotificationError):
    """Raised when a push device cannot be registered or updated."""


class NotificationLookupError(NotificationError):
    """Raised when notifications cannot be retrieved."""


class NotificationUpdateError(NotificationError):
    """Raised when notification state cannot be updated."""