from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialStateError


class CommercialOfferArchivedStateTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_offer.availability."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_be_enabled(self, get_offer_mock):
        from apps.commercial.services.commercial_offer import (
            enable_commercial_offer,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
            "is_available": False,
        }

        with self.assertRaises(CommercialStateError) as context:
            enable_commercial_offer(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services.commercial_offer.modalities."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_update_modalities(self, get_offer_mock):
        from apps.commercial.services.commercial_offer import (
            update_commercial_offer_modalities,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            update_commercial_offer_modalities(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                modalities=["virtual"],
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services.commercial_offer.images."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_receive_images(self, get_offer_mock):
        from apps.commercial.services.commercial_offer import (
            add_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            add_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                payload={
                    "file_id": "file-1",
                    "sort_order": 0,
                    "is_primary": False,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services.commercial_offer.image_lifecycle."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_restore_images(self, get_offer_mock):
        from apps.commercial.services.commercial_offer import (
            restore_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            restore_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                image_id="image-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )
