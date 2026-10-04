from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, SimpleTestCase

from apps.storage.views import (
    FileShareDetailView,
    FileTagsView,
    StorageFileAccessView,
    StorageFileDetailView,
    StorageFileRestoreView,
    StorageFilesView,
    StorageFileSharesView,
    StorageFileTrashView,
    StorageFolderDetailView,
    StorageFoldersView,
    StorageReceivedSharesView,
    StorageShareRecipientSearchView,
    StorageSummaryView,
    StorageTagDetailView,
    StorageTagsView,
    StorageUploadView,
)


class StorageViewModuleContractsTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = SimpleNamespace(id=uuid4())

    def authenticate(self, view_class):
        return patch.object(
            view_class,
            "get_authenticated_user",
            return_value=self.user,
        )

    def test_summary_view_delegates_to_service(self):
        request = self.factory.get("/summary/")
        with self.authenticate(StorageSummaryView), patch(
            "apps.storage.views.summary.get_storage_summary",
            return_value={"used_bytes": 0},
        ) as service:
            response = StorageSummaryView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"storage": {"used_bytes": 0}})
        service.assert_called_once_with(user_id=str(self.user.id))

    def test_files_view_delegates_validated_query(self):
        request = self.factory.get("/files/", {"limit": 20})
        with self.authenticate(StorageFilesView), patch(
            "apps.storage.views.files.list_user_files",
            return_value={"files": []},
        ) as service:
            response = StorageFilesView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"files": []})
        self.assertEqual(service.call_args.kwargs["user_id"], str(self.user.id))

    def test_folder_collection_supports_get_and_post(self):
        get_request = self.factory.get("/folders/")
        post_request = self.factory.post(
            "/folders/",
            {"name": "Contract folder"},
        )

        with self.authenticate(StorageFoldersView), patch(
            "apps.storage.views.folders.list_user_folders",
            return_value=[],
        ) as list_service:
            get_response = StorageFoldersView.as_view()(get_request)

        with self.authenticate(StorageFoldersView), patch(
            "apps.storage.views.folders.create_folder",
            return_value={"id": "folder"},
        ) as create_service:
            post_response = StorageFoldersView.as_view()(post_request)

        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data, {"folders": []})
        self.assertEqual(post_response.status_code, 201)
        self.assertEqual(post_response.data, {"folder": {"id": "folder"}})
        self.assertEqual(
            list_service.call_args.kwargs["user_id"],
            str(self.user.id),
        )
        self.assertEqual(
            create_service.call_args.kwargs["user_id"],
            str(self.user.id),
        )

    def test_folder_detail_routes_rename_move_and_delete(self):
        folder_id = uuid4()
        rename_request = self.factory.patch(
            f"/folders/{folder_id}/",
            {"name": "Renamed"},
            content_type="application/json",
        )
        move_request = self.factory.patch(
            f"/folders/{folder_id}/",
            {"parent_id": None},
            content_type="application/json",
        )
        delete_request = self.factory.delete(f"/folders/{folder_id}/")

        with self.authenticate(StorageFolderDetailView), patch(
            "apps.storage.views.folders.rename_folder",
            return_value={"id": str(folder_id)},
        ):
            rename_response = StorageFolderDetailView.as_view()(
                rename_request,
                folder_id=folder_id,
            )

        with self.authenticate(StorageFolderDetailView), patch(
            "apps.storage.views.folders.move_folder",
            return_value={"id": str(folder_id)},
        ):
            move_response = StorageFolderDetailView.as_view()(
                move_request,
                folder_id=folder_id,
            )

        with self.authenticate(StorageFolderDetailView), patch(
            "apps.storage.views.folders.delete_folder",
        ):
            delete_response = StorageFolderDetailView.as_view()(
                delete_request,
                folder_id=folder_id,
            )

        self.assertEqual(rename_response.status_code, 200)
        self.assertEqual(move_response.status_code, 200)
        self.assertEqual(delete_response.status_code, 204)

    def test_upload_view_accepts_single_file_contract(self):
        upload = SimpleUploadedFile(
            name="contract.txt",
            content=b"x",
            content_type="text/plain",
        )
        request = self.factory.post(
            "/uploads/",
            {"file": upload},
        )

        with self.authenticate(StorageUploadView), patch(
            "apps.storage.views.uploads.upload_multiple_files",
            return_value={"success_count": 1, "files": []},
        ):
            response = StorageUploadView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["success_count"], 1)

    def test_file_actions_delegate_without_changing_statuses(self):
        file_id = uuid4()
        access_request = self.factory.get(f"/files/{file_id}/access/")
        trash_request = self.factory.post(f"/files/{file_id}/trash/")
        restore_request = self.factory.post(f"/files/{file_id}/restore/")

        with self.authenticate(StorageFileAccessView), patch(
            "apps.storage.views.files.create_file_access_url",
            return_value={"url": "https://example.invalid/file"},
        ):
            access_response = StorageFileAccessView.as_view()(
                access_request,
                file_id=file_id,
            )

        with self.authenticate(StorageFileTrashView), patch(
            "apps.storage.views.files.move_file_to_trash",
        ):
            trash_response = StorageFileTrashView.as_view()(
                trash_request,
                file_id=file_id,
            )

        with self.authenticate(StorageFileRestoreView), patch(
            "apps.storage.views.files.restore_file_from_trash",
        ):
            restore_response = StorageFileRestoreView.as_view()(
                restore_request,
                file_id=file_id,
            )

        self.assertEqual(access_response.status_code, 200)
        self.assertEqual(trash_response.status_code, 200)
        self.assertEqual(restore_response.status_code, 200)

    def test_file_detail_supports_rename_move_and_delete(self):
        file_id = uuid4()
        rename_request = self.factory.patch(
            f"/files/{file_id}/",
            {"display_name": "renamed.txt"},
            content_type="application/json",
        )
        move_request = self.factory.patch(
            f"/files/{file_id}/",
            {"folder_id": None},
            content_type="application/json",
        )
        delete_request = self.factory.delete(f"/files/{file_id}/")

        with self.authenticate(StorageFileDetailView), patch(
            "apps.storage.views.file_details.rename_file",
            return_value={"id": str(file_id)},
        ):
            rename_response = StorageFileDetailView.as_view()(
                rename_request,
                file_id=file_id,
            )

        with self.authenticate(StorageFileDetailView), patch(
            "apps.storage.views.file_details.move_file",
            return_value={"id": str(file_id)},
        ):
            move_response = StorageFileDetailView.as_view()(
                move_request,
                file_id=file_id,
            )

        with self.authenticate(StorageFileDetailView), patch(
            "apps.storage.views.file_details.permanently_delete_file",
        ):
            delete_response = StorageFileDetailView.as_view()(
                delete_request,
                file_id=file_id,
            )

        self.assertEqual(rename_response.status_code, 200)
        self.assertEqual(move_response.status_code, 200)
        self.assertEqual(delete_response.status_code, 204)

    def test_tag_views_preserve_collection_detail_and_file_contracts(self):
        tag_id = uuid4()
        file_id = uuid4()
        tags_request = self.factory.get("/tags/")
        create_request = self.factory.post(
            "/tags/",
            {"name": "Contract tag", "color": "#112233"},
        )
        update_request = self.factory.patch(
            f"/tags/{tag_id}/",
            {"name": "Updated tag"},
            content_type="application/json",
        )
        delete_request = self.factory.delete(f"/tags/{tag_id}/")
        file_tags_request = self.factory.get(f"/files/{file_id}/tags/")
        replace_request = self.factory.put(
            f"/files/{file_id}/tags/",
            {"tag_ids": []},
            content_type="application/json",
        )

        with self.authenticate(StorageTagsView), patch(
            "apps.storage.views.tags.list_user_tags",
            return_value=[],
        ):
            tags_response = StorageTagsView.as_view()(tags_request)

        with self.authenticate(StorageTagsView), patch(
            "apps.storage.views.tags.create_tag",
            return_value={"id": str(tag_id)},
        ):
            create_response = StorageTagsView.as_view()(create_request)

        with self.authenticate(StorageTagDetailView), patch(
            "apps.storage.views.tags.update_tag",
            return_value={"id": str(tag_id)},
        ):
            update_response = StorageTagDetailView.as_view()(
                update_request,
                tag_id=tag_id,
            )

        with self.authenticate(StorageTagDetailView), patch(
            "apps.storage.views.tags.delete_tag",
        ):
            delete_response = StorageTagDetailView.as_view()(
                delete_request,
                tag_id=tag_id,
            )

        with self.authenticate(FileTagsView), patch(
            "apps.storage.views.tags.list_file_tags",
            return_value=[],
        ):
            file_tags_response = FileTagsView.as_view()(
                file_tags_request,
                file_id=file_id,
            )

        with self.authenticate(FileTagsView), patch(
            "apps.storage.views.tags.replace_file_tags",
            return_value=[],
        ):
            replace_response = FileTagsView.as_view()(
                replace_request,
                file_id=file_id,
            )

        self.assertEqual(tags_response.status_code, 200)
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(file_tags_response.status_code, 200)
        self.assertEqual(replace_response.status_code, 200)

    def test_share_views_preserve_search_create_list_revoke_and_hide(self):
        file_id = uuid4()
        share_id = uuid4()
        recipient_id = uuid4()
        search_request = self.factory.get(
            "/share-recipients/",
            {"q": "contract", "limit": 10},
        )
        create_request = self.factory.post(
            f"/files/{file_id}/shares/",
            {
                "recipient_id": str(recipient_id),
                "permission": "viewer",
            },
        )
        received_request = self.factory.get("/shares/received/")
        revoke_request = self.factory.post(f"/shares/{share_id}/revoke/")
        hide_request = self.factory.post(f"/shares/{share_id}/hide/")

        with self.authenticate(StorageShareRecipientSearchView), patch(
            "apps.storage.views.shares.search_share_recipients",
            return_value=[],
        ):
            search_response = StorageShareRecipientSearchView.as_view()(
                search_request
            )

        with self.authenticate(StorageFileSharesView), patch(
            "apps.storage.views.shares.create_file_share",
            return_value={"id": str(share_id)},
        ):
            create_response = StorageFileSharesView.as_view()(
                create_request,
                file_id=file_id,
            )

        with self.authenticate(StorageReceivedSharesView), patch(
            "apps.storage.views.shares.list_received_shares",
            return_value={"shares": []},
        ):
            received_response = StorageReceivedSharesView.as_view()(
                received_request
            )

        with self.authenticate(FileShareDetailView), patch(
            "apps.storage.views.shares.revoke_file_share",
            return_value={"id": str(share_id)},
        ):
            revoke_response = FileShareDetailView.as_view()(
                revoke_request,
                share_id=share_id,
            )

        with self.authenticate(FileShareDetailView), patch(
            "apps.storage.views.shares.hide_received_share",
            return_value={"id": str(share_id)},
        ):
            hide_response = FileShareDetailView.as_view()(
                hide_request,
                share_id=share_id,
            )

        self.assertEqual(search_response.status_code, 200)
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(received_response.status_code, 200)
        self.assertEqual(revoke_response.status_code, 200)
        self.assertEqual(hide_response.status_code, 200)
