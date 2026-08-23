from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from beeAppBack.core.supabase_client import (
    get_supabase_admin_client,
    get_supabase_user_client,
)

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupError,
    ChatGroupInviteError,
    ChatIdentityNotFoundError,
)
from apps.chat.services.chat_conversation_service import (
    _require_identity_active_participant,
    get_conversation,
)
from apps.chat.services.chat_identity_service import (
    get_chat_identity,
    get_owned_chat_identity,
)


CONVERSATION_COLUMNS = (
    "id,conversation_type,direct_key,created_by_identity_id,"
    "posting_identity_id,name,description,image_file_id,"
    "last_message_id,last_message_at,is_active,"
    "created_at,updated_at"
)

INVITE_COLUMNS = (
    "id,conversation_id,invited_identity_id,"
    "invited_by_identity_id,status,responded_at,expires_at,"
    "created_at,updated_at"
)

FILE_COLUMNS = (
    "id,owner_id,bucket_id,storage_path,original_name,"
    "display_name,mime_type,kind,size_bytes,status,"
    "trashed_at,created_at,updated_at"
)


def _supabase():
    return get_supabase_admin_client()


def _user_supabase(
    *,
    access_token: str,
):
    return get_supabase_user_client(
        access_token=access_token,
    )


def _extract_first_row(response) -> dict[str, Any] | None:
    if response is None:
        return None

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _response_rows(response) -> list[dict[str, Any]]:
    if response is None:
        return []

    data = getattr(response, "data", None)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def create_chat_group(
    *,
    user_id: str,
    access_token: str,
    creator_identity_id: str,
    name: str,
    description: str | None = None,
    image_file_id: str | None = None,
) -> dict[str, Any]:
    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=creator_identity_id,
        )

        normalized_name = name.strip()

        if not normalized_name:
            raise ChatGroupError(
                "Group name cannot be empty."
            )

        normalized_description = (
            description.strip()
            if isinstance(description, str)
            and description.strip()
            else None
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
        message = str(error)

        if "CHAT_CREATOR_IDENTITY_NOT_OWNED_BY_USER" in message:
            raise ChatConversationAccessError(
                "The selected creator identity is unavailable."
            ) from error

        if "CHAT_GROUP_NAME_REQUIRED" in message:
            raise ChatGroupError(
                "Group name is required."
            ) from error

        if "CHAT_GROUP_IMAGE_FILE_NOT_FOUND" in message:
            raise ChatGroupError(
                "Group image file was not found."
            ) from error

        if "CHAT_GROUP_IMAGE_FILE_NOT_READY" in message:
            raise ChatGroupError(
                "Group image file is not ready."
            ) from error

        if (
            "CHAT_GROUP_IMAGE_FILE_MUST_BELONG_TO_CREATOR"
            in message
        ):
            raise ChatGroupError(
                "Group image file must belong to the creator."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatGroupError(
            f"Could not create chat group: {message}"
        ) from error


def invite_identity_to_chat_group(
    *,
    user_id: str,
    access_token: str,
    conversation_id: str,
    invited_identity_id: str,
    expires_at: str | None = None,
) -> dict[str, Any]:
    try:
        conversation = _get_group_conversation(
            conversation_id=conversation_id,
        )

        _require_group_creator_owner(
            user_id=user_id,
            conversation=conversation,
        )

        get_chat_identity(
            identity_id=invited_identity_id,
            require_active=True,
        )

        if (
            str(invited_identity_id)
            == str(conversation["created_by_identity_id"])
        ):
            raise ChatGroupInviteError(
                "The group creator cannot be invited."
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
        message = str(error)

        if "CHAT_ONLY_GROUP_CREATOR_CAN_INVITE" in message:
            raise ChatConversationAccessError(
                "Only the group creator can invite members."
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

        if "CHAT_CANNOT_INVITE_GROUP_CREATOR" in message:
            raise ChatGroupInviteError(
                "The group creator cannot be invited."
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
            f"Could not create group invitation: {message}"
        ) from error


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

        _require_group_creator_owner(
            user_id=user_id,
            conversation=conversation,
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
                "The group creator cannot leave the group."
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
    identity_id: str,
) -> None:
    try:
        conversation = _get_group_conversation(
            conversation_id=conversation_id,
        )

        _require_group_creator_owner(
            user_id=user_id,
            conversation=conversation,
        )

        if str(identity_id) == str(
            conversation["created_by_identity_id"]
        ):
            raise ChatGroupError(
                "The group creator cannot be removed."
            )

        _require_identity_active_participant(
            conversation_id=conversation_id,
            identity_id=identity_id,
        )

        response = (
            _user_supabase(
                access_token=access_token,
            )
            .rpc(
                "remove_identity_from_chat_group",
                {
                    "p_conversation_id": str(conversation_id),
                    "p_identity_id": str(identity_id),
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
    ):
        raise

    except Exception as error:
        message = str(error)

        if "CHAT_ONLY_GROUP_CREATOR_CAN_REMOVE" in message:
            raise ChatConversationAccessError(
                "Only the group creator can remove members."
            ) from error

        if "CHAT_GROUP_CREATOR_CANNOT_BE_REMOVED" in message:
            raise ChatGroupError(
                "The group creator cannot be removed."
            ) from error

        if "CHAT_TARGET_NOT_ACTIVE_PARTICIPANT" in message:
            raise ChatConversationNotFoundError(
                "The selected participant is not active."
            ) from error

        if "AUTHENTICATION_REQUIRED" in message:
            raise ChatConversationAccessError(
                "A valid user access token is required."
            ) from error

        raise ChatGroupError(
            f"Could not remove group participant: {message}"
        ) from error


def _get_group_conversation(
    *,
    conversation_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("chat_conversations")
        .select(CONVERSATION_COLUMNS)
        .eq("id", str(conversation_id))
        .eq("conversation_type", "group")
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )

    conversation = _extract_first_row(response)

    if not conversation:
        raise ChatConversationNotFoundError(
            "Group was not found."
        )

    return conversation


def _require_group_creator_owner(
    *,
    user_id: str,
    conversation: dict[str, Any],
) -> None:
    creator_identity_id = conversation["created_by_identity_id"]

    try:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=creator_identity_id,
        )
    except ChatIdentityNotFoundError as error:
        raise ChatConversationAccessError(
            "Only the group creator can perform this action."
        ) from error


def _validate_group_image(
    *,
    user_id: str,
    file_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("files")
        .select(FILE_COLUMNS)
        .eq("id", str(file_id))
        .eq("owner_id", str(user_id))
        .eq("status", "ready")
        .maybe_single()
        .execute()
    )

    file_record = _extract_first_row(response)

    if not file_record:
        raise ChatGroupError(
            "Group image file was not found or unavailable."
        )

    if file_record.get("trashed_at") is not None:
        raise ChatGroupError(
            "Group image file is in trash."
        )

    if file_record.get("kind") != "image":
        raise ChatGroupError(
            "Group image file must be an image."
        )

    return file_record


def _get_owned_identity_ids(
    *,
    user_id: str,
    identity_id: str | None = None,
) -> list[str]:
    if identity_id:
        get_owned_chat_identity(
            user_id=user_id,
            identity_id=identity_id,
        )

        return [str(identity_id)]

    response = (
        _supabase()
        .table("chat_identities")
        .select("id")
        .eq("owner_id", str(user_id))
        .eq("is_active", True)
        .execute()
    )

    return [
        identity["id"]
        for identity in _response_rows(response)
    ]


def _get_invite_row(
    *,
    invite_id: str,
) -> dict[str, Any]:
    response = (
        _supabase()
        .table("chat_group_invites")
        .select(INVITE_COLUMNS)
        .eq("id", str(invite_id))
        .maybe_single()
        .execute()
    )

    invite = _extract_first_row(response)

    if not invite:
        raise ChatGroupInviteError(
            "Group invitation was not found."
        )

    return invite


def _user_owns_identity(
    *,
    user_id: str,
    identity_id: str,
) -> bool:
    response = (
        _supabase()
        .table("chat_identities")
        .select("id")
        .eq("id", str(identity_id))
        .eq("owner_id", str(user_id))
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )

    return _extract_first_row(response) is not None


def _enrich_group_invites(
    *,
    invites: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not invites:
        return []

    conversation_ids = list(
        {
            invite["conversation_id"]
            for invite in invites
            if invite.get("conversation_id")
        }
    )

    conversations_by_id = _get_group_conversations_by_ids(
        conversation_ids=conversation_ids,
    )

    identity_ids = list(
        {
            identity_id
            for invite in invites
            for identity_id in (
                invite.get("invited_identity_id"),
                invite.get("invited_by_identity_id"),
            )
            if identity_id
        }
    )

    identities_by_id = _get_identities_by_ids(
        identity_ids=identity_ids,
    )

    result: list[dict[str, Any]] = []

    for invite in invites:
        result.append(
            {
                **invite,
                "conversation": conversations_by_id.get(
                    invite["conversation_id"]
                ),
                "invited_identity": identities_by_id.get(
                    invite["invited_identity_id"]
                ),
                "invited_by_identity": identities_by_id.get(
                    invite["invited_by_identity_id"]
                ),
            }
        )

    return result


def _get_group_conversations_by_ids(
    *,
    conversation_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not conversation_ids:
        return {}

    response = (
        _supabase()
        .table("chat_conversations")
        .select(CONVERSATION_COLUMNS)
        .in_("id", conversation_ids)
        .eq("conversation_type", "group")
        .execute()
    )

    return {
        conversation["id"]: conversation
        for conversation in _response_rows(response)
    }


def _get_identities_by_ids(
    *,
    identity_ids: list[str],
) -> dict[str, dict[str, Any]]:
    identities_by_id: dict[str, dict[str, Any]] = {}

    for identity_id in identity_ids:
        try:
            identities_by_id[identity_id] = get_chat_identity(
                identity_id=identity_id,
                require_active=False,
            )
        except Exception:
            identities_by_id[identity_id] = {
                "id": identity_id,
                "identity_type": None,
                "profile_id": None,
                "commercial_profile_id": None,
                "display_name": "User",
                "avatar_file_id": None,
                "is_active": False,
                "is_available": False,
            }

    return identities_by_id


def _is_future_timestamp(value: str) -> bool:
    normalized_value = value.replace("Z", "+00:00")

    return (
        datetime.fromisoformat(normalized_value)
        > datetime.now(timezone.utc)
    )


def _extract_rpc_uuid(
    value: Any,
    function_name: str,
) -> str | None:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        if not value:
            return None

        return _extract_rpc_uuid(
            value[0],
            function_name,
        )

    if isinstance(value, dict):
        return (
            value.get(function_name)
            or value.get("id")
            or value.get("value")
        )

    return None