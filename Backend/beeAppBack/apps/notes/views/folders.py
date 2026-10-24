from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import (
    AccountAuthenticationError,
)
from apps.accounts.views import (
    AuthenticatedAPIView,
)
from apps.notes.exceptions import (
    NoteAttachmentError,
    NoteAttachmentFileNotFoundError,
    NoteAttachmentNotFoundError,
    NoteCreateError,
    NoteDeleteError,
    NoteFolderError,
    NoteFolderNotFoundError,
    NoteNotFoundError,
    NoteShareError,
    NoteShareNotFoundError,
    NoteShareRecipientNotFoundError,
    NoteTagError,
    NoteTagNotFoundError,
    NoteTemplateError,
    NoteUpdateError,
)
from apps.notes.serializers import (
    CreateNoteAttachmentSerializer,
    CreateNoteFolderSerializer,
    CreateNoteSerializer,
    CreateNoteShareSerializer,
    CreateNoteTagSerializer,
    MoveNoteFolderSerializer,
    NoteAttachmentAccessQuerySerializer,
    NoteFolderQuerySerializer,
    NoteListQuerySerializer,
    NoteTemplateListQuerySerializer,
    ReceivedNoteSharesQuerySerializer,
    RenameNoteFolderSerializer,
    ReplaceNoteTagsSerializer,
    UpdateNoteAttachmentSerializer,
    UpdateNoteSerializer,
    UpdateNoteTagSerializer,
    UploadNoteAttachmentsSerializer,
)
from apps.notes.services.note_attachment_service import (
    attach_existing_file,
    create_note_attachment_access_url,
    list_note_attachments,
    remove_note_attachment,
    update_note_attachment,
    upload_and_attach_files,
)
from apps.notes.services.note_folder_service import (
    create_note_folder,
    delete_note_folder,
    list_note_folders,
    move_note_folder,
    rename_note_folder,
)
from apps.notes.services.note_service import (
    create_note,
    get_owned_note,
    list_owned_notes,
    move_note_to_trash,
    permanently_delete_note,
    restore_note_from_trash,
    update_owned_note,
)
from apps.notes.services.note_share_service import (
    create_note_share,
    get_shared_note,
    hide_received_note_share,
    list_received_note_shares,
    revoke_note_share,
)
from apps.notes.services.note_tag_service import (
    create_note_tag,
    delete_note_tag,
    list_note_tags,
    list_note_tags_for_note,
    replace_note_tags,
    update_note_tag,
)
from apps.notes.services.note_template_service import (
    list_note_templates,
)
from apps.storage.services.storage_share_service import (
    search_share_recipients,
)
class NoteFoldersView(AuthenticatedAPIView):
    def get(self, request):
        serializer = NoteFolderQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            parent_id = serializer.validated_data.get("parent_id")

            folders = list_note_folders(
                user_id=str(authenticated_user.id),
                parent_id=(
                    str(parent_id)
                    if parent_id is not None
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

        except NoteFolderError:
            return Response(
                {
                    "detail": "Could not retrieve note folders.",
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
        serializer = CreateNoteFolderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            parent_id = serializer.validated_data.get("parent_id")

            folder = create_note_folder(
                user_id=str(authenticated_user.id),
                name=serializer.validated_data["name"],
                parent_id=(
                    str(parent_id)
                    if parent_id is not None
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

        except NoteFolderNotFoundError:
            return Response(
                {
                    "detail": "Parent note folder was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteFolderError as error:
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
            status=status.HTTP_201_CREATED,
        )


class NoteFolderDetailView(AuthenticatedAPIView):
    def patch(self, request, folder_id):
        if "name" in request.data:
            serializer = RenameNoteFolderSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            try:
                authenticated_user = self.get_authenticated_user(request)

                folder = rename_note_folder(
                    user_id=str(authenticated_user.id),
                    folder_id=str(folder_id),
                    name=serializer.validated_data["name"],
                )

            except AccountAuthenticationError:
                return Response(
                    {
                        "detail": "Invalid or expired access token.",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            except NoteFolderNotFoundError:
                return Response(
                    {
                        "detail": "Note folder was not found.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            except NoteFolderError as error:
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

        serializer = MoveNoteFolderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            parent_id = serializer.validated_data.get("parent_id")

            folder = move_note_folder(
                user_id=str(authenticated_user.id),
                folder_id=str(folder_id),
                parent_id=(
                    str(parent_id)
                    if parent_id is not None
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

        except NoteFolderNotFoundError:
            return Response(
                {
                    "detail": "Note folder was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteFolderError as error:
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
            authenticated_user = self.get_authenticated_user(request)

            delete_note_folder(
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

        except NoteFolderNotFoundError:
            return Response(
                {
                    "detail": "Note folder was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteFolderError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
