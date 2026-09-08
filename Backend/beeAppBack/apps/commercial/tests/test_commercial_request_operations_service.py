from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_request_operations_service import (
    accept_commercial_request_proposal,
    complete_commercial_request,
    get_commercial_request_timeline,
    list_owned_commercial_requests,
    reject_commercial_request_proposal,
    replace_commercial_payment_proof,
    withdraw_commercial_request_proposal,
)


class CommercialRequestOperationsServiceTests(SimpleTestCase):
    profile_id = "11111111-1111-1111-1111-111111111111"
    request_id = "22222222-2222-2222-2222-222222222222"
    proposal_id = "33333333-3333-3333-3333-333333333333"
    proof_id = "44444444-4444-4444-4444-444444444444"
    file_id = "55555555-5555-5555-5555-555555555555"
    payment_method_id = "66666666-6666-6666-6666-666666666666"

    def test_list_owned_requests_requires_token(self):
        with self.assertRaises(CommercialAuthenticationError):
            list_owned_commercial_requests(
                access_token="",
                commercial_profile_id=self.profile_id,
            )

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_lists_owned_requests_with_business_scope(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = [
            {
                "id": self.request_id,
                "commercial_profile_id": self.profile_id,
            }
        ]

        result = list_owned_commercial_requests(
            access_token="owner-token",
            commercial_profile_id=self.profile_id,
            statuses=["submitted"],
            limit=20,
            offset=10,
        )

        self.assertEqual(result[0]["id"], self.request_id)
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_list_requests",
            parameters={
                "p_scope": "business",
                "p_statuses": ["submitted"],
                "p_limit": 20,
                "p_offset": 10,
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_omits_requests_from_other_owned_profiles(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = [
            {
                "id": self.request_id,
                "commercial_profile_id": "other-profile",
            }
        ]

        result = list_owned_commercial_requests(
            access_token="owner-token",
            commercial_profile_id=self.profile_id,
        )

        self.assertEqual(result, [])

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_gets_request_timeline(self, execute_rpc):
        execute_rpc.return_value = [
            {
                "request_id": self.request_id,
                "request_status": "submitted",
                "proposals": [],
                "events": [],
            }
        ]

        result = get_commercial_request_timeline(
            access_token="token",
            request_id=self.request_id,
        )

        self.assertEqual(result["request_id"], self.request_id)
        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_get_request_timeline",
            parameters={
                "p_commerce_request_id": self.request_id,
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_accepts_proposal(self, execute_rpc):
        execute_rpc.return_value = self.request_id

        result = accept_commercial_request_proposal(
            access_token="client-token",
            proposal_id=self.proposal_id,
        )

        self.assertEqual(result["status"], "accepted")
        execute_rpc.assert_called_once_with(
            access_token="client-token",
            function_name="commerce_accept_request_proposal",
            parameters={
                "p_commerce_request_proposal_id": self.proposal_id,
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_rejects_proposal_with_optional_reason(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = self.request_id

        result = reject_commercial_request_proposal(
            access_token="client-token",
            proposal_id=self.proposal_id,
            rejection_reason=" No acepto el horario. ",
        )

        self.assertEqual(result["status"], "rejected")
        execute_rpc.assert_called_once_with(
            access_token="client-token",
            function_name="commerce_reject_request_proposal",
            parameters={
                "p_commerce_request_proposal_id": self.proposal_id,
                "p_rejection_reason": "No acepto el horario.",
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_withdraws_proposal(self, execute_rpc):
        execute_rpc.return_value = self.request_id

        result = withdraw_commercial_request_proposal(
            access_token="owner-token",
            proposal_id=self.proposal_id,
            withdrawal_reason=" Horario no disponible. ",
        )

        self.assertEqual(result["status"], "withdrawn")
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_withdraw_request_proposal",
            parameters={
                "p_commerce_request_proposal_id": self.proposal_id,
                "p_withdrawal_reason": "Horario no disponible.",
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_replaces_rejected_payment_proof(self, execute_rpc):
        execute_rpc.return_value = "77777777-7777-7777-7777-777777777777"

        result = replace_commercial_payment_proof(
            access_token="client-token",
            rejected_payment_proof_id=self.proof_id,
            file_id=self.file_id,
            payment_method_id=self.payment_method_id,
            payment_reference=" REF-002 ",
            note=" Comprobante corregido. ",
        )

        self.assertEqual(result["status"], "submitted")
        execute_rpc.assert_called_once_with(
            access_token="client-token",
            function_name="commerce_replace_payment_proof",
            parameters={
                "p_rejected_payment_proof_id": self.proof_id,
                "p_file_id": self.file_id,
                "p_payment_method_id": self.payment_method_id,
                "p_payment_reference": "REF-002",
                "p_note": "Comprobante corregido.",
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_completes_confirmed_request(self, execute_rpc):
        execute_rpc.return_value = self.request_id

        result = complete_commercial_request(
            access_token="owner-token",
            request_id=self.request_id,
            completion_note=" Entrega confirmada. ",
        )

        self.assertEqual(result["status"], "completed")
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_complete_request",
            parameters={
                "p_commerce_request_id": self.request_id,
                "p_completion_note": "Entrega confirmada.",
            },
        )


    @patch(
        "apps.commercial.services."
        "commercial_request_operations_service.execute_commercial_rpc"
    )
    def test_filters_requests_of_other_owned_profiles(
        self,
        execute_rpc,
    ):
        execute_rpc.return_value = [
            {
                "id": self.request_id,
                "commercial_profile_id": self.profile_id,
            },
            {
                "id": "77777777-7777-7777-7777-777777777777",
                "commercial_profile_id": "88888888-8888-8888-8888-888888888888",
            },
        ]

        result = list_owned_commercial_requests(
            access_token="owner-token",
            commercial_profile_id=self.profile_id,
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(
            result[0]["commercial_profile_id"],
            self.profile_id,
        )
