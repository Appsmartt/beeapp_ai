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
    CreateChatGroupSerializer,
    DeactivateChatGroupSerializer,
    UpdateChatGroupSerializer,
)
from apps.chat.services.chat_group_service import (
    create_chat_group,
    deactivate_chat_group,
    update_chat_group,
)
from apps.chat.throttles import ChatGroupMutationThrottle
from apps.chat.views.refactored.common import (
    get_access_token,
    group_not_found_response,
    unauthorized_response,
)


class ChatGroupsView(AuthenticatedAPIView):
    """POST /api/chat/groups/."""

    throttle_classes = [ChatGroupMutationThrottle]

    def post(self, request):
        serializer = CreateChatGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            conversation = create_chat_group(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                creator_identity_id=str(
                    serializer.validated_data["creator_identity_id"]
                ),
                name=serializer.validated_data["name"],
                posting_policy=serializer.validated_data[
                    "posting_policy"
                ],
                description=serializer.validated_data.get(
                    "description"
                ),
                image_file_id=(
                    str(serializer.validated_data["image_file_id"])
                    if serializer.validated_data.get("image_file_id")
                    else None
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
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
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"conversation": conversation},
            status=status.HTTP_201_CREATED,
        )


class ChatGroupDetailView(AuthenticatedAPIView):
    """PATCH and DELETE group details."""

    sole_owner_only = False
    throttle_classes = [ChatGroupMutationThrottle]

    def patch(self, request, conversation_id):
        serializer = UpdateChatGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            image_file_id = serializer.validated_data.get(
                "image_file_id"
            )
            conversation = update_chat_group(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                name=serializer.validated_data.get("name"),
                description=serializer.validated_data.get(
                    "description"
                ),
                image_file_id=(
                    str(image_file_id)
                    if image_file_id is not None
                    else None
                ),
                posting_policy=serializer.validated_data.get(
                    "posting_policy"
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot update "
                        "this group."
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

    def delete(self, request, conversation_id):
        serializer = DeactivateChatGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            deactivate_chat_group(
                user_id=str(authenticated_user.id),
                access_token=get_access_token(request),
                conversation_id=str(conversation_id),
                owner_identity_id=str(
                    serializer.validated_data["owner_identity_id"]
                ),
                sole_owner_only=self.sole_owner_only,
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return Response(
                {
                    "detail": (
                        "The selected identity cannot deactivate "
                        "this group."
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


class ChatGroupSoleOwnerDeactivationView(ChatGroupDetailView):
    """DELETE a group only if its owner is the sole owner."""

    http_method_names = ["delete", "options"]
    sole_owner_only = True
