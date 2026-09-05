from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import CreateCommercialRequestSerializer
from apps.commercial.services.commercial_http_service import commercial_error_response
from apps.commercial.services.commercial_request_service import (
    create_commercial_request,
)
from apps.commercial.throttles import CommercialManageThrottle


class CommercialRequestsView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request):
        serializer = CreateCommercialRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )

            result = create_commercial_request(
                access_token=access_token,
                idempotency_key=request.headers.get("Idempotency-Key"),
                payload=serializer.validated_data,
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

        response_status = (
            status.HTTP_200_OK
            if result.get("idempotent")
            else status.HTTP_201_CREATED
        )

        return Response(
            {
                "request": result,
                "idempotent": bool(result.get("idempotent", False)),
            },
            status=response_status,
        )
