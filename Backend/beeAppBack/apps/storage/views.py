from __future__ import annotations

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
from apps.storage.services.storage_file_service import (
    create_file_access_url,
    get_storage_summary,
    list_user_files,
    move_file,
    rename_file,
    move_file_to_trash,
    permanently_delete_file,
    restore_file_from_trash,
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


class StorageFilesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = StorageListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            files = list_user_files(
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

        except StorageFileOperationError:
            return Response(
                {
                    "detail": "Could not retrieve files.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            files,
            status=status.HTTP_200_OK,
        )


class StorageFoldersView(AuthenticatedAPIView):
    def get(self, request):
        serializer = StorageFolderQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            folders = list_user_folders(
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

        except StorageFolderError:
            return Response(
                {
                    "detail": "Could not retrieve folders.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "folders": folders,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CreateStorageFolderSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            folder = create_folder(
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

        except StorageFolderNotFoundError:
            return Response(
                {
                    "detail": "Parent folder was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageFolderError:
            return Response(
                {
                    "detail": "Could not create folder.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "folder": folder,
            },
            status=status.HTTP_201_CREATED,
        )


class StorageFolderDetailView(AuthenticatedAPIView):
    def patch(self, request, folder_id):
        if "name" in request.data:
            serializer = RenameStorageFolderSerializer(
                data=request.data,
            )
            serializer.is_valid(raise_exception=True)

            try:
                authenticated_user = self.get_authenticated_user(
                    request
                )

                folder = rename_folder(
                    user_id=str(authenticated_user.id),
                    folder_id=str(folder_id),
                    **serializer.validated_data,
                )

            except AccountAuthenticationError:
                return Response(
                    {
                        "detail": (
                            "Invalid or expired access token."
                        ),
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            except StorageFolderNotFoundError:
                return Response(
                    {
                        "detail": "Folder was not found.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            except StorageFolderError:
                return Response(
                    {
                        "detail": "Could not rename folder.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {
                    "folder": folder,
                },
                status=status.HTTP_200_OK,
            )

        serializer = MoveStorageFolderSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            folder = move_folder(
                user_id=str(authenticated_user.id),
                folder_id=str(folder_id),
                parent_id=(
                    str(
                        serializer.validated_data["parent_id"]
                    )
                    if serializer.validated_data.get("parent_id")
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

        except StorageFolderNotFoundError:
            return Response(
                {
                    "detail": "Folder was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageFolderError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "folder": folder,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, folder_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            delete_folder(
                user_id=str(authenticated_user.id),
                folder_id=str(folder_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageFolderNotFoundError:
            return Response(
                {
                    "detail": "Folder was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except StorageFolderError:
            return Response(
                {
                    "detail": "Could not delete folder.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class StorageUploadView(AuthenticatedAPIView):
    def post(self, request):
        request_data = request.data.copy()

        uploaded_files = request.FILES.getlist("files")
        single_file = request.FILES.get("file")

        if uploaded_files:
            request_data.setlist("files", uploaded_files)

        elif single_file:
            request_data["file"] = single_file

        serializer = UploadStorageFilesSerializer(
            data=request_data,
        )
        serializer.is_valid(raise_exception=True)

        try:
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
            return Response(
                {
                    "detail": str(error),
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


class StorageFileAccessView(AuthenticatedAPIView):
    def get(self, request, file_id):
        serializer = FileAccessQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            access = create_file_access_url(
                user_id=str(authenticated_user.id),
                file_id=str(file_id),
                **serializer.validated_data,
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

        except (
            StorageAccessError,
            StorageFileOperationError,
        ):
            return Response(
                {
                    "detail": "Could not create file access.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            access,
            status=status.HTTP_200_OK,
        )


class StorageFileTrashView(AuthenticatedAPIView):
    def post(self, request, file_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            move_file_to_trash(
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

        except StorageFileOperationError:
            return Response(
                {
                    "detail": "Could not move file to trash.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "File moved to trash.",
            },
            status=status.HTTP_200_OK,
        )


class StorageFileRestoreView(AuthenticatedAPIView):
    def post(self, request, file_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            restore_file_from_trash(
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

        except StorageFileOperationError:
            return Response(
                {
                    "detail": "Could not restore file.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "File restored.",
            },
            status=status.HTTP_200_OK,
        )


class StorageFileDetailView(AuthenticatedAPIView):
    def patch(self, request, file_id):
        if "display_name" in request.data:
            serializer = RenameStorageFileSerializer(
                data=request.data,
            )
            serializer.is_valid(raise_exception=True)

            try:
                authenticated_user = self.get_authenticated_user(
                    request
                )

                file_record = rename_file(
                    user_id=str(authenticated_user.id),
                    file_id=str(file_id),
                    display_name=serializer.validated_data[
                        "display_name"
                    ],
                )

            except AccountAuthenticationError:
                return Response(
                    {
                        "detail": (
                            "Invalid or expired access token."
                        ),
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

            except StorageFileOperationError:
                return Response(
                    {
                        "detail": "Could not rename file.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {
                    "file": file_record,
                },
                status=status.HTTP_200_OK,
            )

        serializer = MoveStorageFileSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            file_record = move_file(
                user_id=str(authenticated_user.id),
                file_id=str(file_id),
                folder_id=(
                    str(
                        serializer.validated_data["folder_id"]
                    )
                    if serializer.validated_data.get("folder_id")
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

        except StorageFileOperationError:
            return Response(
                {
                    "detail": "Could not move file.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "file": file_record,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, file_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            permanently_delete_file(
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

        except StorageFileOperationError:
            return Response(
                {
                    "detail": (
                        "Could not permanently delete file."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


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

        except StorageTagError:
            return Response(
                {
                    "detail": "Could not create tag.",
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