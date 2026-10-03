from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.storage.exceptions import StorageFileNotFoundError, StorageShareError
from apps.storage.services.file_operations.file_access import (
    create_file_access_url,
    get_accessible_file,
)
from apps.storage.services.file_operations.file_mail_attachments import (
    get_file_content_for_mail_attachment,
)
from apps.storage.services.storage_share_service import (
    create_file_share,
    list_received_shares,
)


def query_with_result(data):
    query = MagicMock()
    for method in ("select", "eq", "neq", "is_", "or_", "range", "order", "maybe_single"):
        getattr(query, method).return_value = query
    query.execute.return_value = SimpleNamespace(data=data)
    return query


class ExpiredFileShareTests(SimpleTestCase):
    def test_expired_share_cannot_access_file(self):
        own = query_with_result(None)
        shared = query_with_result(None)
        client = MagicMock()
        client.table.side_effect = [own, shared]
        with patch(
            "apps.storage.services.file_operations.file_access.get_supabase_admin_client",
            return_value=client,
        ):
            with self.assertRaises(StorageFileNotFoundError):
                get_accessible_file(user_id="recipient", file_id="file")
        shared.or_.assert_called_once()
        self.assertIn("expires_at.is.null", shared.or_.call_args.args[0])
        self.assertIn("expires_at.gt.", shared.or_.call_args.args[0])
        self.assertNotIn("files", [call.args[0] for call in client.table.call_args_list[2:]])

    def test_received_shares_filter_expiration_before_pagination(self):
        query = query_with_result([])
        client = MagicMock()
        client.table.return_value = query
        with patch(
            "apps.storage.services.storage_share_service.get_supabase_admin_client",
            return_value=client,
        ):
            result = list_received_shares(user_id="recipient", limit=10)
        self.assertEqual(result["shares"], [])
        names = [call[0] for call in query.method_calls]
        self.assertLess(names.index("or_"), names.index("range"))
        self.assertIn("expires_at.gt.", query.or_.call_args.args[0])

    def test_rejects_past_and_invalid_expirations_without_database_access(self):
        for expiry in (
            (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat(),
            "invalid",
            "2020-01-01T00:00:00",
        ):
            with self.subTest(expiry=expiry):
                with patch(
                    "apps.storage.services.storage_share_service.get_owned_file"
                ) as owned:
                    with self.assertRaises(StorageShareError):
                        create_file_share(
                            user_id="owner",
                            file_id="file",
                            recipient_id="recipient",
                            expires_at=expiry,
                        )
                    owned.assert_not_called()

    def test_future_expiration_passes_service_validation(self):
        expiry = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        with patch(
            "apps.storage.services.storage_share_service.get_owned_file",
            side_effect=StorageFileNotFoundError("not found"),
        ) as owned:
            with self.assertRaises(StorageFileNotFoundError):
                create_file_share(
                    user_id="owner",
                    file_id="file",
                    recipient_id="recipient",
                    expires_at=expiry,
                )
            owned.assert_called_once()

    def test_owner_keeps_access_to_own_file(self):
        file_record = {"id": "file", "owner_id": "owner", "status": "ready"}
        own = query_with_result(file_record)
        client = MagicMock()
        client.table.return_value = own
        with patch(
            "apps.storage.services.file_operations.file_access.get_supabase_admin_client",
            return_value=client,
        ):
            result = get_accessible_file(user_id="owner", file_id="file")
        self.assertEqual(result, file_record)
        client.table.assert_called_once_with("files")

    def test_expired_share_cannot_reach_mail_attachment_download(self):
        client = MagicMock()
        with patch(
            "apps.storage.services.file_operations.file_mail_attachments.get_accessible_file",
            side_effect=StorageFileNotFoundError("expired"),
        ), patch(
            "apps.storage.services.file_operations.file_mail_attachments.get_supabase_admin_client",
            return_value=client,
        ):
            with self.assertRaises(StorageFileNotFoundError):
                get_file_content_for_mail_attachment(
                    user_id="recipient", file_id="file", max_size_bytes=1024
                )
        client.storage.from_.assert_not_called()

    def test_expired_share_mail_attachment_checks_real_access_before_download(self):
        own = query_with_result(None)
        expired_share = query_with_result(None)
        access_client = MagicMock()
        access_client.table.side_effect = [own, expired_share]
        download_client = MagicMock()

        with patch(
            "apps.storage.services.file_operations.file_access.get_supabase_admin_client",
            return_value=access_client,
        ), patch(
            "apps.storage.services.file_operations.file_mail_attachments.get_supabase_admin_client",
            return_value=download_client,
        ):
            with self.assertRaises(StorageFileNotFoundError):
                get_file_content_for_mail_attachment(
                    user_id="recipient",
                    file_id="file",
                    max_size_bytes=1024,
                )

        expired_share.or_.assert_called_once()
        self.assertIn("expires_at.is.null", expired_share.or_.call_args.args[0])
        self.assertIn("expires_at.gt.", expired_share.or_.call_args.args[0])
        download_client.storage.from_.assert_not_called()

    def test_owner_and_unlimited_share_keep_standard_signed_url_ttl(self):
        for expiration in (None, "unlimited"):
            with self.subTest(expiration=expiration):
                client = MagicMock()
                client.storage.from_.return_value.create_signed_url.return_value = {
                    "signedURL": "https://example.invalid/signed"
                }
                file_record = {
                    "id": "file", "bucket_id": "private",
                    "storage_path": "file", "display_name": "file.txt",
                }

                def accessible_file(*, user_id, file_id, access_metadata):
                    if expiration == "unlimited":
                        access_metadata["expires_at"] = None
                    return file_record

                with patch(
                    "apps.storage.services.file_operations.file_access.get_accessible_file",
                    side_effect=accessible_file,
                ), patch(
                    "apps.storage.services.file_operations.file_access.get_supabase_admin_client",
                    return_value=client,
                ):
                    result = create_file_access_url(
                        user_id="user", file_id="file"
                    )
                self.assertEqual(result["expires_in_seconds"], 300)
                client.storage.from_.return_value.create_signed_url.assert_called_once_with(
                    "file", 300, {}
                )

    def test_expiring_share_caps_signed_url_ttl(self):
        client = MagicMock()
        client.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://example.invalid/signed"
        }
        file_record = {
            "id": "file", "bucket_id": "private",
            "storage_path": "file", "display_name": "file.txt",
        }

        def accessible_file(*, user_id, file_id, access_metadata):
            access_metadata["expires_at"] = (
                datetime.now(timezone.utc) + timedelta(seconds=45)
            ).isoformat()
            return file_record

        with patch(
            "apps.storage.services.file_operations.file_access.get_accessible_file",
            side_effect=accessible_file,
        ), patch(
            "apps.storage.services.file_operations.file_access.get_supabase_admin_client",
            return_value=client,
        ):
            result = create_file_access_url(user_id="recipient", file_id="file")
        ttl = result["expires_in_seconds"]
        self.assertGreaterEqual(ttl, 1)
        self.assertLessEqual(ttl, 42)
        client.storage.from_.return_value.create_signed_url.assert_called_once_with(
            "file", ttl, {}
        )

    def test_share_near_expiration_cannot_issue_signed_url(self):
        client = MagicMock()

        def accessible_file(*, user_id, file_id, access_metadata):
            access_metadata["expires_at"] = (
                datetime.now(timezone.utc) + timedelta(seconds=2)
            ).isoformat()
            return {"id": "file"}

        with patch(
            "apps.storage.services.file_operations.file_access.get_accessible_file",
            side_effect=accessible_file,
        ), patch(
            "apps.storage.services.file_operations.file_access.get_supabase_admin_client",
            return_value=client,
        ):
            with self.assertRaises(StorageFileNotFoundError):
                create_file_access_url(user_id="recipient", file_id="file")
        client.storage.from_.assert_not_called()
