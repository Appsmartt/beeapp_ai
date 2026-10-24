from __future__ import annotations

from typing import Any

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupError,
    ChatIdentityNotFoundError,
)
from apps.chat.services.chat_conversation import (
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
    _extract_rpc_uuid,
    _normalize_description,
    _normalize_posting_policy,
    _normalize_required_name,
    _validate_group_image,
)


def create_chat_group(
    *,
    user_id: str,
    access_token: str,
    creator_identity_id: str,
    name: str,
    posting_policy: str = "all_members",
    description: str | None = None,
    image_file_id: str | None = None,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=creator_identity_id,
        )

        normalized_name = _normalize_required_name(name)
        normalized_policy = _normalize_posting_policy(
            posting_policy,
        )
        normalized_description = _normalize_description(
            description,
        )

        if image_file_id:
            _validate_group_image(
                user_id=user_id,
                file_id=image_file_id,
            )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "create_group_chat",
                {
                    "p_creator_identity_id": str(
                        creator_identity_id
                    ),
                    "p_name": normalized_name,
                    "p_posting_policy": normalized_policy,
                    "p_description": normalized_description,
                    "p_image_file_id": (
                        str(image_file_id)
                        if image_file_id
                        else None
                    ),
                },
            )
            .execute()
        )

        conversation_id = _extract_rpc_uuid(
            response.data,
            "create_group_chat",
        )

        if not conversation_id:
            raise ChatGroupError(
                "Supabase did not return the group conversation ID."
            )

        return get_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            include_participants=True,
        )

    except (
        ChatConversationAccessError,
        ChatGroupError,
        ChatIdentityNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_group_rpc_error(
            error=error,
            fallback="Could not create chat group.",
        )


def update_chat_group(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    actor_identity_id: str,
    name: str | None = None,
    description: str | None = None,
    image_file_id: str | None = None,
    posting_policy: str | None = None,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=actor_identity_id,
        )

        _get_group_conversation(
            conversation_id=conversation_id,
        )

        params: dict[str, Any] = {
            "p_conversation_id": str(conversation_id),
            "p_actor_identity_id": str(actor_identity_id),
            "p_name": (
                _normalize_required_name(name)
                if name is not None
                else None
            ),
            "p_description": (
                _normalize_description(description)
                if description is not None
                else None
            ),
            "p_image_file_id": (
                str(image_file_id)
                if image_file_id
                else None
            ),
            "p_posting_policy": (
                _normalize_posting_policy(posting_policy)
                if posting_policy is not None
                else None
            ),
        }

        if image_file_id:
            _validate_group_image(
                user_id=user_id,
                file_id=image_file_id,
            )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc("update_chat_group", params)
            .execute()
        )

        if response.data is not True:
            raise ChatGroupError(
                "Group could not be updated."
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
            fallback="Could not update group.",
        )


def deactivate_chat_group(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    owner_identity_id: str,
    sole_owner_only: bool = False,
) -> None:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=owner_identity_id,
        )

        _get_group_conversation(
            conversation_id=conversation_id,
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                (
                    "deactivate_chat_group_if_sole_owner"
                    if sole_owner_only
                    else "deactivate_chat_group"
                ),
                {
                    "p_conversation_id": str(conversation_id),
                    "p_owner_identity_id": str(
                        owner_identity_id
                    ),
                },
            )
            .execute()
        )

        if response.data is not True:
            raise ChatGroupError(
                "Group could not be deactivated."
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
            fallback="Could not deactivate group.",
        )
