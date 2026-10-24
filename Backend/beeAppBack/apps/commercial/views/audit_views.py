from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import CommercialAuditEventsQuerySerializer
from apps.commercial.services.commercial_audit_service import (
    list_owned_commercial_audit_events,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.throttles import CommercialExploreThrottle


class CommercialProfileAuditEventsView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        serializer = CommercialAuditEventsQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            entity_id = serializer.validated_data.get(
                "entity_id"
            )

            result = list_owned_commercial_audit_events(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                entity_type=serializer.validated_data.get(
                    "entity_type"
                ),
                entity_id=(
                    str(entity_id)
                    if entity_id is not None
                    else None
                ),
                action=serializer.validated_data.get("action"),
                limit=serializer.validated_data["limit"],
                offset=serializer.validated_data["offset"],
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
            result,
            status=status.HTTP_200_OK,
        )
