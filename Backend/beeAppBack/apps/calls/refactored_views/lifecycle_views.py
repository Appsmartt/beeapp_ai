from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.calls.exceptions import CallError
from apps.calls.serializers import (
    DeclineDirectCallSerializer,
    EndCallSerializer,
    KickCallParticipantSerializer,
    LeaveCallSerializer,
)
from apps.calls.services.call_session import (
    decline_direct_call,
    end_call_session,
    kick_call_participant,
    leave_call_session,
)
from apps.calls.throttles import CallMutationThrottle
from apps.calls.refactored_views.common import (
    call_error_response,
    unauthorized_response,
)


class DeclineDirectCallView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]

    def post(self, request, call_id: str):
        serializer = DeclineDirectCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            participant = decline_direct_call(
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


class KickCallParticipantView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]

    def post(self, request, call_id: str):
        serializer = KickCallParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            participant = kick_call_participant(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                target_identity_id=str(
                    serializer.validated_data["target_identity_id"]
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


class LeaveCallView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]

    def post(self, request, call_id: str):
        serializer = LeaveCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            participant = leave_call_session(
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


class EndCallView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]

    def post(self, request, call_id: str):
        serializer = EndCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            call = end_call_session(
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

        return Response({"call": call}, status=status.HTTP_200_OK)
