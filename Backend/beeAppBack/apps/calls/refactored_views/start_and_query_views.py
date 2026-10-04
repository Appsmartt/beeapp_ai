from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.calls.exceptions import CallError
from apps.calls.serializers import (
    CallDetailQuerySerializer,
    CallHistoryQuerySerializer,
    StartCallSerializer,
)
from apps.calls.services.call_session import (
    create_call_session,
    get_active_call_for_conversation,
    get_call_history_for_conversation,
    get_call_session_detail,
)
from apps.calls.throttles import CallStartThrottle, CallUserRateThrottle
from apps.calls.refactored_views.common import (
    call_error_response,
    unauthorized_response,
)


class StartCallView(AuthenticatedAPIView):
    throttle_classes = [CallStartThrottle]

    def post(self, request, conversation_id: str):
        serializer = StartCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            result = create_call_session(
                access_token=access_token,
                conversation_id=conversation_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                call_type=serializer.validated_data["call_type"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except CallError as error:
            return call_error_response(error)

        return Response(result, status=status.HTTP_201_CREATED)


class CallDetailView(AuthenticatedAPIView):
    throttle_classes = [CallUserRateThrottle]

    def get(self, request, call_id: str):
        serializer = CallDetailQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            detail = get_call_session_detail(
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

        return Response(detail, status=status.HTTP_200_OK)


class ActiveCallForConversationView(AuthenticatedAPIView):
    throttle_classes = [CallUserRateThrottle]

    def get(self, request, conversation_id: str):
        serializer = CallDetailQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            call = get_active_call_for_conversation(
                access_token=access_token,
                conversation_id=conversation_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except CallError as error:
            return call_error_response(error)

        return Response({"call": call}, status=status.HTTP_200_OK)


class CallHistoryForConversationView(AuthenticatedAPIView):
    throttle_classes = [CallUserRateThrottle]

    def get(self, request, conversation_id: str):
        serializer = CallHistoryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        try:
            _, access_token = (
                self.get_authenticated_user_and_access_token(request)
            )
            before_created_at = serializer.validated_data.get(
                "before_created_at"
            )
            calls = get_call_history_for_conversation(
                access_token=access_token,
                conversation_id=conversation_id,
                actor_identity_id=str(
                    serializer.validated_data["actor_identity_id"]
                ),
                limit=serializer.validated_data["limit"],
                before_created_at=(
                    before_created_at.isoformat()
                    if before_created_at is not None
                    else None
                ),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except CallError as error:
            return call_error_response(error)

        return Response({"calls": calls}, status=status.HTTP_200_OK)
