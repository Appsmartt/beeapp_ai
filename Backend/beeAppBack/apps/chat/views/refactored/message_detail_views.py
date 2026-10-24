from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatAttachmentError,
    ChatConversationAccessError,
    ChatMessageError,
    ChatMessageNotFoundError,
)
from apps.chat.serializers import ChatAttachmentAccessQuerySerializer
from apps.chat.services.chat_attachment_service import (
    create_chat_attachment_access_url,
    get_chat_attachment_metadata,
)
from apps.chat.services.chat_messages.message_query_service import (
    get_chat_message,
)
from apps.chat.services.chat_messages.message_receipt_service import (
    get_chat_message_read_status,
    get_chat_message_readers,
)
from apps.chat.views.refactored.common import (
    get_access_token,
    message_not_found_response,
    unauthorized_response,
)


class ChatMessageDetailView(AuthenticatedAPIView):
    """GET message detail."""

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            message = get_chat_message(
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
        except ChatMessageError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": message}, status=status.HTTP_200_OK)


class ChatMessageAttachmentView(AuthenticatedAPIView):
    """GET message attachment metadata."""

    def get(self, request, message_id):
        serializer = ChatAttachmentAccessQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            attachment = get_chat_attachment_metadata(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return message_not_found_response()
        except ChatAttachmentError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(attachment, status=status.HTTP_200_OK)


class ChatMessageAttachmentAccessView(AuthenticatedAPIView):
    """GET a signed message attachment URL."""

    def get(self, request, message_id):
        serializer = ChatAttachmentAccessQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            access = create_chat_attachment_access_url(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                download=serializer.validated_data["download"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return message_not_found_response()
        except ChatAttachmentError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(access, status=status.HTTP_200_OK)


class ChatMessageReadStatusView(AuthenticatedAPIView):
    """GET direct chat message read status."""

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            read_status = get_chat_message_read_status(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                message_id=str(message_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return message_not_found_response()
        except ChatMessageError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"read_status": read_status},
            status=status.HTTP_200_OK,
        )


class ChatMessageReadersView(AuthenticatedAPIView):
    """GET message readers."""

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            readers = get_chat_message_readers(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                message_id=str(message_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return message_not_found_response()
        except ChatMessageError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"readers": readers}, status=status.HTTP_200_OK)
