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
class NotesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = NoteListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            notes = list_owned_notes(
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

        except NoteUpdateError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            notes,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CreateNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            note = create_note(
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

        except NoteCreateError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "note": note,
            },
            status=status.HTTP_201_CREATED,
        )


class NoteDetailView(AuthenticatedAPIView):
    def get(self, request, note_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            note = get_owned_note(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NoteNotFoundError:
            return Response(
                {
                    "detail": "Note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "note": note,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, note_id):
        serializer = UpdateNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            note = update_owned_note(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NoteNotFoundError:
            return Response(
                {
                    "detail": "Note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteUpdateError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "note": note,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, note_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            permanently_delete_note(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NoteNotFoundError:
            return Response(
                {
                    "detail": "Note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteDeleteError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class NoteTrashView(AuthenticatedAPIView):
    def post(self, request, note_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            move_note_to_trash(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NoteNotFoundError:
            return Response(
                {
                    "detail": "Note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteDeleteError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Note moved to trash.",
            },
            status=status.HTTP_200_OK,
        )


class NoteRestoreView(AuthenticatedAPIView):
    def post(self, request, note_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            note = restore_note_from_trash(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NoteNotFoundError:
            return Response(
                {
                    "detail": "Note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteDeleteError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "note": note,
            },
            status=status.HTTP_200_OK,
        )
