from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_payment_flow_service import (
    list_commercial_request_payment_methods,
    request_commercial_payment,
)
from apps.commercial.throttles import (
    CommercialEvidenceThrottle,
    CommercialNegotiationThrottle,
)


class CommercialRequestPaymentView(AuthenticatedAPIView):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, request_id):
        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )
            result = request_commercial_payment(
                access_token=access_token,
                commerce_request_id=request_id,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class CommercialRequestPaymentMethodsView(AuthenticatedAPIView):
    throttle_classes = [CommercialEvidenceThrottle]

    def get(self, request, request_id):
        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )
            result = list_commercial_request_payment_methods(
                access_token=access_token,
                commerce_request_id=request_id,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)
