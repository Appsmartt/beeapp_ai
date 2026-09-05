from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import CommercialRequestTransitionSerializer
from apps.commercial.services.commercial_http_service import commercial_error_response
from apps.commercial.services.commercial_request_transition_service import (
    transition_commercial_request,
)
from apps.commercial.throttles import CommercialManageThrottle


class CommercialRequestTransitionView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request, request_id):
        serializer = CommercialRequestTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )

            result = transition_commercial_request(
                access_token=access_token,
                request_id=str(request_id),
                action=serializer.validated_data["action"],
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
                "request": result,
            },
            status=status.HTTP_200_OK,
        )
