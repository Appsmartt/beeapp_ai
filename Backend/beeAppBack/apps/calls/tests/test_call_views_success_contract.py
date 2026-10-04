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


class CallViewsSuccessContractTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def authenticated_view(self, view_class):
        return view_class.as_view()

    def test_view_throttles_are_preserved(self):
        expected_throttles = {
            StartCallView: [CallStartThrottle],
            JoinCallView: [CallJoinThrottle],
            RefreshCallRtcTokenView: [CallJoinThrottle],
            ConfirmCallJoinedView: [CallJoinThrottle],
            CancelCallJoinAttemptView: [CallMutationThrottle],
            DeclineDirectCallView: [CallMutationThrottle],
            KickCallParticipantView: [CallMutationThrottle],
            LeaveCallView: [CallMutationThrottle],
            EndCallView: [CallMutationThrottle],
            CallDetailView: [CallUserRateThrottle],
            ActiveCallForConversationView: [CallUserRateThrottle],
            CallHistoryForConversationView: [CallUserRateThrottle],
        }

        for view_class, throttle_classes in expected_throttles.items():
            self.assertEqual(
                view_class.throttle_classes,
                throttle_classes,
            )

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.start_and_query_views.create_call_session")
    def test_start_call_preserves_created_response(
        self,
        create_call_session,
        authenticate,
    ):
        create_call_session.return_value = {"call": {"id": CALL_ID}}
        request = self.factory.post(
            "/calls/start/",
            {
                "actor_identity_id": ACTOR_IDENTITY_ID,
                "call_type": "voice",
            },
            format="json",
        )

        response = self.authenticated_view(StartCallView)(
            request,
            conversation_id=CONVERSATION_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data, {"call": {"id": CALL_ID}})
        self.assertEqual(
            create_call_session.call_args.kwargs,
            {
                "access_token": "access-token",
                "conversation_id": CONVERSATION_ID,
                "actor_identity_id": ACTOR_IDENTITY_ID,
                "call_type": "voice",
            },
        )
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.participant_views.join_call_session")
    def test_join_call_preserves_ok_response(
        self,
        join_call_session,
        authenticate,
    ):
        join_call_session.return_value = {"agora": {"token": "token"}}
        request = self.factory.post(
            "/calls/join/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
            format="json",
        )

        response = self.authenticated_view(JoinCallView)(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"agora": {"token": "token"}},
        )
        self.assertEqual(
            join_call_session.call_args.kwargs,
            {
                "access_token": "access-token",
                "call_id": CALL_ID,
                "actor_identity_id": ACTOR_IDENTITY_ID,
            },
        )
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.start_and_query_views.get_call_history_for_conversation")
    def test_history_preserves_datetime_and_envelope(
        self,
        get_history,
        authenticate,
    ):
        get_history.return_value = [{"id": CALL_ID}]
        request = self.factory.get(
            "/calls/history/",
            {
                "actor_identity_id": ACTOR_IDENTITY_ID,
                "limit": 10,
                "before_created_at": "2026-10-04T12:00:00Z",
            },
        )

        response = self.authenticated_view(
            CallHistoryForConversationView
        )(
            request,
            conversation_id=CONVERSATION_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"calls": [{"id": CALL_ID}]},
        )
        self.assertEqual(
            get_history.call_args.kwargs,
            {
                "access_token": "access-token",
                "conversation_id": CONVERSATION_ID,
                "actor_identity_id": ACTOR_IDENTITY_ID,
                "limit": 10,
                "before_created_at": "2026-10-04T12:00:00+00:00",
            },
        )
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.participant_views.confirm_call_joined")
    def test_confirm_join_preserves_participant_envelope(
        self,
        confirm_call_joined,
        authenticate,
    ):
        participant = {
            "identity_id": ACTOR_IDENTITY_ID,
            "status": "joined",
        }
        confirm_call_joined.return_value = participant
        request = self.factory.post(
            "/calls/confirm-joined/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
            format="json",
        )

        response = self.authenticated_view(
            ConfirmCallJoinedView
        )(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"participant": participant},
        )
        authenticate.assert_called_once()

    @patch.object(
        AuthenticatedAPIView,
        "get_authenticated_user_and_access_token",
        return_value=(object(), "access-token"),
    )
    @patch("apps.calls.refactored_views.lifecycle_views.end_call_session")
    def test_end_call_preserves_call_envelope(
        self,
        end_call_session,
        authenticate,
    ):
        call = {"id": CALL_ID, "status": "ended"}
        end_call_session.return_value = call
        request = self.factory.post(
            "/calls/end/",
            {"actor_identity_id": ACTOR_IDENTITY_ID},
            format="json",
        )

        response = self.authenticated_view(EndCallView)(
            request,
            call_id=CALL_ID,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"call": call})
        authenticate.assert_called_once()
