from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError
from apps.commercial.services.commercial_request_item_service import (
    accept_commercial_request_item_proposal,
    close_commercial_request_item,
    create_commercial_request_item_proposal,
    update_commercial_request_item_operational_status,
    withdraw_commercial_request_item_proposal,
)


class CommercialRequestItemServiceTests(SimpleTestCase):
    item_id = "11111111-1111-1111-1111-111111111111"
    proposal_id = "22222222-2222-2222-2222-222222222222"

    @patch(
        "apps.commercial.services."
        "commercial_request_item_service.execute_commercial_rpc"
    )
    def test_creates_item_proposal(self, execute_rpc):
        execute_rpc.return_value = {
            "proposal_id": self.proposal_id,
            "commerce_request_item_id": self.item_id,
            "status": "pending",
        }

        result = create_commercial_request_item_proposal(
            access_token="owner-token",
            item_id=self.item_id,
            payload={
                "proposed_quantity": 2,
                "proposed_unit_price_amount": 15000,
                "requested_modality": "pickup",
                "proposed_starts_at": None,
                "proposed_ends_at": None,
                "timezone": None,
                "note": "Disponible mañana.",
            },
        )

        self.assertEqual(result["proposal_id"], self.proposal_id)
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_create_item_proposal",
            parameters={
                "p_commerce_request_item_id": self.item_id,
                "p_proposed_quantity": 2,
                "p_proposed_unit_price_amount": 15000,
                "p_requested_modality": "pickup",
                "p_proposed_starts_at": None,
                "p_proposed_ends_at": None,
                "p_timezone": None,
                "p_note": "Disponible mañana.",
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_item_service.execute_commercial_rpc"
    )
    def test_accepts_item_proposal(self, execute_rpc):
        execute_rpc.return_value = {
            "proposal_id": self.proposal_id,
            "item_status": "accepted",
        }

        result = accept_commercial_request_item_proposal(
            access_token="client-token",
            proposal_id=self.proposal_id,
        )

        self.assertEqual(result["item_status"], "accepted")
        execute_rpc.assert_called_once_with(
            access_token="client-token",
            function_name="commerce_accept_item_proposal",
            parameters={
                "p_commerce_request_proposal_id": self.proposal_id,
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_item_service.execute_commercial_rpc"
    )
    def test_closes_item(self, execute_rpc):
        execute_rpc.return_value = {
            "commerce_request_item_id": self.item_id,
            "item_status": "withdrawn",
        }

        result = close_commercial_request_item(
            access_token="owner-token",
            item_id=self.item_id,
            action="withdraw",
            reason_code="not_available",
            reason_text="Sin disponibilidad.",
        )

        self.assertEqual(result["item_status"], "withdrawn")
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_close_request_item",
            parameters={
                "p_commerce_request_item_id": self.item_id,
                "p_action": "withdraw",
                "p_reason_code": "not_available",
                "p_reason_text": "Sin disponibilidad.",
            },
        )

    def test_rejects_invalid_close_action(self):
        with self.assertRaises(CommercialValidationError):
            close_commercial_request_item(
                access_token="owner-token",
                item_id=self.item_id,
                action="complete",
            )

    @patch(
        "apps.commercial.services."
        "commercial_request_item_service.execute_commercial_rpc"
    )
    def test_withdraws_item_proposal(self, execute_rpc):
        execute_rpc.return_value = {
            "proposal_id": self.proposal_id,
            "proposal_status": "withdrawn",
        }

        result = withdraw_commercial_request_item_proposal(
            access_token="owner-token",
            proposal_id=self.proposal_id,
            reason_text="Agenda ocupada.",
        )

        self.assertEqual(result["proposal_status"], "withdrawn")
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_withdraw_item_proposal",
            parameters={
                "p_commerce_request_proposal_id": self.proposal_id,
                "p_reason_text": "Agenda ocupada.",
            },
        )

    @patch(
        "apps.commercial.services."
        "commercial_request_item_service.execute_commercial_rpc"
    )
    def test_updates_item_operational_status(self, execute_rpc):
        execute_rpc.return_value = {
            "commerce_request_item_id": self.item_id,
            "item_status": "preparing",
        }

        result = update_commercial_request_item_operational_status(
            access_token="owner-token",
            item_id=self.item_id,
            next_status="preparing",
            reason_text="Iniciamos preparación.",
        )

        self.assertEqual(result["item_status"], "preparing")
        execute_rpc.assert_called_once_with(
            access_token="owner-token",
            function_name="commerce_update_item_operational_status",
            parameters={
                "p_commerce_request_item_id": self.item_id,
                "p_next_status": "preparing",
                "p_reason_text": "Iniciamos preparación.",
            },
        )
