from __future__ import annotations

from typing import Any

from beeAppBack.core.supabase_client import (
    execute_with_supabase_admin_retry,
)

from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationError,
    ChatConversationNotFoundError,
    ChatDirectConversationError,
    ChatIdentityNotFoundError,
    ChatMessageError,
    ChatMessageSendError,
)
from apps.chat.services.chat_conversation_service import (
    create_or_get_direct_conversation,
)
from apps.chat.services.chat_identity_service import (
    get_chat_identity,
    get_owned_chat_identity,
    sync_chat_identities_for_user,
)
from apps.chat.services.chat_message_service import (
    send_chat_message,
)
from apps.statuses.exceptions import (
    StatusAccessError,
    StatusNotFoundError,
    StatusReplyError,
)
from apps.statuses.services.status_service import (
    get_status_story,
)


def send_status_story_reply(
    *,
    user_id: str,
    access_token: str,
    story_id: str,
    sender_identity_id: str,
    body: str,
) -> dict[str, Any]:
    """
    Responde una historia activa mediante un chat directo.

    El contenido efímero no se copia al mensaje: la referencia se
    resuelve mientras la historia conserve visibilidad y vigencia.
    """
    normalized_user_id = str(user_id)
    normalized_story_id = str(story_id)
    normalized_sender_identity_id = str(sender_identity_id)
    normalized_body = str(body or "").strip()

    if not normalized_body:
        raise StatusReplyError(
            "A status reply requires non-empty content."
        )

    try:
        story = get_status_story(
            user_id=normalized_user_id,
            story_id=normalized_story_id,
            include_archived=False,
        )

        if story.get("is_owner") is True:
            raise StatusAccessError(
                "You cannot reply to your own status story."
            )

        if story.get("reply_allowed") is not True:
            raise StatusNotFoundError(
                "Status story was not found or is unavailable."
            )

        sync_chat_identities_for_user(
            user_id=normalized_user_id,
        )

        recipient_owner_id = _get_story_owner_id(
            story=story,
        )

        if not recipient_owner_id:
            raise StatusReplyError(
                "The status author is unavailable for chat."
            )

        sync_chat_identities_for_user(
            user_id=recipient_owner_id,
        )

        sender_identity = get_owned_chat_identity(
            user_id=normalized_user_id,
            identity_id=normalized_sender_identity_id,
            require_active=True,
        )

        recipient_identity = _get_story_author_chat_identity(
            story=story,
        )

        if not recipient_owner_id:
            raise StatusReplyError(
                "The status author is unavailable for chat."
            )

        if str(recipient_owner_id) == normalized_user_id:
            raise StatusAccessError(
                "You cannot reply to your own status story."
            )

        if str(sender_identity["id"]) == str(
            recipient_identity["id"]
        ):
            raise StatusAccessError(
                "You cannot reply to this status story."
            )

        direct_result = create_or_get_direct_conversation(
            user_id=normalized_user_id,
            access_token=access_token,
            sender_identity_id=str(sender_identity["id"]),
            recipient_identity_id=str(recipient_identity["id"]),
        )

        conversation = direct_result["conversation"]

        actor = story.get("actor") or {}
        expires_at = story.get("expires_at")

        message = send_chat_message(
            user_id=normalized_user_id,
            access_token=access_token,
            conversation_id=str(conversation["id"]),
            sender_identity_id=str(sender_identity["id"]),
            message_type="text",
            body=normalized_body,
            attachment_file_id=None,
            reference_type="status_story",
            reference_id=normalized_story_id,
            metadata={
                "status_reply": True,
                "status_expires_at": expires_at,
                "status_actor_type": actor.get("actor_type"),
                "status_actor_id": actor.get("actor_id"),
            },
        )

        return {
            "story_id": normalized_story_id,
            "conversation": conversation,
            "conversation_created": bool(
                direct_result.get("created")
            ),
            "message": message,
        }

    except (
        StatusAccessError,
        StatusNotFoundError,
        StatusReplyError,
    ):
        raise

    except ChatIdentityNotFoundError as error:
        raise StatusReplyError(
            "The selected chat identity is unavailable."
        ) from error

    except (
        ChatConversationAccessError,
        ChatConversationNotFoundError,
    ) as error:
        raise StatusReplyError(
            "The selected chat identity cannot send this reply."
        ) from error

    except (
        ChatConversationError,
        ChatDirectConversationError,
        ChatMessageError,
        ChatMessageSendError,
    ) as error:
        raise StatusReplyError(
            f"Could not send status reply: {error}"
        ) from error

    except Exception as error:
        raise StatusReplyError(
            f"Could not send status reply: {error}"
        ) from error


def _get_story_owner_id(
    *,
    story: dict[str, Any],
) -> str | None:
    actor = story.get("actor") or {}
    actor_type = str(actor.get("actor_type") or "").strip()

    if actor_type == "profile":
        profile_id = actor.get("profile_id") or actor.get("actor_id")
        return str(profile_id) if profile_id else None

    if actor_type != "commercial_profile":
        return None

    commercial_profile_id = (
        actor.get("commercial_profile_id")
        or actor.get("actor_id")
    )

    if not commercial_profile_id:
        return None

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("commercial_profiles")
                .select("owner_id")
                .eq("id", str(commercial_profile_id))
                .maybe_single()
                .execute()
            ),
        )

        commercial = getattr(response, "data", None)

        if not isinstance(commercial, dict):
            return None

        owner_id = commercial.get("owner_id")
        return str(owner_id) if owner_id else None

    except Exception:
        return None


def _get_story_author_chat_identity(
    *,
    story: dict[str, Any],
) -> dict[str, Any]:
    actor = story.get("actor") or {}
    actor_type = str(actor.get("actor_type") or "").strip()
    actor_id = actor.get("actor_id")

    if actor_type not in {
        "profile",
        "commercial_profile",
    } or not actor_id:
        raise StatusReplyError(
            "The status author is unavailable for chat."
        )

    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("chat_identities")
                .select(
                    "id,owner_id,identity_type,profile_id,"
                    "commercial_profile_id,is_active"
                )
                .eq("identity_type", actor_type)
                .eq(
                    (
                        "profile_id"
                        if actor_type == "profile"
                        else "commercial_profile_id"
                    ),
                    str(actor_id),
                )
                .eq("is_active", True)
                .maybe_single()
                .execute()
            ),
        )

        identity = getattr(response, "data", None)

        if not isinstance(identity, dict):
            raise StatusReplyError(
                "The status author is unavailable for chat."
            )

        return get_chat_identity(
            identity_id=str(identity["id"]),
            require_active=True,
        )

    except StatusReplyError:
        raise

    except Exception as error:
        raise StatusReplyError(
            "The status author is unavailable for chat."
        ) from error


def _get_chat_identity_owner_id(
    *,
    identity_id: str,
) -> str | None:
    try:
        response = execute_with_supabase_admin_retry(
            lambda client: (
                client
                .table("chat_identities")
                .select("owner_id")
                .eq("id", str(identity_id))
                .eq("is_active", True)
                .maybe_single()
                .execute()
            ),
        )

        identity = getattr(response, "data", None)

        if not isinstance(identity, dict):
            return None

        owner_id = identity.get("owner_id")

        return str(owner_id) if owner_id else None

    except Exception:
        return None
