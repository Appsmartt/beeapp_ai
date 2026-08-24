from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import (
    AccountAuthenticationError,
)
from apps.accounts.views import (
    AuthenticatedAPIView,
)
from apps.chat.exceptions import (
    ChatAttachmentError,
    ChatConversationAccessError,
    ChatConversationError,
    ChatConversationNotFoundError,
    ChatDirectConversationError,
    ChatGroupError,
    ChatGroupInviteError,
    ChatIdentityError,
    ChatIdentityNotFoundError,
    ChatInboxError,
    ChatMessageError,
    ChatMessageNotFoundError,
    ChatMessageSendError,
    ChatReactionError,
)
from apps.chat.serializers import (
    ChatAttachmentAccessQuerySerializer,
    ChatBootstrapSerializer,
    ChatGroupInviteListQuerySerializer,
    ChatIdentityListQuerySerializer,
    ChatInboxQuerySerializer,
    ChatMessageListQuerySerializer,
    ChatRecipientSearchQuerySerializer,
    ClearConversationSerializer,
    ConversationDetailQuerySerializer,
    ConversationParticipantsQuerySerializer,
    CreateChatGroupInviteSerializer,
    CreateChatGroupSerializer,
    CreateDirectConversationSerializer,
    CreateReactionSerializer,
    DeleteReactionQuerySerializer,
    LeaveChatGroupSerializer,
    MarkConversationReadSerializer,
    RespondToChatGroupInviteSerializer,
    SendChatMessageSerializer,
    UploadChatAttachmentSerializer,
)
from apps.chat.services.chat_attachment_service import (
    create_chat_attachment_access_url,
    get_chat_attachment_metadata,
    upload_chat_attachment_and_send_message,
)
from apps.chat.services.chat_contact_profile_service import (
    get_chat_contact_profile,
)

from apps.chat.services.chat_conversation_service import (
    clear_chat_conversation,
    create_or_get_direct_conversation,
    get_chat_inbox,
    get_conversation,
    list_conversation_participants,
)
from apps.chat.services.chat_group_service import (
    create_chat_group,
    get_chat_group_invite,
    invite_identity_to_chat_group,
    leave_chat_group,
    list_chat_group_invites,
    remove_identity_from_chat_group,
    respond_to_chat_group_invite,
)
from apps.chat.services.chat_identity_service import (
    list_chat_identities,
    sync_chat_identities_for_user,
)
from apps.chat.services.chat_recipient_search_service import (
    search_chat_recipients,
)
from apps.chat.services.chat_message_service import (
    create_chat_message_reaction,
    delete_chat_message_reaction,
    get_chat_message,
    get_chat_message_read_status,
    get_chat_message_readers,
    list_conversation_messages,
    list_message_reactions,
    mark_chat_conversation_read,
    send_chat_message,
)
from apps.chat.throttles import (
    ChatAttachmentUploadThrottle,
    ChatGroupMutationThrottle,
    ChatMessageSendThrottle,
    ChatReactionThrottle,
    ChatRecipientSearchThrottle,
)
from apps.storage.exceptions import (
    StorageQuotaExceededError,
    StorageUploadError,
)


def _unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _conversation_not_found_response() -> Response:
    return Response(
        {
            "detail": "Conversation was not found.",
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def _message_not_found_response() -> Response:
    return Response(
        {
            "detail": "Message was not found.",
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def _group_not_found_response() -> Response:
    return Response(
        {
            "detail": "Group was not found.",
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def _get_access_token(request) -> str:
    authorization_header = request.headers.get(
        "Authorization",
        "",
    ).strip()

    scheme, separator, token = authorization_header.partition(
        " "
    )

    if scheme.lower() != "bearer" or not separator or not token:
        raise AccountAuthenticationError(
            "Invalid or expired access token."
        )

    return token.strip()


class ChatBootstrapView(AuthenticatedAPIView):
    """
    POST /api/chat/bootstrap/

    Sincroniza la identidad privada y perfiles comerciales del usuario,
    y devuelve las bandejas activas disponibles.
    """

    def post(self, request):
        serializer = ChatBootstrapSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            identities = sync_chat_identities_for_user(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatIdentityError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "identities": identities,
            },
            status=status.HTTP_200_OK,
        )


class ChatIdentitiesView(AuthenticatedAPIView):
    """
    GET /api/chat/identities/?active_only=true
    """

    def get(self, request):
        serializer = ChatIdentityListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            identities = list_chat_identities(
                user_id=str(authenticated_user.id),
                active_only=serializer.validated_data[
                    "active_only"
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatIdentityError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "identities": identities,
            },
            status=status.HTTP_200_OK,
        )


class ChatRecipientSearchView(AuthenticatedAPIView):
    """
    GET /api/chat/recipients/search/?q=<texto>&limit=20

    Busca destinatarios de Chat disponibles sin exponer correo,
    teléfono, owner_id ni otros datos privados.
    """

    throttle_classes = [ChatRecipientSearchThrottle]

    def get(self, request):
        serializer = ChatRecipientSearchQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            result = search_chat_recipients(
                user_id=str(authenticated_user.id),
                query=serializer.validated_data["q"],
                limit=serializer.validated_data["limit"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatIdentityError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class ChatContactProfileView(AuthenticatedAPIView):
    """
    GET /api/chat/contacts/<identity_id>/profile/

    Endpoint aislado: no participa en bootstrap, identities ni inbox.
    Devuelve datos públicos mínimos y avatar_file_id, nunca URLs
    firmadas ni datos privados.
    """

    def get(self, request, identity_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request,
            )

            contact = get_chat_contact_profile(
                user_id=str(authenticated_user.id),
                identity_id=str(identity_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatIdentityNotFoundError,
        ):
            return Response(
                {
                    "detail": "Contact was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception:
            return Response(
                {
                    "detail": "Could not retrieve contact profile.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "contact": contact,
            },
            status=status.HTTP_200_OK,
        )


class ChatInboxView(AuthenticatedAPIView):
    """
    GET /api/chat/inbox/?identity_id=<uuid>&limit=50
    """

    def get(self, request):
        serializer = ChatInboxQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            before_last_message_at = (
                serializer.validated_data.get(
                    "before_last_message_at"
                )
            )

            inbox = get_chat_inbox(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                limit=serializer.validated_data["limit"],
                before_last_message_at=(
                    before_last_message_at.isoformat()
                    if before_last_message_at is not None
                    else None
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatIdentityNotFoundError,
            ChatConversationAccessError,
        ):
            return Response(
                {
                    "detail": "Chat identity was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except ChatInboxError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            inbox,
            status=status.HTTP_200_OK,
        )


class ChatDirectConversationsView(AuthenticatedAPIView):
    """
    POST /api/chat/direct-conversations/
    """

    def post(self, request):
        serializer = CreateDirectConversationSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            result = create_or_get_direct_conversation(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                sender_identity_id=str(
                    serializer.validated_data[
                        "sender_identity_id"
                    ]
                ),
                recipient_identity_id=str(
                    serializer.validated_data[
                        "recipient_identity_id"
                    ]
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

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
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ChatConversationError as error:
            return Response(
                {
                    "detail": str(error),
                },
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
    """
    GET /api/chat/conversations/<conversation_id>/
    """

    def get(self, request, conversation_id):
        serializer = ConversationDetailQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            conversation = get_conversation(
                user_id=str(authenticated_user.id),
                conversation_id=str(conversation_id),
                include_participants=serializer.validated_data[
                    "include_participants"
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ):
            return _conversation_not_found_response()

        except ChatConversationError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "conversation": conversation,
            },
            status=status.HTTP_200_OK,
        )


class ChatConversationClearView(AuthenticatedAPIView):
    """
    DELETE /api/chat/conversations/<conversation_id>/clear/

    Oculta una conversación solo de la bandeja indicada. No elimina
    mensajes ni la conversación real.
    """

    def delete(self, request, conversation_id):
        serializer = ClearConversationSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            clear_chat_conversation(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

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
            return _conversation_not_found_response()

        except ChatConversationError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class ChatConversationParticipantsView(
    AuthenticatedAPIView,
):
    """
    GET /api/chat/conversations/<conversation_id>/participants/
    """

    def get(self, request, conversation_id):
        serializer = ConversationParticipantsQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            participants = list_conversation_participants(
                user_id=str(authenticated_user.id),
                conversation_id=str(conversation_id),
                include_inactive=serializer.validated_data[
                    "include_inactive"
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ):
            return _conversation_not_found_response()

        except ChatConversationError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "participants": participants,
            },
            status=status.HTTP_200_OK,
        )


class ChatConversationMessagesView(AuthenticatedAPIView):
    """
    GET  /api/chat/conversations/<conversation_id>/messages/
    POST /api/chat/conversations/<conversation_id>/messages/
    """

    throttle_classes = [ChatMessageSendThrottle]

    def get(self, request, conversation_id):
        serializer = ChatMessageListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            messages = list_conversation_messages(
                user_id=str(authenticated_user.id),
                conversation_id=str(conversation_id),
                limit=serializer.validated_data["limit"],
                before_sequence=serializer.validated_data.get(
                    "before_sequence"
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ):
            return _conversation_not_found_response()

        except ChatMessageError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            messages,
            status=status.HTTP_200_OK,
        )

    def post(self, request, conversation_id):
        serializer = SendChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            access_token = _get_access_token(request)

            message = send_chat_message(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                conversation_id=str(conversation_id),
                sender_identity_id=str(
                    serializer.validated_data[
                        "sender_identity_id"
                    ]
                ),
                message_type=serializer.validated_data[
                    "message_type"
                ],
                body=serializer.validated_data.get("body"),
                attachment_file_id=(
                    str(
                        serializer.validated_data[
                            "attachment_file_id"
                        ]
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
                    str(
                        serializer.validated_data[
                            "reference_id"
                        ]
                    )
                    if serializer.validated_data.get(
                        "reference_id"
                    )
                    else None
                ),
                metadata=serializer.validated_data["metadata"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

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
            return _conversation_not_found_response()

        except ChatMessageSendError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ChatMessageError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": message,
            },
            status=status.HTTP_201_CREATED,
        )


class ChatConversationAttachmentUploadView(
    AuthenticatedAPIView,
):
    """
    POST /api/chat/conversations/<conversation_id>/attachments/

    Request: multipart/form-data
    Required:
    - sender_identity_id
    - message_type: image | video | audio | document
    - file

    Optional:
    - body
    - metadata
    """

    throttle_classes = [ChatAttachmentUploadThrottle]

    def post(self, request, conversation_id):
        serializer = UploadChatAttachmentSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            access_token = _get_access_token(request)

            result = upload_chat_attachment_and_send_message(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                conversation_id=str(conversation_id),
                sender_identity_id=str(
                    serializer.validated_data[
                        "sender_identity_id"
                    ]
                ),
                message_type=serializer.validated_data[
                    "message_type"
                ],
                uploaded_file=serializer.validated_data["file"],
                body=serializer.validated_data.get("body"),
                metadata=serializer.validated_data["metadata"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

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
            return _conversation_not_found_response()

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
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except (
            ChatAttachmentError,
            ChatMessageSendError,
        ) as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=status.HTTP_201_CREATED,
        )


class ChatConversationReadView(AuthenticatedAPIView):
    """
    POST /api/chat/conversations/<conversation_id>/read/
    """

    def post(self, request, conversation_id):
        serializer = MarkConversationReadSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            marked = mark_chat_conversation_read(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                last_read_message_id=str(
                    serializer.validated_data[
                        "last_read_message_id"
                    ]
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

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
            return _conversation_not_found_response()

        except ChatMessageNotFoundError:
            return _message_not_found_response()

        except ChatMessageError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "marked": marked,
            },
            status=status.HTTP_200_OK,
        )


class ChatMessageDetailView(AuthenticatedAPIView):
    """
    GET /api/chat/messages/<message_id>/
    """

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            message = get_chat_message(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return _message_not_found_response()

        except ChatMessageNotFoundError:
            return _message_not_found_response()

        except ChatMessageError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": message,
            },
            status=status.HTTP_200_OK,
        )


class ChatMessageAttachmentView(AuthenticatedAPIView):
    """
    GET /api/chat/messages/<message_id>/attachment/?identity_id=<uuid>
    """

    def get(self, request, message_id):
        serializer = ChatAttachmentAccessQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            attachment = get_chat_attachment_metadata(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return _message_not_found_response()

        except ChatMessageNotFoundError:
            return _message_not_found_response()

        except ChatAttachmentError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            attachment,
            status=status.HTTP_200_OK,
        )


class ChatMessageAttachmentAccessView(
    AuthenticatedAPIView,
):
    """
    GET /api/chat/messages/<message_id>/attachment/access/
        ?identity_id=<uuid>&download=false
    """

    def get(self, request, message_id):
        serializer = ChatAttachmentAccessQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            access = create_chat_attachment_access_url(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                download=serializer.validated_data["download"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return _message_not_found_response()

        except ChatMessageNotFoundError:
            return _message_not_found_response()

        except ChatAttachmentError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            access,
            status=status.HTTP_200_OK,
        )


class ChatMessageReadStatusView(AuthenticatedAPIView):
    """
    GET /api/chat/messages/<message_id>/read-status/

    Solo aplica a chats directos.
    """

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            read_status = get_chat_message_read_status(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                message_id=str(message_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return _message_not_found_response()

        except ChatMessageError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "read_status": read_status,
            },
            status=status.HTTP_200_OK,
        )


class ChatMessageReadersView(AuthenticatedAPIView):
    """
    GET /api/chat/messages/<message_id>/readers/

    Principalmente para grupos; la BD determina quién ha leído
    comparando sequence_number contra cursores de participantes.
    """

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            readers = get_chat_message_readers(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                message_id=str(message_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return _message_not_found_response()

        except ChatMessageError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "readers": readers,
            },
            status=status.HTTP_200_OK,
        )


class ChatMessageReactionsView(AuthenticatedAPIView):
    """
    GET  /api/chat/messages/<message_id>/reactions/
    POST /api/chat/messages/<message_id>/reactions/
    """

    throttle_classes = [ChatReactionThrottle]

    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            reactions = list_message_reactions(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatMessageNotFoundError,
        ):
            return _message_not_found_response()

        except ChatReactionError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "reactions": reactions,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, message_id):
        serializer = CreateReactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            access_token = _get_access_token(request)

            reaction = create_chat_message_reaction(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                emoji=serializer.validated_data["emoji"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

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
            return _message_not_found_response()

        except ChatReactionError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "reaction": reaction,
            },
            status=status.HTTP_201_CREATED,
        )


class ChatMessageReactionDetailView(
    AuthenticatedAPIView,
):
    """
    DELETE /api/chat/messages/<message_id>/reactions/<emoji>/
            ?identity_id=<uuid>
    """

    throttle_classes = [ChatReactionThrottle]

    def delete(self, request, message_id, emoji):
        serializer = DeleteReactionQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            access_token = _get_access_token(request)

            delete_chat_message_reaction(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                message_id=str(message_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                emoji=emoji,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

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
            return _message_not_found_response()

        except ChatReactionError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class ChatGroupsView(AuthenticatedAPIView):
    """
    POST /api/chat/groups/
    """

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request):
        serializer = CreateChatGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            conversation = create_chat_group(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                creator_identity_id=str(
                    serializer.validated_data[
                        "creator_identity_id"
                    ]
                ),
                name=serializer.validated_data["name"],
                description=serializer.validated_data.get(
                    "description"
                ),
                image_file_id=(
                    str(
                        serializer.validated_data[
                            "image_file_id"
                        ]
                    )
                    if serializer.validated_data.get(
                        "image_file_id"
                    )
                    else None
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected creator identity is unavailable."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        except ChatGroupError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "conversation": conversation,
            },
            status=status.HTTP_201_CREATED,
        )


class ChatGroupInvitesView(AuthenticatedAPIView):
    """
    GET /api/chat/group-invites/
    """

    def get(self, request):
        serializer = ChatGroupInviteListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            identity_id = serializer.validated_data.get(
                "identity_id"
            )

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
            return _unauthorized_response()

        except ChatIdentityNotFoundError:
            return Response(
                {
                    "detail": "Chat identity was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except ChatGroupInviteError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            invites,
            status=status.HTTP_200_OK,
        )


class ChatGroupConversationInvitesView(
    AuthenticatedAPIView,
):
    """
    POST /api/chat/groups/<conversation_id>/invites/
    """

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request, conversation_id):
        serializer = CreateChatGroupInviteSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            expires_at = serializer.validated_data.get(
                "expires_at"
            )

            invite = invite_identity_to_chat_group(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                conversation_id=str(conversation_id),
                invited_identity_id=str(
                    serializer.validated_data[
                        "invited_identity_id"
                    ]
                ),
                expires_at=(
                    expires_at.isoformat()
                    if expires_at is not None
                    else None
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "Only the group creator can invite members."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        except ChatConversationNotFoundError:
            return _group_not_found_response()

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
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "invite": invite,
            },
            status=status.HTTP_201_CREATED,
        )


class ChatGroupInviteDetailView(AuthenticatedAPIView):
    """
    GET /api/chat/group-invites/<invite_id>/
    """

    def get(self, request, invite_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            invite = get_chat_group_invite(
                user_id=str(authenticated_user.id),
                invite_id=str(invite_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            ChatConversationAccessError,
            ChatGroupInviteError,
        ):
            return Response(
                {
                    "detail": "Group invitation was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "invite": invite,
            },
            status=status.HTTP_200_OK,
        )


class ChatGroupInviteResponseView(AuthenticatedAPIView):
    """
    POST /api/chat/group-invites/<invite_id>/response/
    """

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request, invite_id):
        serializer = RespondToChatGroupInviteSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            result = respond_to_chat_group_invite(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                invite_id=str(invite_id),
                accept=serializer.validated_data["accept"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return Response(
                {
                    "detail": "Group invitation was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except ChatGroupInviteError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class ChatGroupLeaveView(AuthenticatedAPIView):
    """
    POST /api/chat/groups/<conversation_id>/leave/
    """

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request, conversation_id):
        serializer = LeaveChatGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            leave_chat_group(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                conversation_id=str(conversation_id),
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot leave this group."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        except ChatConversationNotFoundError:
            return _group_not_found_response()

        except ChatGroupError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class ChatGroupParticipantDetailView(
    AuthenticatedAPIView,
):
    """
    DELETE /api/chat/groups/<conversation_id>/participants/<identity_id>/
    """

    throttle_classes = [ChatGroupMutationThrottle]

    def delete(
        self,
        request,
        conversation_id,
        identity_id,
    ):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            access_token = _get_access_token(request)

            remove_identity_from_chat_group(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                conversation_id=str(conversation_id),
                identity_id=str(identity_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "Only the group creator can remove members."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        except ChatConversationNotFoundError:
            return _group_not_found_response()

        except ChatGroupError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )