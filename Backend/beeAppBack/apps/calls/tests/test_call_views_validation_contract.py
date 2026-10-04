from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.calls.exceptions import (
    CallAccessError,
    CallCapacityError,
    CallNotFoundError,
    CallTokenError,
)
from apps.calls.throttles import (
    CallJoinThrottle,
    CallMutationThrottle,
    CallStartThrottle,
    CallUserRateThrottle,
)
from apps.calls.refactored_views import (
    ActiveCallForConversationView,
    CallDetailView,
    CallHistoryForConversationView,
    CancelCallJoinAttemptView,
    ConfirmCallJoinedView,
    DeclineDirectCallView,
    EndCallView,
    JoinCallView,
    KickCallParticipantView,
    LeaveCallView,
    RefreshCallRtcTokenView,
    StartCallView,
)


ACTOR_IDENTITY_ID = "11111111-1111-1111-1111-111111111111"
TARGET_IDENTITY_ID = "22222222-2222-2222-2222-222222222222"
CALL_ID = "33333333-3333-3333-3333-333333333333"
CONVERSATION_ID = "44444444-4444-4444-4444-444444444444"


class CallViewsValidationAndErrorContractTests(
    SimpleTestCase
):
    def setUp(self):
        self.factory = APIRequestFactory()

    def authenticated_view(self, view_class):
        return view_class.as_view()
    def test_invalid_payload_stays_bad_request(self):
        request = self.factory.post(
            "/calls/start/",
            {
                "actor_identity_id": ACTOR_IDENTITY_ID,
                "call_type": "screen",
            },
            format="json",
        )

        response = self.authenticated_view(StartCallView)(
            request,
            conversation_id=CONVERSATION_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("call_type", response.data)

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        side_effect=AccountAuthenticationError(),
    )
    def test_invalid_authentication_stays_unauthorized(
        self,
        authenticate,
    ):
        request = self.factory.post(
            "/calls/join/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
            format="json",
        )

        response = self.authenticated_view(JoinCallView)(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data,
            {"detail": "Invalid or expired access token."},
        )
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.start_and_query_views.get_call_session_detail")
    def test_not_found_call_error_stays_not_found(
        self,
        get_call_session_detail,
        authenticate,
    ):
        get_call_session_detail.side_effect = CallNotFoundError(
            "Call was not found."
        )
        request = self.factory.get(
            "/calls/detail/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
        )

        response = self.authenticated_view(CallDetailView)(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "CALL_NOT_FOUND")
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.lifecycle_views.leave_call_session")
    def test_access_error_stays_forbidden(
        self,
        leave_call_session,
        authenticate,
    ):
        leave_call_session.side_effect = CallAccessError("Forbidden.")
        request = self.factory.post(
            "/calls/leave/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
            format="json",
        )

        response = self.authenticated_view(LeaveCallView)(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "NOT_AUTHORIZED")
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.participant_views.join_call_session")
    def test_capacity_error_stays_conflict(
        self,
        join_call_session,
        authenticate,
    ):
        join_call_session.side_effect = CallCapacityError("Call is full.")
        request = self.factory.post(
            "/calls/join/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
            format="json",
        )

        response = self.authenticated_view(JoinCallView)(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "CALL_FULL")
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.participant_views.refresh_call_rtc_token")
    def test_token_error_stays_service_unavailable(
        self,
        refresh_call_rtc_token,
        authenticate,
    ):
        refresh_call_rtc_token.side_effect = CallTokenError(
            "Token service unavailable."
        )
        request = self.factory.post(
            "/calls/refresh-token/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
            format="json",
        )

        response = self.authenticated_view(
            RefreshCallRtcTokenView
        )(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        self.assertEqual(
            response.data["code"],
            "RTC_TOKEN_GENERATION_FAILED",
        )
        authenticate.assert_called_once()
