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


class NoteTemplatesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = NoteTemplateListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            self.get_authenticated_user(request)

            templates = list_note_templates(
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NoteTemplateError:
            return Response(
                {
                    "detail": "Could not retrieve note templates.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "templates": templates,
            },
            status=status.HTTP_200_OK,
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


class NoteShareRecipientsView(AuthenticatedAPIView):
    def get(self, request):
        from apps.storage.serializers import (
            RecipientSearchQuerySerializer,
        )

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

        except Exception:
            return Response(
                {
                    "detail": "Could not search share recipients.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "recipients": recipients,
            },
            status=status.HTTP_200_OK,
        )


class NoteSharesView(AuthenticatedAPIView):
    def post(self, request, note_id):
        serializer = CreateNoteShareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            expires_at = serializer.validated_data.get("expires_at")

            share = create_note_share(
                user_id=str(authenticated_user.id),
                note_id=str(note_id),
                recipient_id=str(
                    serializer.validated_data["recipient_id"]
                ),
                expires_at=(
                    expires_at.isoformat()
                    if expires_at is not None
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

        except NoteNotFoundError:
            return Response(
                {
                    "detail": "Note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteShareRecipientNotFoundError:
            return Response(
                {
                    "detail": "Recipient was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteShareError as error:
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


class ReceivedNoteSharesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = ReceivedNoteSharesQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            shares = list_received_note_shares(
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

        except NoteShareError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            shares,
            status=status.HTTP_200_OK,
        )


class SharedNoteDetailView(AuthenticatedAPIView):
    def get(self, request, note_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            result = get_shared_note(
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

        except (
            NoteNotFoundError,
            NoteShareNotFoundError,
        ):
            return Response(
                {
                    "detail": "Shared note was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteShareError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class NoteShareDetailView(AuthenticatedAPIView):
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
                "detail": "Unknown note share action.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    def _revoke(self, request, share_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            share = revoke_note_share(
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

        except NoteShareNotFoundError:
            return Response(
                {
                    "detail": "Note share was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteShareError as error:
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
            status=status.HTTP_200_OK,
        )

    def _hide(self, request, share_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            share = hide_received_note_share(
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

        except NoteShareNotFoundError:
            return Response(
                {
                    "detail": "Note share was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except NoteShareError as error:
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
            status=status.HTTP_200_OK,
        )