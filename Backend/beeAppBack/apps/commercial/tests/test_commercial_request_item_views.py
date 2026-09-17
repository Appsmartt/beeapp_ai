from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.commercial.request_item_views import (
    CommercialRequestItemCloseView,
    CommercialRequestItemOperationalStatusView,
    CommercialRequestItemProposalCreateView,
    CommercialRequestItemProposalRejectView,
)


class CommercialRequestItemViewsTests(SimpleTestCase):
    item_id = "11111111-1111-1111-1111-111111111111"

    class User:
        id = "user-123"
        email = "owner@example.com"

    @patch(
        "apps.commercial.request_item_views."
        "create_commercial_request_item_proposal"
    )
    def test_creates_item_proposal(self, create_proposal):
        create_proposal.return_value = {
            "proposal_id": "22222222-2222-2222-2222-222222222222",
            "status": "pending",
        }
        request = APIRequestFactory().post(
            f"/api/commercial/request-items/{self.item_id}/proposals/",
            {
                "proposed_quantity": 2,
                "proposed_unit_price_amount": 15000,
                "requested_modality": "pickup",
            },
            format="json",
        )

        with patch.object(
            CommercialRequestItemProposalCreateView,
            "get_authenticated_user_and_access_token",
            return_value=(self.User(), "owner-token"),
        ):
            response = CommercialRequestItemProposalCreateView.as_view()(
                request,
                item_id=self.item_id,
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")
        create_proposal.assert_called_once()

    @patch(
        "apps.commercial.request_item_views."
        "reject_commercial_request_item_proposal"
    )
    def test_rejects_item_proposal_as_customer(self, reject_proposal):
        reject_proposal.return_value = {
            "commerce_request_item_id": self.item_id,
            "proposal_status": "rejected",
            "item_status": "rejected",
        }
        request = APIRequestFactory().post(
            f"/api/commercial/request-items/{self.item_id}/proposal-reject/",
            {
                "reason_text": "No acepto estas condiciones.",
            },
            format="json",
        )

        with patch.object(
            CommercialRequestItemProposalRejectView,
            "get_authenticated_user_and_access_token",
            return_value=(self.User(), "client-token"),
        ):
            response = CommercialRequestItemProposalRejectView.as_view()(
                request,
                item_id=self.item_id,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["item_status"], "rejected")
        reject_proposal.assert_called_once()

    @patch(
        "apps.commercial.request_item_views."
        "close_commercial_request_item"
    )
    def test_closes_item(self, close_item):
        close_item.return_value = {
            "commerce_request_item_id": self.item_id,
            "item_status": "rejected",
        }
        request = APIRequestFactory().post(
            f"/api/commercial/request-items/{self.item_id}/close/",
            {
                "action": "reject",
                "reason_text": "No disponible.",
            },
            format="json",
        )

        with patch.object(
            CommercialRequestItemCloseView,
            "get_authenticated_user_and_access_token",
            return_value=(self.User(), "owner-token"),
        ):
            response = CommercialRequestItemCloseView.as_view()(
                request,
                item_id=self.item_id,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["item_status"], "rejected")
        close_item.assert_called_once()

    @patch(
        "apps.commercial.request_item_views."
        "update_commercial_request_item_operational_status"
    )
    def test_updates_item_operational_status(self, update_status):
        update_status.return_value = {
            "commerce_request_item_id": self.item_id,
            "item_status": "preparing",
        }
        request = APIRequestFactory().post(
            (
                f"/api/commercial/request-items/{self.item_id}/"
                "operational-status/"
            ),
            {
                "next_status": "preparing",
                "reason_text": "Preparación iniciada.",
            },
            format="json",
        )

        with patch.object(
            CommercialRequestItemOperationalStatusView,
            "get_authenticated_user_and_access_token",
            return_value=(self.User(), "owner-token"),
        ):
            response = (
                CommercialRequestItemOperationalStatusView.as_view()(
                    request,
                    item_id=self.item_id,
                )
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["item_status"], "preparing")
        update_status.assert_called_once()
