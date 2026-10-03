from __future__ import annotations

from typing import Any

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupError,
    ChatIdentityNotFoundError,
)
from apps.chat.services.chat_conversation_service import (
    _require_identity_active_participant,
    get_conversation,
)
from apps.chat.services.chat_identity_service import (
    get_owned_chat_identity,
)
from apps.chat.services.chat_group.access import (
    _get_group_conversation,
)
from apps.chat.services.chat_group.clients import (
    _user_supabase,
)
from apps.chat.services.chat_group.errors import (
    _raise_group_rpc_error,
)
from apps.chat.services.chat_group.validation import (
    _normalize_manageable_role,
)


def leave_chat_group(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    identity_id: str,
) -> None:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )

        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=identity_id,
        )

        _get_group_conversation(
            conversation_id=conversation_id,
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "leave_chat_group",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_identity_id": str(identity_id),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise ChatGroupError(
                "Could not leave group."
            )

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatGroupError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "CHAT_GROUP_OWNER_CANNOT_LEAVE" in message:
            raise ChatGroupError(
                "The group owner must transfer ownership or "
                "deactivate the group before leaving."
            ) from error

        if "CHAT_GROUP_NOT_FOUND_OR_INACTIVE" in message:
            raise ChatConversationNotFoundError(
                "Group was not found."
            ) from error

        if "CHAT_ACTIVE_PARTICIPATION_NOT_FOUND" in message:
            raise ChatConversationNotFoundError(
                "Active group participation was not found."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatGroupError(
            f"Could not leave group: {message}"
        ) from error


def remove_identity_from_chat_group(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    actor_identity_id: str,
    target_identity_id: str,
) -> None:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=actor_identity_id,
        )

        _get_group_conversation(
            conversation_id=conversation_id,
        )

        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=target_identity_id,
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "remove_identity_from_chat_group",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_actor_identity_id": str(
                        actor_identity_id
                    ),
                    "p_target_identity_id": str(
                        target_identity_id
                    ),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise ChatGroupError(
                "Could not remove group participant."
            )

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatGroupError,
        ChatIdentityNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_group_rpc_error(
            error=error,
            fallback="Could not remove group participant.",
        )


def set_chat_group_participant_role(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    actor_identity_id: str,
    target_identity_id: str,
    role: str,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=actor_identity_id,
        )

        normalized_role = _normalize_manageable_role(role)

        _get_group_conversation(
            conversation_id=conversation_id,
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "set_chat_group_participant_role",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_actor_identity_id": str(
                        actor_identity_id
                    ),
                    "p_target_identity_id": str(
                        target_identity_id
                    ),
                    "p_new_role": normalized_role,
                },
            )
            .execute()
        )

        if response.data is not True:
            raise ChatGroupError(
                "Participant role could not be updated."
            )

        return get_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            include_participants=True,
        )

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatGroupError,
        ChatIdentityNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_group_rpc_error(
            error=error,
            fallback="Could not update participant role.",
        )


def transfer_chat_group_ownership(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    current_owner_identity_id: str,
    new_owner_identity_id: str,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=current_owner_identity_id,
        )

        if (
            str(current_owner_identity_id)
            == str(new_owner_identity_id)
        ):
            raise ChatGroupError(
                "The new owner must be different from "
                "the current owner."
            )

        _get_group_conversation(
            conversation_id=conversation_id,
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "transfer_chat_group_ownership",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_current_owner_identity_id": str(
                        current_owner_identity_id
                    ),
                    "p_new_owner_identity_id": str(
                        new_owner_identity_id
                    ),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise ChatGroupError(
                "Group ownership could not be transferred."
            )

        return get_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            include_participants=True,
        )

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatGroupError,
        ChatIdentityNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_group_rpc_error(
            error=error,
            fallback="Could not transfer group ownership.",
        )
