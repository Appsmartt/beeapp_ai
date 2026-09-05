from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialAuthenticationError,
    CommercialConflictError,
    CommercialNotFoundError,
    CommercialStateError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_supabase_service import (
    extract_commercial_error_code,
    execute_commercial_rpc,
    translate_commercial_rpc_error,
)


class CommercialSupabaseServiceTests(SimpleTestCase):
    def test_extracts_commerce_error_code(self):
        self.assertEqual(
            extract_commercial_error_code(
                "ERROR: COMMERCE_CART_MIXED_BUSINESSES"
            ),
            "COMMERCE_CART_MIXED_BUSINESSES",
        )

    def test_translates_authentication_error(self):
        error = translate_commercial_rpc_error(
            Exception("AUTHENTICATION_REQUIRED")
        )

        self.assertIsInstance(
            error,
            CommercialAuthenticationError,
        )

    def test_translates_owner_payment_message_as_access_error(self):
        error = Exception(
            "Only the commercial profile owner can request payment"
        )

        translated = translate_commercial_rpc_error(error)

        self.assertIsInstance(translated, CommercialAccessError)
        self.assertEqual(
            translated.code,
            "COMMERCIAL_NOT_AUTHORIZED",
        )

    def test_translates_access_error(self):
        error = translate_commercial_rpc_error(
            Exception("COMMERCE_REQUEST_CUSTOMER_REQUIRED")
        )

        self.assertIsInstance(error, CommercialAccessError)

    def test_translates_not_found_error(self):
        error = translate_commercial_rpc_error(
            Exception("COMMERCE_OFFER_NOT_PUBLISHED")
        )

        self.assertIsInstance(error, CommercialNotFoundError)

    def test_translates_state_error(self):
        error = translate_commercial_rpc_error(
            Exception("COMMERCE_REQUEST_EXPIRED")
        )

        self.assertIsInstance(error, CommercialStateError)

    def test_translates_conflict_error(self):
        error = translate_commercial_rpc_error(
            Exception("COMMERCE_BOOKING_SLOT_UNAVAILABLE")
        )

        self.assertIsInstance(error, CommercialConflictError)

    def test_translates_validation_error(self):
        error = translate_commercial_rpc_error(
            Exception("COMMERCE_CART_MIXED_BUSINESSES")
        )

        self.assertIsInstance(error, CommercialValidationError)

    def test_translates_expired_request_as_state_conflict(self):
        error = translate_commercial_rpc_error(
            Exception("COMMERCE_REQUEST_EXPIRED")
        )

        self.assertIsInstance(error, CommercialStateError)

    def test_translates_expired_hold_as_conflict(self):
        error = translate_commercial_rpc_error(
            Exception("COMMERCE_BOOKING_HOLD_EXPIRED")
        )

        self.assertIsInstance(error, CommercialConflictError)

    def test_rejects_empty_access_token(self):
        with self.assertRaises(CommercialAuthenticationError):
            execute_commercial_rpc(
                access_token="   ",
                function_name="commerce_submit_request",
                parameters={},
            )
