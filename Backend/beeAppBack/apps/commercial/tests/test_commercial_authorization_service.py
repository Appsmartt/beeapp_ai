from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAccessError,
)
from apps.commercial.services.commercial_authorization_service import (
    require_commerce_request_owner,
    require_commercial_profile_owner,
)


class CommercialAuthorizationServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_authorization_service.get_commercial_profile"
    )
    def test_profile_owner_is_authorized(
        self,
        get_commercial_profile_mock,
    ):
        get_commercial_profile_mock.return_value = {
            "id": "profile-1",
            "owner_id": "user-1",
        }

        profile = require_commercial_profile_owner(
            user_id="user-1",
            commercial_profile_id="profile-1",
        )

        self.assertEqual(profile["id"], "profile-1")

    @patch(
        "apps.commercial.services."
        "commercial_authorization_service.get_commercial_profile"
    )
    def test_different_owner_is_denied(
        self,
        get_commercial_profile_mock,
    ):
        get_commercial_profile_mock.return_value = {
            "id": "profile-1",
            "owner_id": "user-owner",
        }

        with self.assertRaises(CommercialAccessError) as context:
            require_commercial_profile_owner(
                user_id="user-other",
                commercial_profile_id="profile-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PROFILE_NOT_OWNED_BY_USER",
        )

    @patch(
        "apps.commercial.services."
        "commercial_authorization_service."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_authorization_service.get_commerce_request"
    )
    def test_request_owner_rejects_profile_id_mismatch(
        self,
        get_commerce_request_mock,
        require_owner_mock,
    ):
        get_commerce_request_mock.return_value = {
            "id": "request-1",
            "client_id": "client-1",
            "commercial_profile_id": "profile-real",
        }

        with self.assertRaises(CommercialAccessError) as context:
            require_commerce_request_owner(
                user_id="owner-1",
                commerce_request_id="request-1",
                commercial_profile_id="profile-fake",
            )

        require_owner_mock.assert_not_called()

        self.assertEqual(
            context.exception.code,
            "COMMERCE_REQUEST_PROFILE_MISMATCH",
        )


class UpdateCommercialProfileSerializerTests(SimpleTestCase):
    def test_rejects_fixed_delivery_without_amount(self):
        from apps.commercial.serializers import (
            UpdateCommercialProfileSerializer,
        )

        serializer = UpdateCommercialProfileSerializer(
            data={
                "delivery_fee_mode": "fixed",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "delivery_fee_amount",
            serializer.errors,
        )

    def test_rejects_phone_parts_updated_separately(self):
        from apps.commercial.serializers import (
            UpdateCommercialProfileSerializer,
        )

        serializer = UpdateCommercialProfileSerializer(
            data={
                "phone_number": "3001234567",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "phone_number",
            serializer.errors,
        )

    def test_accepts_hold_minutes_in_database_range(self):
        from apps.commercial.serializers import (
            UpdateCommercialProfileSerializer,
        )

        serializer = UpdateCommercialProfileSerializer(
            data={
                "booking_hold_minutes": 5,
                "inventory_hold_minutes": 240,
            }
        )

        self.assertTrue(serializer.is_valid())


class CommercialViewsImportTests(SimpleTestCase):
    def test_profile_update_error_is_imported_by_views(self):
        from apps.commercial.views import (
            CommercialProfileUpdateError,
        )

        self.assertIsNotNone(
            CommercialProfileUpdateError
        )


class CommercialProfileUpdateAccessTokenTests(
    SimpleTestCase,
):
    def test_update_requires_access_token(self):
        from apps.commercial.exceptions import (
            CommercialProfileUpdateError,
        )
        from apps.commercial.services.commercial_profile_service import (
            update_commercial_profile,
        )

        with self.assertRaises(CommercialProfileUpdateError):
            update_commercial_profile(
                user_id="user-1",
                access_token="   ",
                profile_id="profile-1",
                payload={
                    "display_name": "Nuevo nombre",
                },
            )
