from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.calls.exceptions import (
    CallAccessError,
    CallAuthenticationError,
    CallCapacityError,
    CallError,
    CallNotFoundError,
    CallStateError,
    CallTokenError,
    CallValidationError,
)
from apps.calls.throttles import (
    CallJoinThrottle,
    CallMutationThrottle,
    CallStartThrottle,
    CallUserRateThrottle,
)

from apps.calls.serializers import (
    CallDetailQuerySerializer,
    CallHistoryQuerySerializer,
    CancelCallJoinAttemptSerializer,
    ConfirmCallJoinedSerializer,
    DeclineDirectCallSerializer,
    EndCallSerializer,
    JoinCallSerializer,
    KickCallParticipantSerializer,
    LeaveCallSerializer,
    StartCallSerializer,
)
from apps.calls.services.call_service import (
    cancel_call_join_attempt,
    confirm_call_joined,
    create_call_session,
    decline_direct_call,
    end_call_session,
    get_active_call_for_conversation,
    get_call_history_for_conversation,
    get_call_session_detail,
    join_call_session,
    kick_call_participant,
    leave_call_session,
    refresh_call_rtc_token,
)


def _unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _call_error_response(error: CallError) -> Response:
    if isinstance(error, CallNotFoundError):
        http_status = status.HTTP_404_NOT_FOUND
    elif isinstance(error, (CallAccessError, CallAuthenticationError)):
        http_status = status.HTTP_403_FORBIDDEN
    elif isinstance(error, (CallCapacityError, CallStateError)):
        http_status = status.HTTP_409_CONFLICT
    elif isinstance(error, CallTokenError):
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    elif isinstance(error, CallValidationError):
        http_status = status.HTTP_400_BAD_REQUEST
    else:
        http_status = status.HTTP_400_BAD_REQUEST

    return Response(
        {
            "code": error.code,
            "message": str(error),
            "details": error.details,
        },
        status=http_status,
    )


class StartCallView(AuthenticatedAPIView):
    throttle_classes = [CallStartThrottle]
    """
    POST /api/calls/conversations/<conversation_id>/start/
    """

    def post(self, request, conversation_id: str):
        serializer = StartCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            result = create_call_session(
                access_token=access_token,
                conversation_id=conversation_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
                call_type=serializer.validated_data["call_type"],
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            result,
            status=status.HTTP_201_CREATED,
        )


class JoinCallView(AuthenticatedAPIView):
    throttle_classes = [CallJoinThrottle]
    """
    POST /api/calls/<call_id>/join/
    """

    def post(self, request, call_id: str):
        serializer = JoinCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            result = join_call_session(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class RefreshCallRtcTokenView(AuthenticatedAPIView):
    throttle_classes = [CallJoinThrottle]
    """
    POST /api/calls/<call_id>/refresh-token/
    """

    def post(self, request, call_id: str):
        serializer = JoinCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            result = refresh_call_rtc_token(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class ConfirmCallJoinedView(AuthenticatedAPIView):
    throttle_classes = [CallJoinThrottle]
    """
    POST /api/calls/<call_id>/confirm-joined/
    """

    def post(self, request, call_id: str):
        serializer = ConfirmCallJoinedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            participant = confirm_call_joined(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "participant": participant,
            },
            status=status.HTTP_200_OK,
        )


class CancelCallJoinAttemptView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]
    """
    POST /api/calls/<call_id>/cancel-join-attempt/
    """

    def post(self, request, call_id: str):
        serializer = CancelCallJoinAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            participant = cancel_call_join_attempt(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
                failure_reason=serializer.validated_data.get(
                    "failure_reason"
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "participant": participant,
            },
            status=status.HTTP_200_OK,
        )


class DeclineDirectCallView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]
    """
    POST /api/calls/<call_id>/decline/
    """

    def post(self, request, call_id: str):
        serializer = DeclineDirectCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            participant = decline_direct_call(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "participant": participant,
            },
            status=status.HTTP_200_OK,
        )


class KickCallParticipantView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]
    """
    POST /api/calls/<call_id>/kick/
    """

    def post(self, request, call_id: str):
        serializer = KickCallParticipantSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            participant = kick_call_participant(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
                target_identity_id=str(
                    serializer.validated_data[
                        "target_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "participant": participant,
            },
            status=status.HTTP_200_OK,
        )


class LeaveCallView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]
    """
    POST /api/calls/<call_id>/leave/
    """

    def post(self, request, call_id: str):
        serializer = LeaveCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            participant = leave_call_session(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "participant": participant,
            },
            status=status.HTTP_200_OK,
        )


class EndCallView(AuthenticatedAPIView):
    throttle_classes = [CallMutationThrottle]
    """
    POST /api/calls/<call_id>/end/
    """

    def post(self, request, call_id: str):
        serializer = EndCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            call = end_call_session(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "call": call,
            },
            status=status.HTTP_200_OK,
        )


class CallDetailView(AuthenticatedAPIView):
    throttle_classes = [CallUserRateThrottle]
    """
    GET /api/calls/<call_id>/?actor_identity_id=<uuid>
    """

    def get(self, request, call_id: str):
        serializer = CallDetailQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            detail = get_call_session_detail(
                access_token=access_token,
                call_id=call_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            detail,
            status=status.HTTP_200_OK,
        )


class ActiveCallForConversationView(AuthenticatedAPIView):
    throttle_classes = [CallUserRateThrottle]
    """
    GET /api/calls/conversations/<conversation_id>/active/
    """

    def get(self, request, conversation_id: str):
        serializer = CallDetailQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            call = get_active_call_for_conversation(
                access_token=access_token,
                conversation_id=conversation_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "call": call,
            },
            status=status.HTTP_200_OK,
        )


class CallHistoryForConversationView(AuthenticatedAPIView):
    throttle_classes = [CallUserRateThrottle]
    """
    GET /api/calls/conversations/<conversation_id>/history/
    """

    def get(self, request, conversation_id: str):
        serializer = CallHistoryQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(
                    request
                )
            )

            before_created_at = serializer.validated_data.get(
                "before_created_at"
            )

            calls = get_call_history_for_conversation(
                access_token=access_token,
                conversation_id=conversation_id,
                actor_identity_id=str(
                    serializer.validated_data[
                        "actor_identity_id"
                    ]
                ),
                limit=serializer.validated_data["limit"],
                before_created_at=(
                    before_created_at.isoformat()
                    if before_created_at is not None
                    else None
                ),
            )
        except AccountAuthenticationError:
            return _unauthorized_response()
        except CallError as error:
            return _call_error_response(error)

        return Response(
            {
                "calls": calls,
            },
            status=status.HTTP_200_OK,
        )
