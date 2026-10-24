from __future__ import annotations

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupError,
    ChatGroupInviteError,
    ChatIdentityNotFoundError,
)


def _raise_group_rpc_error(
    *,
    error: Exception,
    fallback: str,
) -> None:
    message = str(error)

    if any(
        marker in message
        for marker in (
            "CHAT_ONLY_GROUP_OWNER_CAN_UPDATE_GROUP",
            "CHAT_ONLY_GROUP_OWNER_CAN_TRANSFER_OWNERSHIP",
            "CHAT_ONLY_GROUP_OWNER_CAN_DEACTIVATE",
            "CHAT_ONLY_GROUP_MANAGERS_CAN_REMOVE",
            "CHAT_ACTOR_NOT_ACTIVE_GROUP_PARTICIPANT",
            "CHAT_ACTOR_CANNOT_CHANGE_TARGET_ROLE",
            "CHAT_ADMIN_CAN_ONLY_REMOVE_MEMBERS",
        )
    ):
        raise ChatConversationAccessError(
            "The selected identity does not have permission "
            "to perform this group action."
        ) from error

    if any(
        marker in message
        for marker in (
            "CHAT_GROUP_NOT_FOUND_OR_INACTIVE",
            "CHAT_TARGET_NOT_ACTIVE_PARTICIPANT",
            "CHAT_NEW_OWNER_MUST_BE_ACTIVE_PARTICIPANT",
        )
    ):
        raise ChatConversationNotFoundError(
            "Group or active participant was not found."
        ) from error

    if "AUTHENTICATION_REQUIRED" in message:
        raise ChatConversationAccessError(
            "A valid user access token is required."
        ) from error

    if "CHAT_GROUP_IMAGE_FILE_NOT_FOUND" in message:
        raise ChatGroupError(
            "Group image file was not found."
        ) from error

    if "CHAT_GROUP_IMAGE_FILE_NOT_READY" in message:
        raise ChatGroupError(
            "Group image file is not ready."
        ) from error

    if "CHAT_GROUP_IMAGE_FILE_MUST_BELONG_TO_CREATOR" in message:
        raise ChatGroupError(
            "Group image file must belong to the group owner."
        ) from error

    if any(
        marker in message
        for marker in (
            "CHAT_CANNOT_REMOVE_SELF_USE_LEAVE",
            "CHAT_GROUP_OWNER_CANNOT_BE_REMOVED",
            "CHAT_GROUP_OWNER_ROLE_REQUIRES_TRANSFER",
            "CHAT_CANNOT_CHANGE_OWN_GROUP_ROLE",
            "CHAT_ROLE_CHANGE_MUST_BE_ADMIN_OR_MEMBER",
            "CHAT_NEW_OWNER_MUST_BE_DIFFERENT",
        )
    ):
        raise ChatGroupError(
            "This group role or participant transition is not allowed."
        ) from error

    raise ChatGroupError(
        f"{fallback} Supabase detail: {message}"
    ) from error


def _raise_group_invite_rpc_error(
    *,
    error: Exception,
    fallback: str,
) -> None:
    message = str(error)

    if any(
        marker in message
        for marker in (
            "CHAT_ONLY_GROUP_MANAGERS_CAN_INVITE",
            "CHAT_ONLY_GROUP_OWNER_CAN_INVITE",
        )
    ):
        raise ChatConversationAccessError(
            "The selected identity cannot invite members to this group."
        ) from error

    if "CHAT_GROUP_NOT_FOUND_OR_INACTIVE" in message:
        raise ChatConversationNotFoundError(
            "Group was not found."
        ) from error

    if "CHAT_INVITED_IDENTITY_NOT_AVAILABLE" in message:
        raise ChatIdentityNotFoundError(
            "Invited identity was not found or unavailable."
        ) from error

    if "CHAT_IDENTITY_ALREADY_ACTIVE_PARTICIPANT" in message:
        raise ChatGroupInviteError(
            "This identity is already an active group member."
        ) from error

    if any(
        marker in message
        for marker in (
            "CHAT_CANNOT_INVITE_SELF",
            "CHAT_CANNOT_INVITE_GROUP_CREATOR",
        )
    ):
        raise ChatGroupInviteError(
            "This identity cannot be invited to the group."
        ) from error

    if "CHAT_INVITATION_EXPIRATION_MUST_BE_FUTURE" in message:
        raise ChatGroupInviteError(
            "Invitation expiration must be in the future."
        ) from error

    if "AUTHENTICATION_REQUIRED" in message:
        raise ChatConversationAccessError(
            "A valid user access token is required."
        ) from error

    raise ChatGroupInviteError(
        f"{fallback} Supabase detail: {message}"
    ) from error
