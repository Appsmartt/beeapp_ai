from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_payment_proof_access_service import (
    get_commercial_payment_proof_access,
)
from apps.commercial.throttles import CommercialEvidenceThrottle


class CommercialPaymentProofAccessView(AuthenticatedAPIView):
    throttle_classes = [CommercialEvidenceThrottle]

    def get(self, request, payment_proof_id):
        download_value = str(
            request.query_params.get("download") or ""
        ).strip().lower()

        download = download_value in {"1", "true", "yes"}

        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )
            result = get_commercial_payment_proof_access(
                access_token=access_token,
                payment_proof_id=str(payment_proof_id),
                download=download,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)
