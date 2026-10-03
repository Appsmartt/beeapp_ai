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
class NoteTagsView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)

            tags = list_note_tags(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NoteTagError:
            return Response(
                {
                    "detail": "Could not retrieve note tags.",
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
        serializer = CreateNoteTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            tag = create_note_tag(
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

        except NoteTagError as error:
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


class NoteTagDetailView(AuthenticatedAPIView):
    def patch(self, request, tag_id):
        serializer = UpdateNoteTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            tag = update_note_tag(
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

        except NoteTagNotFoundError:
            return Response(
                {
                    "detail": "Note tag was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteTagError as error:
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
            status=status.HTTP_200_OK,
        )

    def delete(self, request, tag_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            delete_note_tag(
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

        except NoteTagNotFoundError:
            return Response(
                {
                    "detail": "Note tag was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteTagError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class NoteTagsAssignmentView(AuthenticatedAPIView):
    def get(self, request, note_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            tags = list_note_tags_for_note(
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

        except NoteTagError:
            return Response(
                {
                    "detail": "Could not retrieve note tags.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tags": tags,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request, note_id):
        serializer = ReplaceNoteTagsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            tags = replace_note_tags(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                tag_ids=[
                    str(tag_id)
                    for tag_id in serializer.validated_data["tag_ids"]
                ],
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

        except NoteTagNotFoundError:
            return Response(
                {
                    "detail": "One or more note tags were not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteTagError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tags": tags,
            },
            status=status.HTTP_200_OK,
        )
