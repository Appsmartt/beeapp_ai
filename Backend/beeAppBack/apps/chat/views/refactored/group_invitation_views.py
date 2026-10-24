from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupInviteError,
    ChatIdentityNotFoundError,
)
from apps.chat.serializers import (
    ChatGroupInviteListQuerySerializer,
    CreateChatGroupInviteSerializer,
    RespondToChatGroupInviteSerializer,
)
from apps.chat.services.chat_group import (
    get_chat_group_invite,
    invite_identity_to_chat_group,
    list_chat_group_invites,
    respond_to_chat_group_invite,
)
from apps.chat.throttles import ChatGroupMutationThrottle
from apps.chat.views.refactored.common import (
    get_access_token,
    group_not_found_response,
    unauthorized_response,
)


class ChatGroupInvitesView(AuthenticatedAPIView):
    """GET /api/chat/group-invites/."""

    def get(self, request):
        serializer = ChatGroupInviteListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            identity_id = serializer.validated_data.get("identity_id")
            invites = list_chat_group_invites(
                user_id=str(authenticated_user.id),
                identity_id=(
                    str(identity_id)
                    if identity_id is not None
                    else None
                ),
                invite_status=serializer.validated_data["status"],
                limit=serializer.validated_data["limit"],
                offset=serializer.validated_data["offset"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatIdentityNotFoundError:
            return Response(
                {"detail": "Chat identity was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ChatGroupInviteError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(invites, status=status.HTTP_200_OK)


class ChatGroupConversationInvitesView(AuthenticatedAPIView):
    """POST /api/chat/groups/<conversation_id>/invites/."""

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request, conversation_id):
        serializer = CreateChatGroupInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            expires_at = serializer.validated_data.get("expires_at")
            invite = invite_identity_to_chat_group(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                invited_identity_id=str(
                    serializer.validated_data["invited_identity_id"]
                ),
                expires_at=(
                    expires_at.isoformat()
                    if expires_at is not None
                    else None
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot invite "
                        "members to this group."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return group_not_found_response()
        except ChatIdentityNotFoundError:
            return Response(
                {
                    "detail": (
                        "Invited identity was not found or unavailable."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except ChatGroupInviteError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"invite": invite},
            status=status.HTTP_201_CREATED,
        )


class ChatGroupInviteDetailView(AuthenticatedAPIView):
    """GET /api/chat/group-invites/<invite_id>/."""

    def get(self, request, invite_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            invite = get_chat_group_invite(
                user_id=str(authenticated_user.id),
                invite_id=str(invite_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatGroupInviteError,
        ):
            return Response(
                {"detail": "Group invitation was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"invite": invite},
            status=status.HTTP_200_OK,
        )


class ChatGroupInviteResponseView(AuthenticatedAPIView):
    """POST /api/chat/group-invites/<invite_id>/response/."""

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request, invite_id):
        serializer = RespondToChatGroupInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = respond_to_chat_group_invite(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                invite_id=str(invite_id),
                accept=serializer.validated_data["accept"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {"detail": "Group invitation was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ChatGroupInviteError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)
