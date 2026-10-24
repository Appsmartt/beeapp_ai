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


class StorageUploadView(AuthenticatedAPIView):
    def post(self, request):
        try:
            logger.warning(
                "Storage upload request received: method=%s content_type=%s "
                "content_length=%s files_keys=%s data_keys=%s",
                request.method,
                request.META.get("CONTENT_TYPE", ""),
                request.META.get("CONTENT_LENGTH", ""),
                list(request.FILES.keys()),
                list(request.data.keys()),
            )

            uploaded_files = request.FILES.getlist("files")
            single_file = request.FILES.get("file")

            request_data = QueryDict("", mutable=True)

            for key, values in request.data.lists():
                if key not in {"files", "file"}:
                    request_data.setlist(key, values)

            logger.warning(
                "Storage upload request parsed: files_count=%s has_single_file=%s",
                len(uploaded_files),
                bool(single_file),
            )

            if uploaded_files:
                request_data.setlist("files", uploaded_files)
            elif single_file:
                request_data.setlist("file", [single_file])

            serializer = UploadStorageFilesSerializer(
                data=request_data,
            )
            serializer.is_valid(raise_exception=True)

            authenticated_user = self.get_authenticated_user(request)
            folder_id = serializer.validated_data.get("folder_id")

            result = upload_multiple_files(
                user_id=str(authenticated_user.id),
                uploaded_files=serializer.validated_data["files"],
                folder_id=(
                    str(folder_id)
                    if folder_id
                    else None
                ),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageQuotaExceededError:
            return Response(
                {
                    "detail": (
                        "You do not have enough available storage "
                        "for these files."
                    ),
                },
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        except StorageUploadError as error:
            logger.exception(
                "Storage upload failed: user_id=%s detail=%s",
                getattr(request.user, "id", None),
                str(error),
            )
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as error:
            logger.exception(
                "Storage upload request failed before completion: "
                "error_type=%s error=%s",
                type(error).__name__,
                str(error),
            )
            return Response(
                {
                    "detail": "Could not process the selected file.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_status = (
            status.HTTP_201_CREATED
            if result["success_count"] > 0
            else status.HTTP_400_BAD_REQUEST
        )

        return Response(
            result,
            status=response_status,
        )
