import logging

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CommercialChatConversationSerializer,
    UpdateCommercialProfilePublicationSerializer,
)
from apps.commercial.services.commercial_chat_conversation_service import (
    open_or_create_commercial_chat_conversation,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_profile_service import (
    update_commercial_profile_publication,
)
from apps.commercial.throttles import CommercialManageThrottle

logger = logging.getLogger(__name__)


class CommercialProfilePublicationView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def patch(self, request, profile_id):
        serializer = UpdateCommercialProfilePublicationSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(request)

            profile = update_commercial_profile_publication(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                profile_id=str(profile_id),
                publication_status=serializer.validated_data[
                    "publication_status"
                ],
                reason_code=serializer.validated_data.get("reason_code"),
                reason_text=serializer.validated_data.get("reason_text"),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )


class CommercialProfileChatView(AuthenticatedAPIView):
    def post(self, request, profile_id):
        try:
            user, access_token = self.get_authenticated_user_and_access_token(
                request,
            )
            result = open_or_create_commercial_chat_conversation(
                access_token=access_token,
                client_profile_id=str(user.id),
                commercial_profile_id=str(profile_id),
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            logger.warning(
                'commercial_chat_open_rejected '
                'profile_id=%s error_type=%s error=%s',
                profile_id,
                type(error).__name__,
                str(error),
            )
            return commercial_error_response(error)
        except Exception as error:
            logger.exception(
                'commercial_chat_open_failed '
                'profile_id=%s user_id=%s error_type=%s',
                profile_id,
                getattr(request.user, 'id', None),
                type(error).__name__,
            )
            return Response(
                {
                    'code': 'COMMERCIAL_CHAT_OPEN_FAILED',
                    'message': (
                        'No fue posible abrir el chat con el negocio. '
                        'Inténtalo nuevamente.'
                    ),
                    'details': None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = CommercialChatConversationSerializer(result)
        return Response(
            serializer.data,
            status=(
                status.HTTP_201_CREATED
                if result["created"]
                else status.HTTP_200_OK
            ),
        )
