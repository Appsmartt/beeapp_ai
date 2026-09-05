from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import CreateCommercialReservationHoldSerializer
from apps.commercial.services.commercial_http_service import commercial_error_response
from apps.commercial.services.commercial_reservation_service import (
    create_commercial_reservation_hold,
)
from apps.commercial.throttles import CommercialBookingThrottle


class CommercialReservationHoldView(AuthenticatedAPIView):
    throttle_classes = [CommercialBookingThrottle]

    def post(self, request, request_id):
        serializer = CreateCommercialReservationHoldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )

            result = create_commercial_reservation_hold(
                access_token=access_token,
                commerce_request_id=request_id,
                starts_at=serializer.validated_data["starts_at"].isoformat(),
                timezone=serializer.validated_data["timezone"],
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_201_CREATED)
