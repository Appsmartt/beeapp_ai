from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialStateError


class CommercialOfferAvailabilityTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_offer.availability."
        "get_owned_commercial_offer"
    )
    def test_offer_rejects_unchanged_availability(self, get_offer_mock):
        from apps.commercial.services.commercial_offer.availability import (
            set_commercial_offer_availability,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "published",
            "is_available": True,
        }

        with self.assertRaises(CommercialStateError) as context:
            set_commercial_offer_availability(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                is_available=True,
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_AVAILABILITY_UNCHANGED",
        )
