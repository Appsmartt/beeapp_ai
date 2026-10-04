from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.calls.exceptions import (
    CallAccessError,
    CallStateError,
    CallValidationError,
)
from apps.calls.services.call_session import (
    get_active_call_for_conversation,
    get_call_history_for_conversation,
)
from apps.calls.services.call_session.lifecycle_service import (
    cancel_call_join_attempt,
    create_call_session,
    join_call_session,
    kick_call_participant,
    refresh_call_rtc_token,
)
from apps.calls.services.call_session.validation_service import (
    normalize_call_type,
    normalize_required_value,
)


ACTOR_IDENTITY_ID = "11111111-1111-1111-1111-111111111111"
RECIPIENT_IDENTITY_ID = "22222222-2222-2222-2222-222222222222"
CALL_ID = "33333333-3333-3333-3333-333333333333"
CONVERSATION_ID = "44444444-4444-4444-4444-444444444444"


def build_call_detail(
    *,
    conversation_type="direct",
    call_status="ringing",
    participant_status="invited",
    include_actor=True,
):
    participants = [
        {
            "identity_id": RECIPIENT_IDENTITY_ID,
            "agora_uid": 202,
            "status": "invited",
        }
    ]
    if include_actor:
        participants.insert(
            0,
            {
                "identity_id": ACTOR_IDENTITY_ID,
                "agora_uid": 101,
                "status": participant_status,
            },
        )

    return {
        "call": {
            "id": CALL_ID,
            "conversation_id": CONVERSATION_ID,
            "conversation_type": conversation_type,
            "call_type": "voice",
            "status": call_status,
            "agora_channel_name": "beeapp_test_channel",
        },
        "participants": participants,
        "can_end_call": True,
        "can_kick_participants": True,
    }


def build_token():
    return SimpleNamespace(
        app_id="agora-app-id",
        channel_name="beeapp_test_channel",
        agora_uid=101,
        token="agora-token",
        expires_at=1234567890,
    )


class CallSessionValidationTests(SimpleTestCase):
    def test_normalize_required_value_rejects_blank_value(self):
        with self.assertRaises(CallValidationError):
            normalize_required_value("", field_name="Call ID")

    def test_normalize_call_type_normalizes_allowed_value(self):
        self.assertEqual(normalize_call_type(" VIDEO "), "video")

    def test_normalize_call_type_rejects_unsupported_value(self):
        with self.assertRaises(CallValidationError):
            normalize_call_type("screen")


class CallSessionQueryTests(SimpleTestCase):
    @patch(
        "apps.calls.services.call_session.query_service.execute_call_rpc"
    )
    def test_active_call_returns_first_rpc_row(self, execute_call_rpc):
        execute_call_rpc.return_value = [{"id": CALL_ID}]

        result = get_active_call_for_conversation(
            access_token="access-token",
            conversation_id=CONVERSATION_ID,
            actor_identity_id=ACTOR_IDENTITY_ID,
        )

        self.assertEqual(result, {"id": CALL_ID})
        execute_call_rpc.assert_called_once()

    @patch(
        "apps.calls.services.call_session.query_service.execute_call_rpc"
    )
    def test_history_rejects_out_of_range_limit(self, execute_call_rpc):
        with self.assertRaises(CallValidationError):
            get_call_history_for_conversation(
                access_token="access-token",
                conversation_id=CONVERSATION_ID,
                actor_identity_id=ACTOR_IDENTITY_ID,
                limit=101,
            )

        execute_call_rpc.assert_not_called()


class CallSessionLifecycleTests(SimpleTestCase):
    @patch(
        "apps.calls.services.call_session.lifecycle_service."
        "send_incoming_direct_call_notification"
    )
    @patch(
        "apps.calls.services.call_session.lifecycle_service."
        "build_join_credentials"
    )
    @patch(
        "apps.calls.services.call_session.lifecycle_service.get_call_detail"
    )
    @patch(
        "apps.calls.services.call_session.lifecycle_service.call_rpc_row"
    )
    def test_create_call_uses_rpc_then_returns_credentials(
        self,
        call_rpc_row,
        get_call_detail,
        build_join_credentials,
        send_notification,
    ):
        call_rpc_row.return_value = {"id": CALL_ID}
        get_call_detail.return_value = build_call_detail()
        build_join_credentials.return_value = {"agora": {"token": "token"}}

        result = create_call_session(
            access_token="access-token",
            conversation_id=CONVERSATION_ID,
            actor_identity_id=ACTOR_IDENTITY_ID,
            call_type="voice",
        )

        self.assertEqual(result, {"agora": {"token": "token"}})
        self.assertEqual(
            call_rpc_row.call_args.kwargs["function_name"],
            "create_call_session",
        )
        self.assertEqual(
            call_rpc_row.call_args.kwargs["parameters"]["p_call_type"],
            "voice",
        )
        self.assertTrue(
            call_rpc_row.call_args.kwargs["parameters"][
                "p_agora_channel_name"
            ].startswith("beeapp_")
        )
        send_notification.assert_called_once_with(
            call_detail=get_call_detail.return_value,
            actor_identity_id=ACTOR_IDENTITY_ID,
        )

    @patch(
        "apps.calls.services.call_session.lifecycle_service."
        "build_join_credentials",
        return_value={"agora": {"token": "token"}},
    )
    @patch(
        "apps.calls.services.call_session.lifecycle_service.get_call_detail"
    )
    @patch(
        "apps.calls.services.call_session.lifecycle_service.call_rpc_row"
    )
    def test_join_group_creates_uid_when_not_participant(
        self,
        call_rpc_row,
        get_call_detail,
        build_join_credentials,
    ):
        get_call_detail.side_effect = [
            build_call_detail(
                conversation_type="group",
                include_actor=False,
            ),
            build_call_detail(conversation_type="group"),
        ]

        result = join_call_session(
            access_token="access-token",
            call_id=CALL_ID,
            actor_identity_id=ACTOR_IDENTITY_ID,
        )

        self.assertEqual(result, {"agora": {"token": "token"}})
        agora_uid = call_rpc_row.call_args.kwargs["parameters"]["p_agora_uid"]
        self.assertGreaterEqual(agora_uid, 10_000)
        self.assertLessEqual(agora_uid, 2_000_000_000)

    @patch(
        "apps.calls.services.call_session.lifecycle_service.get_call_detail"
    )
    def test_refresh_rejects_inactive_call(self, get_call_detail):
        get_call_detail.return_value = build_call_detail(
            call_status="ended"
        )

        with self.assertRaises(CallStateError):
            refresh_call_rtc_token(
                access_token="access-token",
                call_id=CALL_ID,
                actor_identity_id=ACTOR_IDENTITY_ID,
            )

    @patch(
        "apps.calls.services.call_session.lifecycle_service.get_call_detail"
    )
    def test_refresh_rejects_unavailable_participant(
        self,
        get_call_detail,
    ):
        get_call_detail.return_value = build_call_detail(
            call_status="active",
            participant_status="left",
        )

        with self.assertRaises(CallAccessError):
            refresh_call_rtc_token(
                access_token="access-token",
                call_id=CALL_ID,
                actor_identity_id=ACTOR_IDENTITY_ID,
            )

    @patch(
        "apps.calls.services.call_session.lifecycle_service.call_rpc_row"
    )
    def test_cancel_join_normalizes_failure_reason(self, call_rpc_row):
        cancel_call_join_attempt(
            access_token="access-token",
            call_id=CALL_ID,
            actor_identity_id=ACTOR_IDENTITY_ID,
            failure_reason="  network_error  ",
        )

        self.assertEqual(
            call_rpc_row.call_args.kwargs["parameters"][
                "p_failure_reason"
            ],
            "network_error",
        )

    def test_kick_rejects_same_actor_and_target(self):
        with self.assertRaises(CallValidationError):
            kick_call_participant(
                access_token="access-token",
                call_id=CALL_ID,
                actor_identity_id=ACTOR_IDENTITY_ID,
                target_identity_id=ACTOR_IDENTITY_ID,
            )
