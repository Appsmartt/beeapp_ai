from __future__ import annotations

from typing import Any

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupError,
    ChatGroupInviteError,
    ChatIdentityNotFoundError,
)
from apps.chat.services.chat_conversation import (
    get_conversation,
)
from apps.chat.services.chat_identity_service import (
    get_chat_identity,
    get_owned_chat_identity,
)
from apps.chat.services.chat_group.access import (
    _get_group_conversation,
    _get_invite_row,
    _get_owned_identity_ids,
    _require_user_is_group_manager,
    _user_owns_identity,
)
from apps.chat.services.chat_group.clients import (
    _response_rows,
    _supabase,
    _user_supabase,
)
from apps.chat.services.chat_group.constants import (
    INVITE_COLUMNS,
)
from apps.chat.services.chat_group.enrichment import (
    _enrich_group_invites,
)
from apps.chat.services.chat_group.errors import (
    _raise_group_invite_rpc_error,
)
from apps.chat.services.chat_group.validation import (
    _extract_rpc_uuid,
    _is_future_timestamp,
)


def invite_identity_to_chat_group(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    actor_identity_id: str,
    invited_identity_id: str,
    expires_at: str | None = None,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=actor_identity_id,
        )

        _get_group_conversation(
            conversation_id=conversation_id,
        )

        get_chat_identity(
            identity_id=invited_identity_id,
            require_active=True,
        )

        if str(actor_identity_id) == str(invited_identity_id):
            raise ChatGroupInviteError(
                "You cannot invite the acting identity."
            )

        if expires_at and not _is_future_timestamp(expires_at):
            raise ChatGroupInviteError(
                "Invitation expiration must be in the future."
            )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "invite_identity_to_chat_group",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_actor_identity_id": str(
                        actor_identity_id
                    ),
                    "p_invited_identity_id": str(
                        invited_identity_id
                    ),
                    "p_expires_at": expires_at,
                },
            )
            .execute()
        )

        invite_id = _extract_rpc_uuid(
            response.data,
            "invite_identity_to_chat_group",
        )

        if not invite_id:
            raise ChatGroupInviteError(
                "Supabase did not return the group invitation ID."
            )

        return get_chat_group_invite(
            user_id=user_id,
            invite_id=invite_id,
        )

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatGroupError,
        ChatGroupInviteError,
        ChatIdentityNotFoundError,
    ):
        raise

    except Exception as error:
        _raise_group_invite_rpc_error(
            error=error,
            fallback="Could not create group invitation.",
        )


def list_chat_group_invites(
    *,
    user_id: str,
    identity_id: str | None = None,
    invite_status: str = "pending",
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        owned_identity_ids = _get_owned_identity_ids(
            user_id=user_id,
            identity_id=identity_id,
        )

        if not owned_identity_ids:
            return {
                "invites": [],
                "count": 0,
                "limit": limit,
                "offset": offset,
            }

        query = (
            _supabase()
            .table("chat_group_invites")
            .select(INVITE_COLUMNS, count="exact")
            .in_("invited_identity_id", owned_identity_ids)
            .eq("status", invite_status)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        response = query.execute()
        invites = _response_rows(response)

        return {
            "invites": _enrich_group_invites(invites=invites),
            "count": response.count or 0,
            "limit": limit,
            "offset": offset,
        }

    except (
        ChatConversationAccessError,
        ChatGroupInviteError,
        ChatIdentityNotFoundError,
    ):
        raise

    except Exception as error:
        raise ChatGroupInviteError(
            "Could not retrieve group invitations."
        ) from error


def get_chat_group_invite(
    *,
    user_id: str,
    invite_id: str,
) -> dict[str, Any]:
    try:
        invite = _get_invite_row(invite_id=invite_id)

        if _user_owns_identity(
            user_id=user_id,
            identity_id=invite["invited_identity_id"],
        ):
            return _enrich_group_invites(invites=[invite])[0]

        conversation = _get_group_conversation(
            conversation_id=invite["conversation_id"],
        )

        _require_user_is_group_manager(
            user_id=user_id,
            conversation_id=conversation["id"],
        )

        return _enrich_group_invites(invites=[invite])[0]

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatGroupInviteError,
    ):
        raise

    except Exception as error:
        raise ChatGroupInviteError(
            "Could not retrieve group invitation."
        ) from error


def respond_to_chat_group_invite(
    *,
    user_id: str,
    access_token: str,
    invite_id: str,
    accept: bool,
) -> dict[str, Any]:
    try:
        invite = _get_invite_row(invite_id=invite_id)

        if not _user_owns_identity(
            user_id=user_id,
            identity_id=invite["invited_identity_id"],
        ):
            raise ChatConversationAccessError(
                "This invitation is not available."
            )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "respond_to_chat_group_invite",
                {
                    "p_invite_id": str(invite_id),
                    "p_accept": bool(accept),
                },
            )
            .execute()
        )

        returned_conversation_id = _extract_rpc_uuid(
            response.data,
            "respond_to_chat_group_invite",
        )

        refreshed_invite = get_chat_group_invite(
            user_id=user_id,
            invite_id=invite_id,
        )

        if not accept:
            return {
                "accepted": False,
                "conversation": None,
                "invite": refreshed_invite,
            }

        conversation_id = (
            returned_conversation_id
            or invite["conversation_id"]
        )

        conversation = get_conversation(
            user_id=user_id,
            conversation_id=conversation_id,
            include_participants=True,
        )

        return {
            "accepted": True,
            "conversation": conversation,
            "invite": refreshed_invite,
        }

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
        ChatGroupInviteError,
    ):
        raise

    except Exception as error:
        message = str(error)

        if "CHAT_GROUP_INVITE_NOT_FOUND" in message:
            raise ChatGroupInviteError(
                "Group invitation was not found."
            ) from error

        if "CHAT_GROUP_INVITE_NOT_OWNED_BY_USER" in message:
            raise ChatConversationAccessError(
                "This invitation is not available."
            ) from error

        if "CHAT_GROUP_INVITE_NOT_PENDING" in message:
            raise ChatGroupInviteError(
                "This invitation is no longer pending."
            ) from error

        if "CHAT_GROUP_INVITE_EXPIRED" in message:
            raise ChatGroupInviteError(
                "This invitation has expired."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatGroupInviteError(
            f"Could not respond to group invitation: {message}"
        ) from error
