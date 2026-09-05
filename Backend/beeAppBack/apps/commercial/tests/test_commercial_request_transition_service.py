from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_request_transition_service import (
    transition_commercial_request,
)

class CommercialRequestTransitionServiceTests(SimpleTestCase):
    request_id = "4b21f7d9-85b6-4785-8f43-f41092ba07d2"


    def test_rejects_missing_access_token(self):
        with self.assertRaises(CommercialAuthenticationError) as context:
            transition_commercial_request(
                access_token="",
                request_id=self.request_id,
                action="accept",
            )

        self.assertEqual(context.exception.code, "AUTHENTICATION_REQUIRED")

    def test_rejects_unknown_action(self):
        with self.assertRaises(CommercialValidationError) as context:
            transition_commercial_request(
                access_token="token",
                request_id=self.request_id,
                action="skip_everything",
            )

        self.assertEqual(context.exception.code, "ACTION_INVALID")

    def test_reject_requires_reason(self):
        with self.assertRaises(CommercialValidationError) as context:
            transition_commercial_request(
                access_token="token",
                request_id=self.request_id,
                action="reject",
            )

        self.assertEqual(
            context.exception.code,
            "REJECTION_REASON_REQUIRED",
        )

    @patch(
        "apps.commercial.services.commercial_request_transition_service.execute_commercial_rpc"
    )
    def test_calls_transition_rpc(self, execute_rpc):
        execute_rpc.return_value = {
            "request_id": self.request_id,
            "previous_status": "submitted",
            "status": "under_review",
            "action": "start_review",
        }

        result = transition_commercial_request(
            access_token="token",
            request_id=self.request_id,
            action="start_review",
            reason_code="",
            reason_text="",
        )

        self.assertEqual(result["status"], "under_review")
        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_transition_request",
            parameters={
                "p_request_id": self.request_id,
                "p_action": "start_review",
                "p_reason_code": None,
                "p_reason_text": None,
            },
        )

    @patch(
        "apps.commercial.services.commercial_request_transition_service.execute_commercial_rpc"
    )
    def test_rejects_invalid_rpc_response(self, execute_rpc):
        execute_rpc.return_value = []

        with self.assertRaises(CommercialValidationError) as context:
            transition_commercial_request(
                access_token="token",
                request_id=self.request_id,
                action="accept",
            )

        self.assertEqual(
            context.exception.code,
            "REQUEST_TRANSITION_FAILED",
        )
