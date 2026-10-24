from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.calls.exceptions import CallError
from apps.calls.serializers import (
    CancelCallJoinAttemptSerializer,
    ConfirmCallJoinedSerializer,
    JoinCallSerializer,
)
from apps.calls.services.call_session import (
    cancel_call_join_attempt,
    confirm_call_joined,
    join_call_session,
    refresh_call_rtc_token,
)
from apps.calls.throttles import CallJoinThrottle, CallMutationThrottle
from apps.calls.refactored_views.common import (
    call_error_response,
    unauthorized_response,
)


class JoinCallView(AuthenticatedAPIView):
    throttle_classes = [CallJoinThrottle]

    def post(self, request, call_id: str):
        serializer = JoinCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = join_call_session(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except CallError as error:
            return call_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class RefreshCallRtcTokenView(AuthenticatedAPIView):
    throttle_classes = [CallJoinThrottle]

    def post(self, request, call_id: str):
        serializer = JoinCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = refresh_call_rtc_token(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except CallError as error:
            return call_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class ConfirmCallJoinedView(AuthenticatedAPIView):
    throttle_classes = [CallJoinThrottle]

    def post(self, request, call_id: str):
        serializer = ConfirmCallJoinedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            participant = confirm_call_joined(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except CallError as error:
            return call_error_response(error)

        return Response(
            {"participant": participant},
            status=status.HTTP_200_OK,
        )


class CancelCallJoinAttemptView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]

    def post(self, request, call_id: str):
        serializer = CancelCallJoinAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            participant = cancel_call_join_attempt(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                failure_reason=serializer.validated_data.get(
                    "failure_reason"
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except CallError as error:
            return call_error_response(error)

        return Response(
            {"participant": participant},
            status=status.HTTP_200_OK,
        )
