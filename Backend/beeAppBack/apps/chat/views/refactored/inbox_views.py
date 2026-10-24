import logging

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatIdentityNotFoundError,
    ChatInboxError,
)
from apps.chat.serializers import (
    ChatInboxQuerySerializer,
    ChatTypedInboxQuerySerializer,
)
from apps.chat.services.chat_conversation import get_chat_inbox
from apps.chat.views.refactored.common import unauthorized_response


logger = logging.getLogger(__name__)


class ChatTypedInboxView(AuthenticatedAPIView):
    """GET /api/chat/inbox/by-type/ for unpinned conversations."""

    def get(self, request):
        serializer = ChatTypedInboxQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            data = serializer.validated_data
            identity_id = str(data["identity_id"])
            before_sort_at = data.get("before_sort_at")
            from apps.chat import views as public_views

            inbox = public_views.get_chat_unpinned_inbox_by_type(
                user_id=str(authenticated_user.id),
                access_token=public_views._get_access_token(request),
                identity_id=identity_id,
                conversation_type=data["conversation_type"],
                limit=data["limit"],
                before_sort_at=(
                    before_sort_at.isoformat()
                    if before_sort_at is not None
                    else None
                ),
                before_id=(
                    str(data["before_id"])
                    if data.get("before_id") is not None
                    else None
                ),
            )

            try:
                inbox = public_views.attach_chat_inbox_receipts(
                    inbox=inbox,
                    identity_id=identity_id,
                )
            except Exception:
                logger.warning(
                    "Could not enrich typed chat inbox receipts."
                )
                inbox = {
                    **inbox,
                    "conversations": [
                        {
                            **row,
                            "last_message_receipt_status": "sent",
                        }
                        for row in inbox.get("conversations", [])
                    ],
                }
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatIdentityNotFoundError,
            ChatConversationAccessError,
        ):
            return Response(
                {"detail": "Chat identity was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ChatInboxError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(inbox, status=status.HTTP_200_OK)


class ChatInboxView(AuthenticatedAPIView):
    """GET /api/chat/inbox/?identity_id=<uuid>&limit=50."""

    def get(self, request):
        serializer = ChatInboxQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            from apps.chat import views as public_views

            access_token = public_views._get_access_token(request)
            before_last_message_at = serializer.validated_data.get(
                "before_last_message_at"
            )
            identity_id = str(serializer.validated_data["identity_id"])
            inbox = get_chat_inbox(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                identity_id=identity_id,
                limit=serializer.validated_data["limit"],
                before_last_message_at=(
                    before_last_message_at.isoformat()
                    if before_last_message_at is not None
                    else None
                ),
            )

            try:
                inbox = public_views.attach_chat_inbox_receipts(
                    inbox=inbox,
                    identity_id=identity_id,
                )
            except Exception:
                logger.warning(
                    "Could not enrich chat inbox message receipts."
                )
                inbox = {
                    **inbox,
                    "conversations": [
                        {
                            **row,
                            "last_message_receipt_status": "sent",
                        }
                        for row in inbox.get("conversations", [])
                    ],
                    "pinned_conversations": [
                        {
                            **row,
                            "last_message_receipt_status": "sent",
                        }
                        for row in inbox.get(
                            "pinned_conversations",
                            [],
                        )
                    ],
                }
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatIdentityNotFoundError,
            ChatConversationAccessError,
        ):
            return Response(
                {"detail": "Chat identity was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ChatInboxError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(inbox, status=status.HTTP_200_OK)
