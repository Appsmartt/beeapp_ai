from django.test import SimpleTestCase

from apps.storage import views


class StorageViewExportsTests(SimpleTestCase):
    def test_public_view_exports_are_available(self):
        expected_view_names = {
            "FileShareDetailView",
            "FileTagsView",
            "StorageFileAccessView",
            "StorageFileDetailView",
            "StorageFileRestoreView",
            "StorageFilesView",
            "StorageFileSharesView",
            "StorageFileTrashView",
            "StorageFolderDetailView",
            "StorageFoldersView",
            "StorageReceivedSharesView",
            "StorageShareRecipientSearchView",
            "StorageSummaryView",
            "StorageTagDetailView",
            "StorageTagsView",
            "StorageUploadView",
        }

        self.assertEqual(set(views.__all__), expected_view_names)

        for view_name in expected_view_names:
            with self.subTest(view_name=view_name):
                view_class = getattr(views, view_name)
                self.assertTrue(hasattr(view_class, "as_view"))
