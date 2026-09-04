from django.test import SimpleTestCase

from apps.commercial.enums import (
    CommercialAdminCapability,
    CommercialExternalPaymentType,
    CommercialProfilePublicationStatus,
    CommercialRequestStatus,
    CommercialRequestType,
    CommercialVerificationStatus,
    enum_values,
)
from apps.commercial.exceptions import CommercialAccessError
from apps.commercial.services.commercial_authorization_service import (
    require_admin_permission,
)


class CommercialEnumsTests(SimpleTestCase):
    def test_profile_publication_states_match_database_enum(self):
        self.assertEqual(
            enum_values(CommercialProfilePublicationStatus),
            (
                "published",
                "paused",
                "archived",
                "suspended",
            ),
        )

    def test_verification_states_match_database_enum(self):
        self.assertEqual(
            enum_values(CommercialVerificationStatus),
            (
                "not_requested",
                "draft",
                "pending_review",
                "requires_correction",
                "verified",
                "rejected",
                "suspended",
            ),
        )

    def test_external_payment_types_match_database_enum(self):
        self.assertEqual(
            enum_values(CommercialExternalPaymentType),
            (
                "nequi",
                "daviplata",
                "breb",
                "bank_account",
            ),
        )

    def test_request_types_match_database_enum(self):
        self.assertEqual(
            enum_values(CommercialRequestType),
            (
                "product_order",
                "service_request",
                "booking_request",
            ),
        )

    def test_request_states_include_payment_and_dispute_states(self):
        values = enum_values(CommercialRequestStatus)

        self.assertIn("payment_pending", values)
        self.assertIn("payment_submitted", values)
        self.assertIn("confirmed", values)
        self.assertIn("disputed", values)


class CommercialAdminAuthorizationTests(SimpleTestCase):
    def test_requires_capability(self):
        with self.assertRaises(CommercialAccessError) as context:
            require_admin_permission(
                user_id="user-1",
                capability=" ",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_ADMIN_CAPABILITY_REQUIRED",
        )

    def test_denies_until_admin_provider_is_configured(self):
        with self.assertRaises(CommercialAccessError) as context:
            require_admin_permission(
                user_id="user-1",
                capability=(
                    CommercialAdminCapability
                    .COMMERCIAL_VERIFICATION_REVIEW.value
                ),
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_ADMIN_PERMISSION_NOT_CONFIGURED",
        )
