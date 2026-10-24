from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationError,
    ChatConversationNotFoundError,
    ChatDirectConversationError,
)
from apps.chat.serializers import (
    ClearConversationSerializer,
    ConversationDetailQuerySerializer,
    ConversationParticipantsQuerySerializer,
    CreateDirectConversationSerializer,
    UpdateConversationNotificationsSerializer,
    UpdateConversationPinnedSerializer,
)
from apps.chat.services.chat_conversation import (
    clear_chat_conversation,
    create_or_get_direct_conversation,
    get_conversation,
    list_conversation_participants,
    set_chat_conversation_notifications,
    set_chat_conversation_pinned,
)
from apps.chat.views.refactored.common import (
    conversation_not_found_response,
    get_access_token,
    unauthorized_response,
)


class ChatDirectConversationsView(AuthenticatedAPIView):
    """POST /api/chat/direct-conversations/."""

    def post(self, request):
        serializer = CreateDirectConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = create_or_get_direct_conversation(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                sender_identity_id=str(
                    serializer.validated_data["sender_identity_id"]
                ),
                recipient_identity_id=str(
                    serializer.validated_data["recipient_identity_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected sender identity is unavailable."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatDirectConversationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ChatConversationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=(
                status.HTTP_201_CREATED
                if result["created"]
                else status.HTTP_200_OK
            ),
        )


class ChatConversationDetailView(AuthenticatedAPIView):
    """GET /api/chat/conversations/<conversation_id>/."""

    def get(self, request, conversation_id):
        serializer = ConversationDetailQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            conversation = get_conversation(
                user_id=str(authenticated_user.id),
                conversation_id=str(conversation_id),
                include_participants=serializer.validated_data[
                    "include_participants"
                ],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ):
            return conversation_not_found_response()
        except ChatConversationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"conversation": conversation},
            status=status.HTTP_200_OK,
        )


class ChatConversationClearView(AuthenticatedAPIView):
    """DELETE /api/chat/conversations/<conversation_id>/clear/."""

    def delete(self, request, conversation_id):
        serializer = ClearConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            clear_chat_conversation(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot clear this "
                        "conversation."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return conversation_not_found_response()
        except ChatConversationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatConversationNotificationsView(AuthenticatedAPIView):
    """PATCH conversation notification preference."""

    def patch(self, request, conversation_id):
        serializer = UpdateConversationNotificationsSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            conversation = set_chat_conversation_notifications(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                notifications_enabled=serializer.validated_data[
                    "notifications_enabled"
                ],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot update this "
                        "conversation preference."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return conversation_not_found_response()
        except ChatConversationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"conversation": conversation},
            status=status.HTTP_200_OK,
        )


class ChatConversationPinnedView(AuthenticatedAPIView):
    """PATCH /api/chat/conversations/<conversation_id>/pinned/."""

    def patch(self, request, conversation_id):
        serializer = UpdateConversationPinnedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            conversation = set_chat_conversation_pinned(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                is_pinned=serializer.validated_data["is_pinned"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot update this "
                        "conversation."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return conversation_not_found_response()
        except ChatConversationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"conversation": conversation},
            status=status.HTTP_200_OK,
        )


class ChatConversationParticipantsView(AuthenticatedAPIView):
    """GET conversation participants."""

    def get(self, request, conversation_id):
        serializer = ConversationParticipantsQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            participants = list_conversation_participants(
                user_id=str(authenticated_user.id),
                conversation_id=str(conversation_id),
                include_inactive=serializer.validated_data[
                    "include_inactive"
                ],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ):
            return conversation_not_found_response()
        except ChatConversationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"participants": participants},
            status=status.HTTP_200_OK,
        )
