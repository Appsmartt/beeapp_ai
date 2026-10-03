from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatAttachmentError,
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatMessageError,
    ChatMessageNotFoundError,
    ChatMessageSendError,
)
from apps.chat.serializers import (
    ChatMessageListQuerySerializer,
    MarkConversationDeliveredSerializer,
    MarkConversationReadSerializer,
    SendChatMessageSerializer,
    UploadChatAttachmentSerializer,
)
from apps.chat.services.chat_attachment_service import (
    upload_chat_attachment_and_send_message,
)
from apps.chat.services.chat_message_service import (
    list_conversation_messages,
    mark_chat_conversation_delivered,
    mark_chat_conversation_read,
    send_chat_message,
)
from apps.chat.throttles import (
    ChatAttachmentUploadThrottle,
    ChatMessageSendThrottle,
)
from apps.chat.views.refactored.common import (
    conversation_not_found_response,
    get_access_token,
    message_not_found_response,
    unauthorized_response,
)
from apps.storage.exceptions import (
    StorageQuotaExceededError,
    StorageUploadError,
)


class ChatConversationMessagesView(AuthenticatedAPIView):
    """GET and POST conversation messages."""

    throttle_classes = [ChatMessageSendThrottle]

    def get(self, request, conversation_id):
        serializer = ChatMessageListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            messages = list_conversation_messages(
                user_id=str(authenticated_user.id),
                conversation_id=str(conversation_id),
                limit=serializer.validated_data["limit"],
                before_sequence=serializer.validated_data.get(
                    "before_sequence"
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ):
            return conversation_not_found_response()
        except ChatMessageError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(messages, status=status.HTTP_200_OK)

    def post(self, request, conversation_id):
        serializer = SendChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            message = send_chat_message(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                sender_identity_id=str(
                    serializer.validated_data["sender_identity_id"]
                ),
                message_type=serializer.validated_data["message_type"],
                body=serializer.validated_data.get("body"),
                attachment_file_id=(
                    str(
                        serializer.validated_data["attachment_file_id"]
                    )
                    if serializer.validated_data.get(
                        "attachment_file_id"
                    )
                    else None
                ),
                reference_type=serializer.validated_data.get(
                    "reference_type"
                ),
                reference_id=(
                    str(serializer.validated_data["reference_id"])
                    if serializer.validated_data.get("reference_id")
                    else None
                ),
                metadata=serializer.validated_data["metadata"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot send messages "
                        "in this conversation."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return conversation_not_found_response()
        except ChatMessageSendError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ChatMessageError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": message},
            status=status.HTTP_201_CREATED,
        )


class ChatConversationAttachmentUploadView(AuthenticatedAPIView):
    """POST a message attachment."""

    throttle_classes = [ChatAttachmentUploadThrottle]

    def post(self, request, conversation_id):
        serializer = UploadChatAttachmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = upload_chat_attachment_and_send_message(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                sender_identity_id=str(
                    serializer.validated_data["sender_identity_id"]
                ),
                message_type=serializer.validated_data["message_type"],
                uploaded_file=serializer.validated_data["file"],
                body=serializer.validated_data.get("body"),
                metadata=serializer.validated_data["metadata"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot send files "
                        "in this conversation."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return conversation_not_found_response()
        except StorageQuotaExceededError:
            return Response(
                {
                    "detail": (
                        "You do not have enough available storage "
                        "for this attachment."
                    ),
                },
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        except StorageUploadError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except (
            ChatAttachmentError,
            ChatMessageSendError,
        ) as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_201_CREATED)


class ChatConversationDeliveredView(AuthenticatedAPIView):
    """POST conversation delivery receipt."""

    def post(self, request, conversation_id):
        serializer = MarkConversationDeliveredSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            marked = mark_chat_conversation_delivered(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                last_delivered_message_id=str(
                    serializer.validated_data[
                        "last_delivered_message_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot receive this "
                        "conversation."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return conversation_not_found_response()
        except ChatMessageNotFoundError:
            return message_not_found_response()
        except ChatMessageError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"marked": marked}, status=status.HTTP_200_OK)


class ChatConversationReadView(AuthenticatedAPIView):
    """POST conversation read receipt."""

    def post(self, request, conversation_id):
        serializer = MarkConversationReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            marked = mark_chat_conversation_read(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                last_read_message_id=str(
                    serializer.validated_data["last_read_message_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot read this "
                        "conversation."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return conversation_not_found_response()
        except ChatMessageNotFoundError:
            return message_not_found_response()
        except ChatMessageError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"marked": marked}, status=status.HTTP_200_OK)
