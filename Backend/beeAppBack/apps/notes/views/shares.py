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
