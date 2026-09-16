from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CloseCommercialRequestItemSerializer,
    CreateCommercialRequestItemProposalSerializer,
    UpdateCommercialRequestItemOperationalStatusSerializer,
    WithdrawCommercialRequestItemProposalSerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_request_item_service import (
    accept_commercial_request_item_proposal,
    close_commercial_request_item,
    create_commercial_request_item_proposal,
    update_commercial_request_item_operational_status,
    withdraw_commercial_request_item_proposal,
)
from apps.commercial.throttles import (
    CommercialManageThrottle,
    CommercialNegotiationThrottle,
)


class CommercialRequestItemProposalCreateView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, item_id):
        serializer = CreateCommercialRequestItemProposalSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = create_commercial_request_item_proposal(
                access_token=access_token,
                item_id=str(item_id),
                payload=serializer.validated_data,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_201_CREATED)


class CommercialRequestItemProposalAcceptView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, proposal_id):
        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = accept_commercial_request_item_proposal(
                access_token=access_token,
                proposal_id=str(proposal_id),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class CommercialRequestItemProposalWithdrawView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, proposal_id):
        serializer = WithdrawCommercialRequestItemProposalSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = withdraw_commercial_request_item_proposal(
                access_token=access_token,
                proposal_id=str(proposal_id),
                reason_text=serializer.validated_data.get(
                    "reason_text",
                ),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class CommercialRequestItemCloseView(AuthenticatedAPIView):
    throttle_classes = [CommercialNegotiationThrottle]

    def post(self, request, item_id):
        serializer = CloseCommercialRequestItemSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = close_commercial_request_item(
                access_token=access_token,
                item_id=str(item_id),
                action=serializer.validated_data["action"],
                reason_code=serializer.validated_data.get(
                    "reason_code",
                ),
                reason_text=serializer.validated_data.get(
                    "reason_text",
                ),
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class CommercialRequestItemOperationalStatusView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request, item_id):
        serializer = (
            UpdateCommercialRequestItemOperationalStatusSerializer(
                data=request.data,
            )
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = (
                update_commercial_request_item_operational_status(
                    access_token=access_token,
                    item_id=str(item_id),
                    next_status=serializer.validated_data[
                        "next_status"
                    ],
                    reason_text=serializer.validated_data.get(
                        "reason_text",
                    ),
                )
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)
