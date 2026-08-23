class ChatError(Exception):
    """Base exception for chat domain errors."""


class ChatIdentityError(ChatError):
    """Raised when a chat identity cannot be found or used."""


class ChatIdentityNotFoundError(ChatIdentityError):
    """Raised when a chat identity is not found or inaccessible."""


class ChatRecipientNotFoundError(ChatError):
    """Raised when a chat recipient is not found or unavailable."""


class ChatConversationError(ChatError):
    """Raised when a conversation operation fails."""


class ChatConversationNotFoundError(ChatConversationError):
    """Raised when a conversation is not found or inaccessible."""


class ChatConversationAccessError(ChatConversationError):
    """Raised when a user cannot access a conversation."""


class ChatDirectConversationError(ChatConversationError):
    """Raised when a direct conversation cannot be created."""


class ChatInboxError(ChatConversationError):
    """Raised when an inbox cannot be retrieved."""


class ChatMessageError(ChatError):
    """Raised when a chat message operation fails."""


class ChatMessageNotFoundError(ChatMessageError):
    """Raised when a message is not found or inaccessible."""


class ChatMessageSendError(ChatMessageError):
    """Raised when a message cannot be sent."""


class ChatReactionError(ChatError):
    """Raised when a message reaction operation fails."""


class ChatGroupError(ChatConversationError):
    """Raised when a group operation fails."""


class ChatGroupInviteError(ChatGroupError):
    """Raised when a group invitation operation fails."""


class ChatAttachmentError(ChatMessageError):
    """Raised when a chat attachment operation fails."""


class ChatPushError(ChatError):
    """Raised when a chat push notification operation fails."""