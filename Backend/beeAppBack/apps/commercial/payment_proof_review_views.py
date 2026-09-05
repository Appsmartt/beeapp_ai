from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    ReviewCommercialPaymentProofSerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_payment_proof_review_service import (
    review_commercial_payment_proof,
)
from apps.commercial.throttles import CommercialManageThrottle


class CommercialPaymentProofReviewView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request, payment_proof_id):
        serializer = ReviewCommercialPaymentProofSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )

            result = review_commercial_payment_proof(
                access_token=access_token,
                payment_proof_id=str(payment_proof_id),
                decision=serializer.validated_data["decision"],
                rejection_reason=serializer.validated_data.get(
                    "rejection_reason"
                ),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)
