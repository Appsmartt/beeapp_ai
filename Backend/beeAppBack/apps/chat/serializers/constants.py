from __future__ import annotations

CHAT_MESSAGE_TYPES = (
    "text",
    "image",
    "video",
    "audio",
    "document",
    "quotation",
    "order",
    "reservation",
    "invoice",
    "link",
    "location",
    "system",
)

CHAT_CONVERSATION_TYPES = (
    "direct",
    "group",
)

CHAT_GROUP_POSTING_POLICIES = (
    "all_members",
    "admins_only",
)

CHAT_PARTICIPANT_ROLES = (
    "owner",
    "admin",
    "member",
)

CHAT_MANAGEABLE_PARTICIPANT_ROLES = (
    "admin",
    "member",
)

CHAT_INVITE_STATUSES = (
    "pending",
    "accepted",
    "declined",
    "cancelled",
    "expired",
)

CHAT_ATTACHMENT_MESSAGE_TYPES = (
    "image",
    "video",
    "audio",
    "document",
)

MAX_CHAT_ATTACHMENT_SIZE_BYTES = 52_428_800
