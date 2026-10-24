from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.commercial.services.commercial_public_service import (
    _enrich_public_profiles,
    _get_logo_files_by_profile_ids,
)
from apps.statuses.services.status_media_refactor.signed_urls import (
    create_status_offer_image_signed_url,
)


class S6PublicMediaOwnershipTests(SimpleTestCase):
    def test_logo_index_keeps_file_owner_in_key(self):
        client = MagicMock()
        query = MagicMock()
        for method in ("select", "in_", "eq", "is_"):
            getattr(query, method).return_value = query
        query.execute.return_value = SimpleNamespace(data=[{
            "id": "victim-file",
            "owner_id": "victim",
            "kind": "image",
            "status": "ready",
            "trashed_at": None,
            "bucket_id": "beeapp-files",
            "storage_path": "victim/logo.png",
        }])
        client.table.return_value = query
        with patch(
            "apps.commercial.services.commercial_public_service."
            "execute_with_supabase_admin_retry",
            side_effect=lambda operation: operation(client),
        ):
            indexed = _get_logo_files_by_profile_ids(profiles=[{
                "logo_file_id": "victim-file",
                "owner_id": "attacker",
            }])
        self.assertNotIn(("victim-file", "attacker"), indexed)
        self.assertIn(("victim-file", "victim"), indexed)

    def test_public_profile_does_not_attach_foreign_logo(self):
        profile = {
            "id": "business-a",
            "owner_id": "attacker",
            "logo_file_id": "victim-file",
        }
        with patch(
            "apps.commercial.services.commercial_public_service."
            "_get_modalities_by_profile_ids",
            return_value={},
        ), patch(
            "apps.commercial.services.commercial_public_service."
            "_get_logo_files_by_profile_ids",
            return_value={
                ("victim-file", "victim"): {"id": "victim-file"}
            },
        ), patch(
            "apps.commercial.services.commercial_public_service."
            "_get_category_ids_by_profile_ids",
            return_value={},
        ), patch(
            "apps.commercial.services.commercial_public_service."
            "_get_categories_by_ids",
            return_value={},
        ), patch(
            "apps.commercial.services.commercial_public_service."
            "_serialize_public_profile",
            side_effect=lambda **kwargs: kwargs["logo_file"],
        ):
            result = _enrich_public_profiles([profile])
        self.assertEqual(result, [None])

    def test_offer_story_does_not_sign_foreign_file(self):
        client = MagicMock()
        profiles = MagicMock()
        files = MagicMock()
        for query in (profiles, files):
            for method in ("select", "eq", "is_", "maybe_single"):
                getattr(query, method).return_value = query
        profiles.execute.return_value = SimpleNamespace(
            data={"owner_id": "business-owner"}
        )
        files.execute.return_value = SimpleNamespace(data=None)
        client.table.side_effect = lambda name: {
            "commercial_profiles": profiles,
            "files": files,
        }[name]
        with patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "execute_with_supabase_admin_retry",
            side_effect=lambda operation: operation(client),
        ), patch(
            "apps.statuses.services.status_media_refactor.signed_urls."
            "create_status_media_signed_url",
        ) as signer:
            result = create_status_offer_image_signed_url(
                commercial_profile_id="business-a",
                image_file_id="victim-file",
                bucket_id="beeapp-files",
                storage_path="victim/private.png",
            )
        self.assertIsNone(result)
        files.eq.assert_any_call("owner_id", "business-owner")
        files.eq.assert_any_call("bucket_id", "beeapp-files")
        files.eq.assert_any_call(
            "storage_path", "victim/private.png"
        )
        signer.assert_not_called()


class S6PublicOfferImageOwnershipTests(SimpleTestCase):
    def _queries(self, file_owner):
        client = MagicMock()
        rows = {
            "commercial_offer_images": [{
                "id": "image-relation",
                "commercial_offer_id": "offer-a",
                "file_id": "file-a",
                "status": "active",
            }],
            "commercial_offers": [{
                "id": "offer-a",
                "commercial_profile_id": "business-a",
            }],
            "commercial_profiles": [{
                "id": "business-a",
                "owner_id": "business-owner",
            }],
            "files": [{
                "id": "file-a",
                "owner_id": file_owner,
                "kind": "image",
                "status": "ready",
                "trashed_at": None,
                "bucket_id": "beeapp-files",
                "storage_path": "image.png",
            }],
        }
        queries = {}
        for name, data in rows.items():
            query = MagicMock()
            for method in ("select", "in_", "eq", "is_", "order"):
                getattr(query, method).return_value = query
            query.execute.return_value = SimpleNamespace(data=data)
            queries[name] = query
        client.table.side_effect = lambda name: queries[name]
        return client

    def _load(self, file_owner):
        from apps.commercial.services.commercial_public_service import (
            _get_offer_images_by_offer_ids,
        )
        client = self._queries(file_owner)
        with patch(
            "apps.commercial.services.commercial_public_service."
            "execute_with_supabase_admin_retry",
            side_effect=lambda operation: operation(client),
        ), patch(
            "apps.commercial.services.commercial_public_service."
            "_create_public_file_url",
            return_value=("https://signed.example/image", 300),
        ) as signer:
            result = _get_offer_images_by_offer_ids(
                offer_ids=["offer-a"]
            )
        return result, signer

    def test_foreign_offer_file_is_not_signed(self):
        result, signer = self._load("victim")
        self.assertEqual(result, {})
        signer.assert_not_called()

    def test_owned_offer_file_remains_visible(self):
        result, signer = self._load("business-owner")
        self.assertEqual(
            result["offer-a"][0]["url"],
            "https://signed.example/image",
        )
        signer.assert_called_once()
