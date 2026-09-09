from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CompleteCommercialRequestSerializer,
    ListOwnedCommercialRequestsQuerySerializer,
    RejectCommercialRequestProposalSerializer,
    ReplaceCommercialPaymentProofSerializer,
    WithdrawCommercialRequestProposalSerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_request_operations_service import (
    accept_commercial_request_proposal,
    complete_commercial_request,
    get_commercial_request_formal_detail,
    get_commercial_request_timeline,
    list_owned_commercial_requests,
    reject_commercial_request_proposal,
    replace_commercial_payment_proof,
    withdraw_commercial_request_proposal,
)
from apps.commercial.throttles import (
    CommercialEvidenceThrottle,
    CommercialManageThrottle,
    CommercialNegotiationThrottle,
)


class OwnedCommercialRequestsView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def get(self, request, profile_id):
        serializer = ListOwnedCommercialRequestsQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request,
                )
            )
            requests = list_owned_commercial_requests(
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                statuses=serializer.validated_data.get("status"),
                limit=serializer.validated_data["limit"],
                offset=serializer.validated_data["offset"],
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {
                "commercial_profile_id": str(profile_id),
                "requests": requests,
                "count": len(requests),
                "limit": serializer.validated_data["limit"],
                "offset": serializer.validated_data["offset"],
            },
            status=status.HTTP_200_OK,
        )


class CommercialRequestFormalDetailView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def get(self, request, request_id):
        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )
            detail = get_commercial_request_formal_detail(
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
            detail,
            status=status.HTTP_200_OK,
        )


class CommercialRequestTimelineView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def get(self, request, request_id):
        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request,
                )
            )
            timeline = get_commercial_request_timeline(
                access_token=access_token,
                request_id=str(request_id),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {"timeline": timeline},
            status=status.HTTP_200_OK,
        )


class CommercialRequestProposalAcceptView(AuthenticatedAPIView):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, proposal_id):
        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request,
                )
            )
            result = accept_commercial_request_proposal(
                access_token=access_token,
                proposal_id=str(proposal_id),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class CommercialRequestProposalRejectView(AuthenticatedAPIView):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, proposal_id):
        serializer = RejectCommercialRequestProposalSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request,
                )
            )
            result = reject_commercial_request_proposal(
                access_token=access_token,
                proposal_id=str(proposal_id),
                rejection_reason=serializer.validated_data.get(
                    "rejection_reason",
                ),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class CommercialRequestProposalWithdrawView(AuthenticatedAPIView):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, proposal_id):
        serializer = WithdrawCommercialRequestProposalSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request,
                )
            )
            result = withdraw_commercial_request_proposal(
                access_token=access_token,
                proposal_id=str(proposal_id),
                withdrawal_reason=serializer.validated_data.get(
                    "withdrawal_reason",
                ),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class CommercialPaymentProofReplaceView(AuthenticatedAPIView):
    throttle_classes = [CommercialEvidenceThrottle]

    def post(self, request, payment_proof_id):
        serializer = ReplaceCommercialPaymentProofSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request,
                )
            )
            result = replace_commercial_payment_proof(
                access_token=access_token,
                rejected_payment_proof_id=str(payment_proof_id),
                file_id=serializer.validated_data["file_id"],
                payment_method_id=serializer.validated_data.get(
                    "payment_method_id",
                ),
                payment_reference=serializer.validated_data.get(
                    "payment_reference",
                ),
                note=serializer.validated_data.get("note"),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_201_CREATED)


class CommercialRequestCompleteView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request, request_id):
        serializer = CompleteCommercialRequestSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request,
                )
            )
            result = complete_commercial_request(
                access_token=access_token,
                request_id=str(request_id),
                completion_note=serializer.validated_data.get(
                    "completion_note",
                ),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)
