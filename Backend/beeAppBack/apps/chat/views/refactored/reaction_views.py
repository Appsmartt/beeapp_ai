from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatMessageNotFoundError,
    ChatReactionError,
)
from apps.chat.serializers import (
    CreateReactionSerializer,
    DeleteReactionQuerySerializer,
)
from apps.chat.services.chat_messages.message_reaction_service import (
    create_chat_message_reaction,
    delete_chat_message_reaction,
    list_message_reactions,
)
from apps.chat.throttles import ChatReactionThrottle
from apps.chat.views.refactored.common import (
    get_access_token,
    message_not_found_response,
    unauthorized_response,
)


class ChatMessageReactionsView(AuthenticatedAPIView):
    """GET and POST message reactions."""

    throttle_classes = [ChatReactionThrottle]

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            reactions = list_message_reactions(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return message_not_found_response()
        except ChatReactionError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"reactions": reactions},
            status=status.HTTP_200_OK,
        )

    def post(self, request, message_id):
        serializer = CreateReactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            reaction = create_chat_message_reaction(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                emoji=serializer.validated_data["emoji"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot react to "
                        "this message."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatMessageNotFoundError:
            return message_not_found_response()
        except ChatReactionError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"reaction": reaction},
            status=status.HTTP_201_CREATED,
        )


class ChatMessageReactionDetailView(AuthenticatedAPIView):
    """DELETE a message reaction."""

    throttle_classes = [ChatReactionThrottle]

    def delete(self, request, message_id, emoji):
        serializer = DeleteReactionQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            delete_chat_message_reaction(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                emoji=emoji,
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot remove this "
                        "reaction."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatMessageNotFoundError:
            return message_not_found_response()
        except ChatReactionError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
