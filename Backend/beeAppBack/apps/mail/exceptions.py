class MailError(Exception):
    """Base exception for the Email domain."""


class MailIntegrationNotFoundError(MailError):
    """Raised when a mail integration is missing or inaccessible."""


class MailIntegrationInactiveError(MailError):
    """Raised when a mail integration is not ready to operate."""


class MailMessageNotFoundError(MailError):
    """Raised when an email message is missing or inaccessible."""


class MailDraftNotFoundError(MailError):
    """Raised when an email draft is missing or inaccessible."""


class MailProviderError(MailError):
    """Raised when Gmail or Microsoft Graph returns an unusable response."""


class MailSyncError(MailError):
    """Raised when mailbox synchronization cannot complete."""


class MailSendError(MailError):
    """Raised when a message cannot be sent."""


class MailAttachmentError(MailError):
    """Raised when email attachment handling fails."""


class MailWebhookError(MailError):
    """Raised when an email webhook subscription or payload fails."""