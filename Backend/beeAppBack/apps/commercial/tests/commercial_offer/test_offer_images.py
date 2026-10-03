from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import CommercialValidationError


class CommercialOfferImageTests(SimpleTestCase):
    @patch(
        "apps.commercial.services.commercial_offer.images."
        "validate_offer_image_file"
    )
    @patch(
        "apps.commercial.services.commercial_offer.images."
        "get_user_supabase_client"
    )
    @patch(
        "apps.commercial.services.commercial_offer.images."
        "get_owned_commercial_offer"
    )
    def test_add_image_rejects_when_five_active_images_exist(
        self,
        get_offer_mock,
        get_client_mock,
        validate_file_mock,
    ):
        from apps.commercial.services.commercial_offer import (
            add_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "published",
        }

        class Response:
            count = 5
            data = []

        class Query:
            def select(self, *_args, **_kwargs):
                return self

            def eq(self, *_args, **_kwargs):
                return self

            def is_(self, *_args, **_kwargs):
                return self

            def execute(self):
                return Response()

        class Client:
            def table(self, _table_name):
                return Query()

        get_client_mock.return_value = Client()

        with self.assertRaises(CommercialValidationError) as context:
            add_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                payload={
                    "file_id": "00000000-0000-0000-0000-000000000002",
                    "sort_order": 5,
                    "is_primary": False,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_IMAGE_LIMIT_REACHED",
        )

    @patch(
        "apps.commercial.services.commercial_offer.image_lifecycle."
        "get_user_supabase_client"
    )
    @patch(
        "apps.commercial.services.commercial_offer.image_lifecycle."
        "get_owned_commercial_offer"
    )
    def test_restore_image_rejects_when_five_active_images_exist(
        self,
        get_offer_mock,
        get_client_mock,
    ):
        from apps.commercial.services.commercial_offer import (
            restore_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "published",
        }

        class ImageResponse:
            data = {
                "id": "image-archived-1",
                "commercial_offer_id": "offer-1",
                "file_id": "00000000-0000-0000-0000-000000000002",
                "sort_order": 0,
                "is_primary": False,
                "status": "archived",
                "archived_at": "2026-09-13T00:00:00+00:00",
            }

        class CountResponse:
            count = 5
            data = []

        class Query:
            def __init__(self, response):
                self.response = response

            def select(self, *_args, **_kwargs):
                return self

            def eq(self, *_args, **_kwargs):
                return self

            def is_(self, *_args, **_kwargs):
                return self

            def maybe_single(self):
                return self

            def execute(self):
                return self.response

        class Client:
            def table(self, table_name):
                if table_name == "commercial_offer_images":
                    self.calls = getattr(self, "calls", 0) + 1
                    if self.calls == 1:
                        return Query(ImageResponse())
                    return Query(CountResponse())
                return Query(CountResponse())

        get_client_mock.return_value = Client()

        with self.assertRaises(CommercialValidationError) as context:
            restore_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                image_id="image-archived-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_IMAGE_LIMIT_REACHED",
        )

    @patch(
        "apps.commercial.services.commercial_offer.images."
        "get_user_supabase_client"
    )
    @patch(
        "apps.commercial.services.commercial_offer.images."
        "get_owned_commercial_offer"
    )
    def test_image_added_audit_uses_image_entity(
        self,
        get_offer_mock,
        get_client_mock,
    ):
        from apps.commercial.services.commercial_offer import (
            add_commercial_offer_image,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "published",
        }

        class Response:
            data = [
                {
                    "id": "image-1",
                    "commercial_offer_id": "offer-1",
                    "file_id": "00000000-0000-0000-0000-000000000002",
                    "sort_order": 0,
                    "is_primary": False,
                    "status": "active",
                    "archived_at": None,
                    "created_at": None,
                    "updated_at": None,
                }
            ]

        class Query:
            def insert(self, *_args, **_kwargs):
                return self

            def execute(self):
                return Response()

        class Client:
            def table(self, _table_name):
                return Query()

        get_client_mock.return_value = Client()

        with patch(
            "apps.commercial.services.commercial_offer.images."
            "validate_offer_image_file"
        ), patch(
            "apps.commercial.services.commercial_offer.images."
            "ensure_commercial_offer_image_capacity",
            return_value=None,
        ), patch(
            "apps.commercial.services.commercial_offer.images."
            "write_offer_audit_event"
        ) as audit_mock:
            add_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                payload={
                    "file_id": "00000000-0000-0000-0000-000000000002",
                    "sort_order": 0,
                    "is_primary": False,
                },
            )

        self.assertEqual(
            audit_mock.call_args.kwargs["entity_type"],
            "commercial_offer_image",
        )
        self.assertEqual(
            audit_mock.call_args.kwargs["entity_id"],
            "image-1",
        )
