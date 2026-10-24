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


class StorageTagsView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)

            tags = list_user_tags(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageTagError:
            return Response(
                {
                    "detail": "Could not retrieve tags.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tags": tags,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CreateStorageTagSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            tag = create_tag(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageTagError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tag": tag,
            },
            status=status.HTTP_201_CREATED,
        )


class StorageTagDetailView(AuthenticatedAPIView):
    def patch(self, request, tag_id):
        serializer = UpdateStorageTagSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            tag = update_tag(
                user_id=str(authenticated_user.id),
                tag_id=str(tag_id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageTagNotFoundError:
            return Response(
                {
                    "detail": "Tag was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageTagError:
            return Response(
                {
                    "detail": "Could not update tag.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tag": tag,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, tag_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            delete_tag(
                user_id=str(authenticated_user.id),
                tag_id=str(tag_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageTagNotFoundError:
            return Response(
                {
                    "detail": "Tag was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageTagError:
            return Response(
                {
                    "detail": "Could not delete tag.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class FileTagsView(AuthenticatedAPIView):
    def get(self, request, file_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            tags = list_file_tags(
                user_id=str(authenticated_user.id),
                file_id=str(file_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageFileNotFoundError:
            return Response(
                {
                    "detail": "File was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageTagError:
            return Response(
                {
                    "detail": "Could not retrieve file tags.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tags": tags,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request, file_id):
        serializer = ReplaceFileTagsSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            tags = replace_file_tags(
                user_id=str(authenticated_user.id),
                file_id=str(file_id),
                tag_ids=[
                    str(tag_id)
                    for tag_id in (
                        serializer.validated_data["tag_ids"]
                    )
                ],
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageFileNotFoundError:
            return Response(
                {
                    "detail": "File was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageTagNotFoundError:
            return Response(
                {
                    "detail": "One or more tags were not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageTagError:
            return Response(
                {
                    "detail": "Could not update file tags.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tags": tags,
            },
            status=status.HTTP_200_OK,
        )
