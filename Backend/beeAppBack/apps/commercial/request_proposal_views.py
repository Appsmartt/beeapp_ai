from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import CreateCommercialRequestProposalSerializer
from apps.commercial.services.commercial_http_service import commercial_error_response
from apps.commercial.services.commercial_request_proposal_service import (
    create_commercial_request_proposal,
)
from apps.commercial.throttles import CommercialManageThrottle


class CommercialRequestProposalsView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request, request_id):
        serializer = CreateCommercialRequestProposalSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = self.get_authenticated_user_and_access_token(
                request
            )

            proposal = create_commercial_request_proposal(
                access_token=access_token,
                request_id=str(request_id),
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

        return Response(
            {
                "proposal": proposal,
            },
            status=status.HTTP_201_CREATED,
        )
