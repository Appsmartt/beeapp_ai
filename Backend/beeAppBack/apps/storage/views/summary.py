from __future__ import annotations

import logging

from django.http import QueryDict

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import (
    AccountAuthenticationError,
)
from apps.accounts.views import (
    AuthenticatedAPIView,
)

from apps.storage.exceptions import (
    StorageAccessError,
    StorageFileNotFoundError,
    StorageFileOperationError,
    StorageFolderError,
    StorageFolderNotFoundError,
    StorageQuotaExceededError,
    StorageRecipientNotFoundError,
    StorageShareError,
    StorageShareNotFoundError,
    StorageTagError,
    StorageTagNotFoundError,
    StorageUploadError,
)
from apps.storage.serializers import (
    CreateFileShareSerializer,
    CreateStorageFolderSerializer,
    CreateStorageTagSerializer,
    FileAccessQuerySerializer,
    ReceivedSharesQuerySerializer,
    MoveStorageFileSerializer,
    MoveStorageFolderSerializer,
    RenameStorageFileSerializer,
    RecipientSearchQuerySerializer,
    RenameStorageFolderSerializer,
    ReplaceFileTagsSerializer,
    StorageFolderQuerySerializer,
    StorageListQuerySerializer,
    UpdateStorageTagSerializer,
    UploadStorageFilesSerializer,
)
from apps.storage.services.file_operations.file_access import (
    create_file_access_url,
)
from apps.storage.services.file_operations.file_mutations import (
    move_file,
    move_file_to_trash,
    permanently_delete_file,
    rename_file,
    restore_file_from_trash,
)
from apps.storage.services.file_operations.file_queries import (
    get_storage_summary,
    list_user_files,
)
from apps.storage.services.file_operations.file_uploads import (
    upload_multiple_files,
)
from apps.storage.services.storage_folder_service import (
    create_folder,
    delete_folder,
    list_user_folders,
    move_folder,
    rename_folder,
)
from apps.storage.services.storage_share_service import (
    create_file_share,
    hide_received_share,
    list_received_shares,
    revoke_file_share,
    search_share_recipients,
)
from apps.storage.services.storage_tag_service import (
    create_tag,
    delete_tag,
    list_file_tags,
    list_user_tags,
    replace_file_tags,
    update_tag,
)


logger = logging.getLogger(__name__)


class StorageSummaryView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)

            summary = get_storage_summary(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageFileOperationError:
            return Response(
                {
                    "detail": "Could not retrieve storage summary.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "storage": summary,
            },
            status=status.HTTP_200_OK,
        )
