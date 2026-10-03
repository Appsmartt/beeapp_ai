from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatError,
    ChatIdentityError,
)
from apps.chat.serializers import (
    ChatBootstrapSerializer,
    ChatIdentityListQuerySerializer,
    ChatSyncBootstrapQuerySerializer,
    ChatSyncChangesQuerySerializer,
)
from apps.chat.services.chat_identity_service import (
    list_chat_identities,
    sync_chat_identities_for_user,
)
from apps.chat.services.chat_sync_service import (
    get_chat_sync_bootstrap,
    get_chat_sync_changes,
)
from apps.chat.throttles import ChatSyncThrottle

from apps.chat.views.refactored.common import (
    get_access_token,
    unauthorized_response,
)


class ChatBootstrapView(AuthenticatedAPIView):
    """POST /api/chat/bootstrap/."""

    def post(self, request):
        serializer = ChatBootstrapSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            identities = sync_chat_identities_for_user(
                user_id=str(authenticated_user.id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatIdentityError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"identities": identities},
            status=status.HTTP_200_OK,
        )


class ChatSyncBootstrapView(AuthenticatedAPIView):
    """GET /api/chat/sync/bootstrap/."""

    throttle_classes = [ChatSyncThrottle]

    def get(self, request):
        serializer = ChatSyncBootstrapQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            access_token = get_access_token(request)
            messages_since = serializer.validated_data[
                "messages_since"
            ]
            bootstrap = get_chat_sync_bootstrap(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                direct_limit=serializer.validated_data[
                    "direct_limit"
                ],
                group_limit=serializer.validated_data["group_limit"],
                messages_since=(
                    messages_since.isoformat()
                    if messages_since is not None
                    else None
                ),
                messages_per_conversation=(
                    serializer.validated_data[
                        "messages_per_conversation"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return unauthorized_response()
        except ChatError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(bootstrap, status=status.HTTP_200_OK)


class ChatSyncChangesView(AuthenticatedAPIView):
    """GET /api/chat/sync/changes/."""

    throttle_classes = [ChatSyncThrottle]

    def get(self, request):
        serializer = ChatSyncChangesQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            access_token = get_access_token(request)
            changes = get_chat_sync_changes(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                after_event_sequence=serializer.validated_data[
                    "after_event_sequence"
                ],
                limit=serializer.validated_data["limit"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatConversationAccessError:
            return unauthorized_response()
        except ChatError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(changes, status=status.HTTP_200_OK)


class ChatIdentitiesView(AuthenticatedAPIView):
    """GET /api/chat/identities/?active_only=true."""

    def get(self, request):
        serializer = ChatIdentityListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            identities = list_chat_identities(
                user_id=str(authenticated_user.id),
                active_only=serializer.validated_data["active_only"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatIdentityError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"identities": identities},
            status=status.HTTP_200_OK,
        )
