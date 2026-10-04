import logging

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatIdentityError,
    ChatIdentityNotFoundError,
    ChatRecipientNotFoundError,
)
from apps.chat.serializers import ChatRecipientSearchQuerySerializer
from apps.chat.services.chat_contact_profile_service import (
    get_chat_contact_profile,
)
from apps.chat.services.recipient_search import (
    search_chat_recipients,
)
from apps.chat.throttles import ChatRecipientSearchThrottle
from apps.chat.views.refactored.common import unauthorized_response


logger = logging.getLogger(__name__)


class ChatRecipientSearchView(AuthenticatedAPIView):
    """GET /api/chat/recipients/search/."""

    throttle_classes = [ChatRecipientSearchThrottle]

    def get(self, request):
        serializer = ChatRecipientSearchQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            result = search_chat_recipients(
                user_id=str(authenticated_user.id),
                query=serializer.validated_data["q"],
                limit=serializer.validated_data["limit"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except ChatIdentityError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ChatRecipientNotFoundError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception(
                "chat_recipient_search_request_failed",
                extra={
                    "query": serializer.validated_data.get("q"),
                    "limit": serializer.validated_data.get("limit"),
                },
            )
            return Response(
                {
                    "detail": (
                        "No pudimos completar la búsqueda. "
                        "Inténtalo nuevamente."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(result, status=status.HTTP_200_OK)


class ChatContactProfileView(AuthenticatedAPIView):
    """GET /api/chat/contacts/<identity_id>/profile/."""

    def get(self, request, identity_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            contact = get_chat_contact_profile(
                user_id=str(authenticated_user.id),
                identity_id=str(identity_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            ChatConversationAccessError,
            ChatIdentityNotFoundError,
        ):
            return Response(
                {"detail": "Contact was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception:
            return Response(
                {"detail": "Could not retrieve contact profile."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"contact": contact},
            status=status.HTTP_200_OK,
        )
