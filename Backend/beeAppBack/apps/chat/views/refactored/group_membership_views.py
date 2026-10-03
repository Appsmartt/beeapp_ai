from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
    ChatGroupError,
)
from apps.chat.serializers import (
    LeaveChatGroupSerializer,
    RemoveChatGroupParticipantSerializer,
    SetChatGroupParticipantRoleSerializer,
    TransferChatGroupOwnershipSerializer,
)
from apps.chat.services.chat_group import (
    leave_chat_group,
    remove_identity_from_chat_group,
    set_chat_group_participant_role,
    transfer_chat_group_ownership,
)
from apps.chat.throttles import ChatGroupMutationThrottle
from apps.chat.views.refactored.common import (
    get_access_token,
    group_not_found_response,
    unauthorized_response,
)


class ChatGroupOwnershipTransferView(AuthenticatedAPIView):
    """POST group ownership transfer."""

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request, conversation_id):
        serializer = TransferChatGroupOwnershipSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            conversation = transfer_chat_group_ownership(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                current_owner_identity_id=str(
                    serializer.validated_data[
                        "current_owner_identity_id"
                    ]
                ),
                new_owner_identity_id=str(
                    serializer.validated_data[
                        "new_owner_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot transfer "
                        "group ownership."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return group_not_found_response()
        except ChatGroupError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"conversation": conversation},
            status=status.HTTP_200_OK,
        )


class ChatGroupLeaveView(AuthenticatedAPIView):
    """POST leave group."""

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request, conversation_id):
        serializer = LeaveChatGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            leave_chat_group(
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
                        "The selected identity cannot leave this group."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return group_not_found_response()
        except ChatGroupError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatGroupParticipantRoleView(AuthenticatedAPIView):
    """PATCH a group participant role."""

    throttle_classes = [ChatGroupMutationThrottle]

    def patch(self, request, conversation_id, identity_id):
        serializer = SetChatGroupParticipantRoleSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            conversation = set_chat_group_participant_role(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                target_identity_id=str(identity_id),
                role=serializer.validated_data["role"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot change "
                        "this participant role."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return group_not_found_response()
        except ChatGroupError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"conversation": conversation},
            status=status.HTTP_200_OK,
        )


class ChatGroupParticipantDetailView(AuthenticatedAPIView):
    """DELETE a group participant."""

    throttle_classes = [ChatGroupMutationThrottle]

    def delete(self, request, conversation_id, identity_id):
        serializer = RemoveChatGroupParticipantSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            remove_identity_from_chat_group(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                target_identity_id=str(identity_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot remove "
                        "this participant."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except ChatConversationNotFoundError:
            return group_not_found_response()
        except ChatGroupError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
