from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialStateError,
)
from apps.commercial.serializers import (
    AdjustCommercialOfferInventorySerializer,
    CreateCommercialOfferSerializer,
    UpdateCommercialOfferModalitiesSerializer,
)


class CommercialOfferSerializerTests(SimpleTestCase):
    def test_rejects_product_with_booking(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "product",
                "title": "Producto",
                "pricing_strategy": "fixed",
                "base_price_amount": 10000,
                "requires_booking": True,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "requires_booking",
            serializer.errors,
        )

    def test_rejects_service_without_payment_policy(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "service",
                "title": "Servicio",
                "pricing_strategy": "fixed",
                "base_price_amount": 10000,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "payment_policy",
            serializer.errors,
        )

    def test_accepts_tracked_product(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "product",
                "title": "Producto",
                "pricing_strategy": "fixed",
                "base_price_amount": 10000,
                "track_inventory": True,
                "stock_quantity": 5,
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_accepts_booked_service(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "service",
                "title": "Servicio",
                "pricing_strategy": "starting_at",
                "base_price_amount": 10000,
                "requires_booking": True,
                "duration_minutes": 60,
                "payment_policy": "to_be_agreed",
            }
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_price_for_free_offer(self):
        serializer = CreateCommercialOfferSerializer(
            data={
                "catalog_id": (
                    "00000000-0000-0000-0000-000000000001"
                ),
                "offer_kind": "product",
                "title": "Producto gratis",
                "pricing_strategy": "free",
                "base_price_amount": 1,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "base_price_amount",
            serializer.errors,
        )

    def test_modalities_serializer_rejects_duplicates(self):
        serializer = UpdateCommercialOfferModalitiesSerializer(
            data={
                "modalities": [
                    "virtual",
                    "virtual",
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "modalities",
            serializer.errors,
        )

    def test_inventory_serializer_rejects_zero_delta(self):
        serializer = AdjustCommercialOfferInventorySerializer(
            data={
                "quantity_delta": 0,
                "reason_code": "restock",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "quantity_delta",
            serializer.errors,
        )


class CommercialOfferStateTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_change_availability(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
            set_commercial_offer_availability,
        )

        get_offer_mock.return_value = {
            "id": "offer-1",
            "status": "archived",
            "is_available": False,
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
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_offer_rejects_unchanged_availability(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
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

    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_update_modalities(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
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
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_receive_images(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
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
                    "file_id": (
                        "00000000-0000-0000-0000-000000000002"
                    ),
                    "sort_order": 0,
                    "is_primary": False,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_archived_offer_cannot_restore_images(
        self,
        get_offer_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
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


class CommercialOfferImageLimitTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_offer_service._validate_offer_image_file"
    )
    @patch(
        "apps.commercial.services."
        "commercial_offer_service._get_user_supabase_client"
    )
    @patch(
        "apps.commercial.services."
        "commercial_offer_service.get_owned_commercial_offer"
    )
    def test_add_image_rejects_when_five_active_images_exist(
        self,
        get_offer_mock,
        get_client_mock,
        validate_file_mock,
    ):
        from apps.commercial.exceptions import (
            CommercialValidationError,
        )
        from apps.commercial.services.commercial_offer_service import (
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
                    "file_id": (
                        "00000000-0000-0000-0000-000000000002"
                    ),
                    "sort_order": 5,
                    "is_primary": False,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_OFFER_IMAGE_LIMIT_REACHED",
        )


class CommercialOfferImageRestoreLimitTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_offer_service._get_user_supabase_client"
    )
    @patch(
        "apps.commercial.services."
        "commercial_offer_service.get_owned_commercial_offer"
    )
    def test_restore_image_rejects_when_five_active_images_exist(
        self,
        get_offer_mock,
        get_client_mock,
    ):
        from apps.commercial.exceptions import (
            CommercialValidationError,
        )
        from apps.commercial.services.commercial_offer_service import (
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
                "file_id": (
                    "00000000-0000-0000-0000-000000000002"
                ),
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
                    if not hasattr(self, "calls"):
                        self.calls = 0
                    self.calls += 1
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


class CommercialOfferAuditEntityTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "_get_user_supabase_client"
    )
    @patch(
        "apps.commercial.services."
        "commercial_offer_service."
        "get_owned_commercial_offer"
    )
    def test_image_added_audit_uses_image_entity(
        self,
        get_offer_mock,
        get_client_mock,
    ):
        from apps.commercial.services.commercial_offer_service import (
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
                    "file_id": (
                        "00000000-0000-0000-0000-000000000002"
                    ),
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
            "apps.commercial.services."
            "commercial_offer_service."
            "_validate_offer_image_file"
        ), patch(
            "apps.commercial.services."
            "commercial_offer_service."
            "_count_active_commercial_offer_images",
            return_value=0,
        ), patch(
            "apps.commercial.services."
            "commercial_offer_service."
            "_write_offer_audit_event"
        ) as audit_mock:
            add_commercial_offer_image(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                offer_id="offer-1",
                payload={
                    "file_id": (
                        "00000000-0000-0000-0000-000000000002"
                    ),
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

# BuddyServices global product feed tests
class PublicCommercialProductFeedSerializerTests(SimpleTestCase):
    def test_accepts_default_feed_query(self):
        from apps.commercial.serializers import (
            PublicCommercialProductFeedQuerySerializer,
        )

        serializer = PublicCommercialProductFeedQuerySerializer(
            data={},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["limit"],
            4,
        )
        self.assertEqual(
            serializer.validated_data["offset"],
            0,
        )

    def test_accepts_valid_seed_and_incremental_limit(self):
        from apps.commercial.serializers import (
            PublicCommercialProductFeedQuerySerializer,
        )

        serializer = PublicCommercialProductFeedQuerySerializer(
            data={
                "seed": "feed-session-20260913",
                "limit": 2,
                "offset": 4,
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["seed"],
            "feed-session-20260913",
        )
        self.assertEqual(
            serializer.validated_data["limit"],
            2,
        )
        self.assertEqual(
            serializer.validated_data["offset"],
            4,
        )

    def test_rejects_seed_that_is_too_long(self):
        from apps.commercial.serializers import (
            PublicCommercialProductFeedQuerySerializer,
        )

        serializer = PublicCommercialProductFeedQuerySerializer(
            data={
                "seed": "a" * 129,
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("seed", serializer.errors)

    def test_rejects_limit_above_feed_cap(self):
        from apps.commercial.serializers import (
            PublicCommercialProductFeedQuerySerializer,
        )

        serializer = PublicCommercialProductFeedQuerySerializer(
            data={
                "limit": 21,
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("limit", serializer.errors)


class PublicCommercialProductFeedServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_public_service."
        "execute_with_supabase_admin_retry"
    )
    def test_feed_returns_only_visible_products_with_pagination(
        self,
        retry_mock,
    ):
        from apps.commercial.services.commercial_public_service import (
            list_public_commercial_product_feed,
        )

        profiles = [
            {
                "id": "profile-visible",
                "is_public": True,
                "is_available": True,
                "publication_status": "published",
                "archived_at": None,
                "suspended_at": None,
            },
            {
                "id": "profile-private",
                "is_public": False,
                "is_available": True,
                "publication_status": "published",
                "archived_at": None,
                "suspended_at": None,
            },
        ]

        catalogs = [
            {
                "id": "catalog-visible",
                "commercial_profile_id": "profile-visible",
                "status": "published",
                "archived_at": None,
            },
            {
                "id": "catalog-paused",
                "commercial_profile_id": "profile-visible",
                "status": "paused",
                "archived_at": None,
            },
        ]

        offers = [
            {
                "id": "product-1",
                "commercial_profile_id": "profile-visible",
                "catalog_id": "catalog-visible",
                "offer_kind": "product",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            },
            {
                "id": "product-2",
                "commercial_profile_id": "profile-visible",
                "catalog_id": "catalog-visible",
                "offer_kind": "product",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            },
            {
                "id": "service-1",
                "commercial_profile_id": "profile-visible",
                "catalog_id": "catalog-visible",
                "offer_kind": "service",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            },
            {
                "id": "product-paused",
                "commercial_profile_id": "profile-visible",
                "catalog_id": "catalog-visible",
                "offer_kind": "product",
                "status": "paused",
                "is_available": True,
                "archived_at": None,
            },
            {
                "id": "product-unavailable",
                "commercial_profile_id": "profile-visible",
                "catalog_id": "catalog-visible",
                "offer_kind": "product",
                "status": "published",
                "is_available": False,
                "archived_at": None,
            },
            {
                "id": "product-paused-catalog",
                "commercial_profile_id": "profile-visible",
                "catalog_id": "catalog-paused",
                "offer_kind": "product",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            },
            {
                "id": "product-private-profile",
                "commercial_profile_id": "profile-private",
                "catalog_id": "catalog-visible",
                "offer_kind": "product",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            },
        ]

        class Response:
            def __init__(self, data):
                self.data = data

        class Query:
            def __init__(self, table_name):
                self.table_name = table_name

            def select(self, *_args, **_kwargs):
                return self

            def eq(self, *_args, **_kwargs):
                return self

            def is_(self, *_args, **_kwargs):
                return self

            def in_(self, *_args, **_kwargs):
                return self

            def order(self, *_args, **_kwargs):
                return self

            def execute(self):
                rows = {
                    "commercial_profiles": profiles,
                    "commercial_catalogs": catalogs,
                    "commercial_offers": offers,
                    "commercial_offer_modalities": [],
                    "commercial_offer_images": [],
                    "files": [],
                }[self.table_name]
                return Response(rows)

        class Client:
            def table(self, table_name):
                return Query(table_name)

        retry_mock.side_effect = lambda operation: operation(Client())

        with patch(
            "apps.commercial.services."
            "commercial_public_service."
            "_enrich_public_offers",
            side_effect=lambda rows: rows,
        ):
            result = list_public_commercial_product_feed(
                seed="same-seed",
                limit=1,
                offset=0,
            )

        self.assertEqual(result["count"], 2)
        self.assertEqual(len(result["offers"]), 1)
        self.assertTrue(result["has_more"])
        self.assertEqual(result["next_offset"], 1)
        self.assertTrue(
            result["offers"][0]["id"] in {
                "product-1",
                "product-2",
            }
        )

    @patch(
        "apps.commercial.services."
        "commercial_public_service."
        "execute_with_supabase_admin_retry"
    )
    def test_feed_order_is_stable_for_same_seed(
        self,
        retry_mock,
    ):
        from apps.commercial.services.commercial_public_service import (
            list_public_commercial_product_feed,
        )

        rows = [
            {
                "id": f"product-{number}",
                "commercial_profile_id": "profile-1",
                "catalog_id": "catalog-1",
                "offer_kind": "product",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            }
            for number in range(1, 6)
        ]

        class Response:
            def __init__(self, data):
                self.data = data

        class Query:
            def __init__(self, table_name):
                self.table_name = table_name

            def select(self, *_args, **_kwargs):
                return self

            def eq(self, *_args, **_kwargs):
                return self

            def is_(self, *_args, **_kwargs):
                return self

            def in_(self, *_args, **_kwargs):
                return self

            def order(self, *_args, **_kwargs):
                return self

            def execute(self):
                data = {
                    "commercial_profiles": [
                        {
                            "id": "profile-1",
                            "is_public": True,
                            "is_available": True,
                            "publication_status": "published",
                            "archived_at": None,
                            "suspended_at": None,
                        }
                    ],
                    "commercial_catalogs": [
                        {
                            "id": "catalog-1",
                            "commercial_profile_id": "profile-1",
                            "status": "published",
                            "archived_at": None,
                        }
                    ],
                    "commercial_offers": rows,
                    "commercial_offer_modalities": [],
                    "commercial_offer_images": [],
                    "files": [],
                }[self.table_name]
                return Response(data)

        class Client:
            def table(self, table_name):
                return Query(table_name)

        retry_mock.side_effect = lambda operation: operation(Client())

        with patch(
            "apps.commercial.services."
            "commercial_public_service."
            "_enrich_public_offers",
            side_effect=lambda items: items,
        ):
            first = list_public_commercial_product_feed(
                seed="stable-seed",
                limit=5,
                offset=0,
            )
            second = list_public_commercial_product_feed(
                seed="stable-seed",
                limit=5,
                offset=0,
            )
            third = list_public_commercial_product_feed(
                seed="different-seed",
                limit=5,
                offset=0,
            )

        first_ids = [item["id"] for item in first["offers"]]
        second_ids = [item["id"] for item in second["offers"]]
        third_ids = [item["id"] for item in third["offers"]]

        self.assertEqual(first_ids, second_ids)
        self.assertEqual(len(first_ids), 5)
        self.assertFalse(first["has_more"])
        self.assertIsNone(first["next_offset"])
        self.assertNotEqual(first_ids, third_ids)
