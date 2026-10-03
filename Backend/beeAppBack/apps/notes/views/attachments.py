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
class NoteAttachmentsView(AuthenticatedAPIView):
    def get(self, request, note_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            attachments = list_note_attachments(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                allow_shared=True,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except (
            NoteNotFoundError,
            NoteShareNotFoundError,
        ):
            return Response(
                {
                    "detail": "Note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteAttachmentError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "attachments": attachments,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, note_id):
        serializer = CreateNoteAttachmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            attachment = attach_existing_file(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                file_id=str(serializer.validated_data["file_id"]),
                attachment_type=serializer.validated_data[
                    "attachment_type"
                ],
                display_order=serializer.validated_data[
                    "display_order"
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

        except NoteAttachmentFileNotFoundError:
            return Response(
                {
                    "detail": "Selected file was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteAttachmentError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "attachment": attachment,
            },
            status=status.HTTP_201_CREATED,
        )


class NoteAttachmentUploadView(AuthenticatedAPIView):
    def post(self, request, note_id):
        request_data = request.data.copy()

        uploaded_files = request.FILES.getlist("files")
        single_file = request.FILES.get("file")

        if uploaded_files:
            request_data.setlist("files", uploaded_files)
        elif single_file:
            request_data["file"] = single_file

        serializer = UploadNoteAttachmentsSerializer(data=request_data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            result = upload_and_attach_files(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                uploaded_files=serializer.validated_data["files"],
                attachment_type=serializer.validated_data[
                    "attachment_type"
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

        except NoteAttachmentError as error:
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


class NoteAttachmentDetailView(AuthenticatedAPIView):
    def patch(self, request, note_id, attachment_id):
        serializer = UpdateNoteAttachmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            attachment = update_note_attachment(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                attachment_id=str(attachment_id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except (
            NoteNotFoundError,
            NoteAttachmentNotFoundError,
        ):
            return Response(
                {
                    "detail": "Note attachment was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteAttachmentError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "attachment": attachment,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, note_id, attachment_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            remove_note_attachment(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                attachment_id=str(attachment_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except (
            NoteNotFoundError,
            NoteAttachmentNotFoundError,
        ):
            return Response(
                {
                    "detail": "Note attachment was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteAttachmentError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class NoteAttachmentAccessView(AuthenticatedAPIView):
    def get(self, request, note_id, attachment_id):
        serializer = NoteAttachmentAccessQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            access = create_note_attachment_access_url(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                attachment_id=str(attachment_id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except (
            NoteNotFoundError,
            NoteShareNotFoundError,
            NoteAttachmentNotFoundError,
        ):
            return Response(
                {
                    "detail": "Note attachment was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteAttachmentError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            access,
            status=status.HTTP_200_OK,
        )
