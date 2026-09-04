from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialStateError,
)
from apps.commercial.serializers import (
    CreateCommercialCatalogSerializer,
    UpdateCommercialCatalogSerializer,
)
from apps.commercial.services.commercial_catalog_service import (
    _get_user_supabase_client,
    archive_commercial_catalog,
    restore_commercial_catalog,
    update_commercial_catalog,
)


class CommercialCatalogSerializerTests(SimpleTestCase):
    def test_create_catalog_rejects_blank_name(self):
        serializer = CreateCommercialCatalogSerializer(
            data={
                "name": "   ",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_create_catalog_normalizes_blank_description(self):
        serializer = CreateCommercialCatalogSerializer(
            data={
                "name": "Catálogo principal",
                "description": "   ",
            }
        )

        self.assertTrue(serializer.is_valid())
        self.assertIsNone(
            serializer.validated_data["description"]
        )

    def test_create_catalog_rejects_archived_status(self):
        serializer = CreateCommercialCatalogSerializer(
            data={
                "name": "Catálogo principal",
                "status": "archived",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("status", serializer.errors)

    def test_update_catalog_requires_at_least_one_field(self):
        serializer = UpdateCommercialCatalogSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "non_field_errors",
            serializer.errors,
        )

    def test_update_catalog_rejects_negative_sort_order(self):
        serializer = UpdateCommercialCatalogSerializer(
            data={
                "sort_order": -1,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("sort_order", serializer.errors)


class CommercialCatalogAccessTokenTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_catalog_service."
        "get_commercial_user_supabase_client"
    )
    def test_empty_token_is_rejected_before_client_creation(
        self,
        get_client_mock,
    ):
        with self.assertRaises(CommercialAccessError) as context:
            _get_user_supabase_client(
                access_token="   ",
            )

        get_client_mock.assert_not_called()
        self.assertEqual(
            context.exception.code,
            "AUTHENTICATION_REQUIRED",
        )


class CommercialCatalogStateTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_catalog_service."
        "get_owned_commercial_catalog"
    )
    def test_archiving_archived_catalog_is_rejected(
        self,
        get_catalog_mock,
    ):
        get_catalog_mock.return_value = {
            "id": "catalog-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            archive_commercial_catalog(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                catalog_id="catalog-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_CATALOG_ALREADY_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_catalog_service."
        "get_owned_commercial_catalog"
    )
    def test_restoring_non_archived_catalog_is_rejected(
        self,
        get_catalog_mock,
    ):
        get_catalog_mock.return_value = {
            "id": "catalog-1",
            "status": "published",
        }

        with self.assertRaises(CommercialStateError) as context:
            restore_commercial_catalog(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                catalog_id="catalog-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_CATALOG_NOT_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_catalog_service."
        "get_owned_commercial_catalog"
    )
    def test_updating_archived_catalog_is_rejected(
        self,
        get_catalog_mock,
    ):
        get_catalog_mock.return_value = {
            "id": "catalog-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            update_commercial_catalog(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                catalog_id="catalog-1",
                payload={
                    "name": "Nuevo nombre",
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_CATALOG_ARCHIVED",
        )


class CommercialCatalogStatusTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_catalog_service."
        "get_owned_commercial_catalog"
    )
    def test_archived_catalog_cannot_change_status(
        self,
        get_catalog_mock,
    ):
        from apps.commercial.exceptions import (
            CommercialStateError,
        )
        from apps.commercial.services.commercial_catalog_service import (
            set_commercial_catalog_status,
        )

        get_catalog_mock.return_value = {
            "id": "catalog-1",
            "status": "archived",
        }

        with self.assertRaises(CommercialStateError) as context:
            set_commercial_catalog_status(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                catalog_id="catalog-1",
                target_status="paused",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_CATALOG_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_catalog_service."
        "get_owned_commercial_catalog"
    )
    def test_catalog_rejects_same_requested_status(
        self,
        get_catalog_mock,
    ):
        from apps.commercial.exceptions import (
            CommercialStateError,
        )
        from apps.commercial.services.commercial_catalog_service import (
            set_commercial_catalog_status,
        )

        get_catalog_mock.return_value = {
            "id": "catalog-1",
            "status": "published",
        }

        with self.assertRaises(CommercialStateError) as context:
            set_commercial_catalog_status(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                catalog_id="catalog-1",
                target_status="published",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_CATALOG_STATUS_UNCHANGED",
        )
