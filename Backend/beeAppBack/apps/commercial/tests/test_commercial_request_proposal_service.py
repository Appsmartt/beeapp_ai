from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAuthenticationError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_request_proposal_service import (
    create_commercial_request_proposal,
)


class CommercialRequestProposalServiceTests(SimpleTestCase):
    request_id = "4b21f7d9-85b6-4785-8f43-f41092ba07d2"
    timezone = ZoneInfo("America/Bogota")

    payload = {
        "requested_modality": "at_establishment",
        "subtotal_amount": 45000,
        "delivery_fee_amount": 0,
        "total_amount": 45000,
        "proposed_starts_at": datetime(
            2026,
            9,
            8,
            10,
            0,
            tzinfo=timezone,
        ),
        "proposed_ends_at": datetime(
            2026,
            9,
            8,
            11,
            0,
            tzinfo=timezone,
        ),
        "timezone": "America/Bogota",
        "note": "Propuesta de prueba.",
        "terms_snapshot": {
            "payment_policy": "required_before_confirmation",
        },
    }

    def test_rejects_missing_access_token(self):
        with self.assertRaises(CommercialAuthenticationError) as context:
            create_commercial_request_proposal(
                access_token="",
                request_id=self.request_id,
                payload=self.payload,
            )

        self.assertEqual(context.exception.code, "AUTHENTICATION_REQUIRED")

    def test_rejects_missing_request_id(self):
        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_request_proposal(
                access_token="token",
                request_id="",
                payload=self.payload,
            )

        self.assertEqual(context.exception.code, "REQUEST_ID_REQUIRED")

    def test_rejects_non_object_terms_snapshot(self):
        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_request_proposal(
                access_token="token",
                request_id=self.request_id,
                payload={"terms_snapshot": []},
            )

        self.assertEqual(context.exception.code, "PROPOSAL_TERMS_INVALID")

    @patch(
        "apps.commercial.services.commercial_request_proposal_service.execute_commercial_rpc"
    )
    def test_calls_proposal_rpc_with_normalized_dates(self, execute_rpc):
        execute_rpc.return_value = {
            "proposal_id": "55555555-5555-5555-5555-555555555555",
            "request_id": self.request_id,
            "version_number": 1,
            "status": "pending",
            "request_status": "proposal_sent",
            "proposed_by": "business_owner",
        }

        result = create_commercial_request_proposal(
            access_token="token",
            request_id=self.request_id,
            payload=self.payload,
        )

        self.assertEqual(result["version_number"], 1)
        execute_rpc.assert_called_once_with(
            access_token="token",
            function_name="commerce_create_request_proposal",
            parameters={
                "p_request_id": self.request_id,
                "p_requested_modality": "at_establishment",
                "p_subtotal_amount": 45000,
                "p_delivery_fee_amount": 0,
                "p_total_amount": 45000,
                "p_proposed_starts_at": (
                    "2026-09-08T10:00:00-05:00"
                ),
                "p_proposed_ends_at": (
                    "2026-09-08T11:00:00-05:00"
                ),
                "p_timezone": "America/Bogota",
                "p_note": "Propuesta de prueba.",
                "p_terms_snapshot": {
                    "payment_policy": "required_before_confirmation",
                },
            },
        )

    @patch(
        "apps.commercial.services.commercial_request_proposal_service.execute_commercial_rpc"
    )
    def test_omits_timezone_when_proposal_has_no_time_range(self, execute_rpc):
        execute_rpc.return_value = {
            "proposal_id": "proposal-id",
            "request_id": self.request_id,
            "version_number": 1,
            "status": "pending",
            "request_status": "proposal_sent",
            "proposed_by": "business_owner",
        }

        payload = {
            **self.payload,
            "proposed_starts_at": None,
            "proposed_ends_at": None,
            "timezone": "America/Bogota",
        }

        create_commercial_request_proposal(
            access_token="token",
            request_id=self.request_id,
            payload=payload,
        )

        parameters = execute_rpc.call_args.kwargs["parameters"]
        self.assertIsNone(parameters["p_proposed_starts_at"])
        self.assertIsNone(parameters["p_proposed_ends_at"])
        self.assertIsNone(parameters["p_timezone"])

    @patch(
        "apps.commercial.services.commercial_request_proposal_service.execute_commercial_rpc"
    )
    def test_rejects_invalid_rpc_response(self, execute_rpc):
        execute_rpc.return_value = []

        with self.assertRaises(CommercialValidationError) as context:
            create_commercial_request_proposal(
                access_token="token",
                request_id=self.request_id,
                payload=self.payload,
            )

        self.assertEqual(context.exception.code, "PROPOSAL_CREATE_FAILED")
