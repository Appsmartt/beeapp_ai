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
    def test_feed_returns_only_visible_offers_with_pagination(
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
                self.filters = []

            def select(self, *_args, **_kwargs):
                return self

            def eq(self, column, value):
                self.filters.append(("eq", column, value))
                return self

            def is_(self, column, value):
                self.filters.append(("is", column, value))
                return self

            def in_(self, column, values):
                self.filters.append(("in", column, set(values)))
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

                for filter_kind, column, value in self.filters:
                    if filter_kind == "eq":
                        rows = [
                            row for row in rows
                            if row.get(column) == value
                        ]
                    elif filter_kind == "is":
                        expected = None if value == "null" else value
                        rows = [
                            row for row in rows
                            if row.get(column) is expected
                        ]
                    else:
                        rows = [
                            row for row in rows
                            if row.get(column) in value
                        ]

                if self.table_name == "commercial_offers":
                    public_profile_ids = {
                        str(profile["id"])
                        for profile in profiles
                        if (
                            profile.get("is_public") is True
                            and profile.get("is_available") is True
                            and profile.get("publication_status")
                            == "published"
                            and profile.get("archived_at") is None
                            and profile.get("suspended_at") is None
                        )
                    }
                    rows = [
                        row for row in rows
                        if str(row.get("commercial_profile_id"))
                        in public_profile_ids
                    ]

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

        self.assertEqual(result["count"], 3)
        self.assertEqual(len(result["offers"]), 1)
        self.assertTrue(result["has_more"])
        self.assertEqual(result["next_offset"], 1)
        self.assertTrue(
            result["offers"][0]["id"] in {
                "product-1",
                "product-2",
                "service-1",
            }
        )

    @patch(
        "apps.commercial.services."
        "commercial_public_service."
        "execute_with_supabase_admin_retry"
    )
    def test_search_excludes_inactive_offers_and_catalogs(
        self,
        retry_mock,
    ):
        from apps.commercial.services.commercial_public_service import (
            list_public_commercial_product_feed,
        )

        profiles = [
            {
                "id": "profile-cafe",
                "display_name": "Café Central",
                "description": "Café y postres",
                "custom_activity_text": "Cafetería",
                "is_public": True,
                "is_available": True,
                "publication_status": "published",
                "archived_at": None,
                "suspended_at": None,
            }
        ]

        catalogs = [
            {
                "id": "catalog-public",
                "commercial_profile_id": "profile-cafe",
                "status": "published",
                "archived_at": None,
            },
            {
                "id": "catalog-paused",
                "commercial_profile_id": "profile-cafe",
                "status": "paused",
                "archived_at": None,
            },
        ]

        offers = [
            {
                "id": "offer-visible",
                "commercial_profile_id": "profile-cafe",
                "catalog_id": "catalog-public",
                "offer_kind": "product",
                "title": "Café especial",
                "description": "Café de origen",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            },
            {
                "id": "offer-paused",
                "commercial_profile_id": "profile-cafe",
                "catalog_id": "catalog-public",
                "offer_kind": "product",
                "title": "Café pausado",
                "description": "No debe aparecer",
                "status": "paused",
                "is_available": True,
                "archived_at": None,
            },
            {
                "id": "offer-unavailable",
                "commercial_profile_id": "profile-cafe",
                "catalog_id": "catalog-public",
                "offer_kind": "product",
                "title": "Café no disponible",
                "description": "No debe aparecer",
                "status": "published",
                "is_available": False,
                "archived_at": None,
            },
            {
                "id": "offer-paused-catalog",
                "commercial_profile_id": "profile-cafe",
                "catalog_id": "catalog-paused",
                "offer_kind": "product",
                "title": "Café de catálogo pausado",
                "description": "No debe aparecer",
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
                self.filters = []

            def select(self, *_args, **_kwargs):
                return self

            def eq(self, column, value):
                self.filters.append(("eq", column, value))
                return self

            def is_(self, column, value):
                self.filters.append(("is", column, value))
                return self

            def in_(self, column, values):
                self.filters.append(("in", column, set(values)))
                return self

            def or_(self, *_args, **_kwargs):
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

                for filter_kind, column, value in self.filters:
                    if filter_kind == "eq":
                        rows = [
                            row for row in rows
                            if row.get(column) == value
                        ]
                    elif filter_kind == "is":
                        expected = None if value == "null" else value
                        rows = [
                            row for row in rows
                            if row.get(column) is expected
                        ]
                    else:
                        rows = [
                            row for row in rows
                            if row.get(column) in value
                        ]

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
        ), patch(
            "apps.commercial.services."
            "commercial_public_service."
            "_enrich_public_profiles",
            side_effect=lambda rows: rows,
        ):
            result = list_public_commercial_product_feed(
                search="cafe",
                limit=4,
                offset=0,
            )

        self.assertEqual(result["count"], 1)
        self.assertEqual(
            [offer["id"] for offer in result["offers"]],
            ["offer-visible"],
        )
        self.assertEqual(result["profiles_count"], 1)
        self.assertEqual(
            [profile["id"] for profile in result["profiles"]],
            ["profile-cafe"],
        )

    @patch(
        "apps.commercial.services."
        "commercial_public_service."
        "execute_with_supabase_admin_retry"
    )
    def test_feed_excludes_non_public_business_states_before_offer_lookup(
        self,
        retry_mock,
    ):
        from apps.commercial.services.commercial_public_service import (
            list_public_commercial_product_feed,
        )

        profiles = [
            {
                "id": "profile-public",
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
            {
                "id": "profile-paused",
                "is_public": True,
                "is_available": False,
                "publication_status": "published",
                "archived_at": None,
                "suspended_at": None,
            },
            {
                "id": "profile-draft",
                "is_public": True,
                "is_available": True,
                "publication_status": "draft",
                "archived_at": None,
                "suspended_at": None,
            },
            {
                "id": "profile-suspended",
                "is_public": True,
                "is_available": True,
                "publication_status": "published",
                "archived_at": None,
                "suspended_at": "2026-10-01T00:00:00+00:00",
            },
            {
                "id": "profile-archived",
                "is_public": True,
                "is_available": True,
                "publication_status": "published",
                "archived_at": "2026-10-01T00:00:00+00:00",
                "suspended_at": None,
            },
        ]

        offers = [
            {
                "id": f"offer-{profile['id']}",
                "commercial_profile_id": profile["id"],
                "catalog_id": f"catalog-{profile['id']}",
                "offer_kind": "product",
                "status": "published",
                "is_available": True,
                "archived_at": None,
            }
            for profile in profiles
        ]

        catalogs = [
            {
                "id": offer["catalog_id"],
                "commercial_profile_id": offer[
                    "commercial_profile_id"
                ],
                "status": "published",
                "archived_at": None,
            }
            for offer in offers
        ]

        class Response:
            def __init__(self, data):
                self.data = data

        class Query:
            offer_profile_filters: list[set[str]] = []
            profile_query_filters: list[
                tuple[str, str, object]
            ] = []

            def __init__(self, table_name):
                self.table_name = table_name
                self.filters = []

            def select(self, *_args, **_kwargs):
                return self

            def eq(self, column, value):
                self.filters.append(("eq", column, value))
                return self

            def is_(self, column, value):
                self.filters.append(("is", column, value))
                return self

            def in_(self, column, values):
                normalized_values = set(values)
                self.filters.append(
                    ("in", column, normalized_values)
                )
                if (
                    self.table_name == "commercial_offers"
                    and column == "commercial_profile_id"
                ):
                    self.offer_profile_filters.append(
                        normalized_values
                    )
                return self

            def order(self, *_args, **_kwargs):
                return self

            def execute(self):
                if self.table_name == "commercial_profiles":
                    self.profile_query_filters.extend(self.filters)

                rows = {
                    "commercial_profiles": profiles,
                    "commercial_offers": offers,
                    "commercial_catalogs": catalogs,
                    "commercial_offer_modalities": [],
                    "commercial_offer_images": [],
                    "files": [],
                }[self.table_name]

                for filter_kind, column, value in self.filters:
                    if filter_kind == "eq":
                        rows = [
                            row for row in rows
                            if row.get(column) == value
                        ]
                    elif filter_kind == "is":
                        expected = None if value == "null" else value
                        rows = [
                            row for row in rows
                            if row.get(column) is expected
                        ]
                    else:
                        rows = [
                            row for row in rows
                            if row.get(column) in value
                        ]

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
                seed="s11-public-businesses-only",
                limit=20,
                offset=0,
            )

        self.assertEqual(result["count"], 1)
        self.assertEqual(
            [offer["id"] for offer in result["offers"]],
            ["offer-profile-public"],
        )
        self.assertEqual(
            Query.offer_profile_filters,
            [{"profile-public"}],
        )

        self.assertEqual(
            set(Query.profile_query_filters),
            {
                ("eq", "is_public", True),
                ("eq", "is_available", True),
                ("eq", "publication_status", "published"),
                ("is", "archived_at", "null"),
                ("is", "suspended_at", "null"),
            },
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
