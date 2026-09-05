from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialStateError
from apps.commercial.services.domain.request_state_machine import (
    BUSINESS_OWNER,
    CUSTOMER,
    SYSTEM,
    is_terminal_request_status,
    resolve_request_transition,
)


class RequestStateMachineTests(SimpleTestCase):
    def test_customer_can_submit_draft(self):
        transition = resolve_request_transition(
            action="submit",
            actor_kind=CUSTOMER,
            current_status="draft",
        )

        self.assertEqual(transition.to_status, "submitted")

    def test_business_can_accept_submitted_request(self):
        transition = resolve_request_transition(
            action="accept",
            actor_kind=BUSINESS_OWNER,
            current_status="submitted",
        )

        self.assertEqual(transition.to_status, "accepted")

    def test_customer_cannot_accept_own_request(self):
        with self.assertRaises(CommercialStateError) as context:
            resolve_request_transition(
                action="accept",
                actor_kind=CUSTOMER,
                current_status="submitted",
            )

        self.assertEqual(context.exception.code, "invalid_request_transition")

    def test_customer_cannot_cancel_after_payment_proof(self):
        with self.assertRaises(CommercialStateError):
            resolve_request_transition(
                action="cancel",
                actor_kind=CUSTOMER,
                current_status="payment_submitted",
            )

    def test_system_can_expire_pending_request(self):
        transition = resolve_request_transition(
            action="expire",
            actor_kind=SYSTEM,
            current_status="proposal_sent",
        )

        self.assertEqual(transition.to_status, "expired")

    def test_terminal_statuses_are_detected(self):
        self.assertTrue(is_terminal_request_status("completed"))
        self.assertTrue(is_terminal_request_status("expired"))
        self.assertFalse(is_terminal_request_status("payment_pending"))
