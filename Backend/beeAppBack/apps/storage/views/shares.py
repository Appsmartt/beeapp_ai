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


class StorageShareRecipientSearchView(AuthenticatedAPIView):
    def get(self, request):
        serializer = RecipientSearchQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            recipients = search_share_recipients(
                user_id=str(authenticated_user.id),
                search_value=serializer.validated_data["q"],
                limit=serializer.validated_data["limit"],
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageShareError:
            return Response(
                {
                    "detail": "Could not search recipients.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "recipients": recipients,
            },
            status=status.HTTP_200_OK,
        )


class StorageFileSharesView(AuthenticatedAPIView):
    def post(self, request, file_id):
        serializer = CreateFileShareSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            share = create_file_share(
                user_id=str(authenticated_user.id),
                file_id=str(file_id),
                recipient_id=str(
                    serializer.validated_data["recipient_id"]
                ),
                permission=serializer.validated_data["permission"],
                expires_at=(
                    serializer.validated_data[
                        "expires_at"
                    ].isoformat()
                    if serializer.validated_data.get("expires_at")
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

        except StorageFileNotFoundError:
            return Response(
                {
                    "detail": "File was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageRecipientNotFoundError:
            return Response(
                {
                    "detail": "Recipient was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageShareError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "share": share,
            },
            status=status.HTTP_201_CREATED,
        )


class StorageReceivedSharesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = ReceivedSharesQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            shares = list_received_shares(
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

        except StorageShareError:
            return Response(
                {
                    "detail": "Could not retrieve shared files.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            shares,
            status=status.HTTP_200_OK,
        )


class FileShareDetailView(AuthenticatedAPIView):
    def post(self, request, share_id):
        path = request.path.rstrip("/")

        if path.endswith("/revoke"):
            return self._revoke(
                request=request,
                share_id=share_id,
            )

        if path.endswith("/hide"):
            return self._hide(
                request=request,
                share_id=share_id,
            )

        return Response(
            {
                "detail": "Unknown share action.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    def _revoke(self, request, share_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            share = revoke_file_share(
                user_id=str(authenticated_user.id),
                share_id=str(share_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageShareNotFoundError:
            return Response(
                {
                    "detail": "Share was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageShareError:
            return Response(
                {
                    "detail": "Could not revoke share.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "share": share,
            },
            status=status.HTTP_200_OK,
        )

    def _hide(self, request, share_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            share = hide_received_share(
                user_id=str(authenticated_user.id),
                share_id=str(share_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageShareNotFoundError:
            return Response(
                {
                    "detail": "Share was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageShareError:
            return Response(
                {
                    "detail": "Could not hide shared file.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "share": share,
            },
            status=status.HTTP_200_OK,
        )
