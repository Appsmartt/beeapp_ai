from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import SubmitCommercialPaymentProofSerializer
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_payment_proof_service import (
    submit_commercial_payment_proof,
)
from apps.commercial.throttles import CommercialEvidenceThrottle


class CommercialPaymentProofsView(AuthenticatedAPIView):
    throttle_classes = [CommercialEvidenceThrottle]

    def post(self, request, request_id):
        serializer = SubmitCommercialPaymentProofSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )

            result = submit_commercial_payment_proof(
                access_token=access_token,
                commerce_request_id=request_id,
                file_id=serializer.validated_data["file_id"],
                payment_method_id=serializer.validated_data[
                    "payment_method_id"
                ],
                payment_reference=serializer.validated_data.get(
                    "payment_reference"
                ),
                note=serializer.validated_data.get("note"),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_201_CREATED)
