from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CreateCommercialRequestSerializer,
    ListCommercialRequestsQuerySerializer,
)
from apps.commercial.services.commercial_http_service import commercial_error_response
from apps.commercial.services.commercial_request_service import (
    create_commercial_request,
    get_commercial_request_detail,
    list_commercial_requests,
)
from apps.commercial.throttles import CommercialManageThrottle


class CommercialRequestsView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]


    def get(self, request, request_id=None):
        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )

            if request_id is None:
                serializer = ListCommercialRequestsQuerySerializer(
                    data=request.query_params,
                )
                serializer.is_valid(raise_exception=True)

                requests = list_commercial_requests(
                    access_token=access_token,
                    statuses=serializer.validated_data.get("status"),
                    limit=serializer.validated_data["limit"],
                    offset=serializer.validated_data["offset"],
                )

                return Response(
                    {
                        "requests": requests,
                        "count": len(requests),
                        "limit": serializer.validated_data["limit"],
                        "offset": serializer.validated_data["offset"],
                    },
                    status=status.HTTP_200_OK,
                )

            detail = get_commercial_request_detail(
                access_token=access_token,
                request_id=str(request_id),
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
                "request": detail,
            },
            status=status.HTTP_200_OK,
        )

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
