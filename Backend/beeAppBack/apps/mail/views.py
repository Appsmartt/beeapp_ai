from __future__ import annotations

import logging

from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import (
    MailAttachmentError,
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailMessageNotFoundError,
    MailSyncError,
)
from apps.mail.serializers import (
    MailDraftContentSerializer,
    MailIntegrationListQuerySerializer,
    MailMessageActionSerializer,
    MailMessageListQuerySerializer,
    MailSyncRequestSerializer,
    MoveMailMessageSerializer,
    SendMailDraftSerializer,
    UpdateMailDraftSerializer,
    UpdateMailMessageStateSerializer,
)
from apps.mail.services.mail_attachment_service import (
    download_mail_attachment,
)
from apps.mail.services.mail_draft_service import (
    create_mail_draft,
    delete_mail_draft,
    send_mail_draft,
    update_mail_draft,
)
from apps.mail.services.mail_integration_link_service import (
    get_mail_integration,
    list_mail_integrations,
    sync_user_mail_integrations_from_connections,
)
from apps.mail.services.mail_integration_service import (
    request_mail_sync,
)
from apps.mail.services.mail_message_service import (
    get_mail_message,
    list_mail_messages,
    move_mail_message,
    update_mail_message_state,
)


logger = logging.getLogger(__name__)


def _unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _mail_error_response(
    error: Exception,
    *,
    response_status: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
    """
    Serializa errores conocidos del dominio Email para el cliente.

    Nunca incluye tokens, credenciales ni payloads del proveedor.
    El detalle contiene el mensaje seguro construido por el servicio.
    """
    return Response(
        {
            "detail": str(error),
        },
        status=response_status,
    )


class MailIntegrationsView(AuthenticatedAPIView):
    def get(self, request):
        serializer = MailIntegrationListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            user_id = str(authenticated_user.id)

            sync_user_mail_integrations_from_connections(
                user_id=user_id,
            )

            integrations = list_mail_integrations(
                user_id=user_id,
                provider=serializer.validated_data.get(
                    "provider"
                ),
                include_inactive=serializer.validated_data[
                    "include_inactive"
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        return Response(
            {
                "integrations": integrations,
            },
            status=status.HTTP_200_OK,
        )


class MailIntegrationDetailView(AuthenticatedAPIView):
    def get(self, request, integration_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            user_id = str(authenticated_user.id)

            integration = get_mail_integration(
                user_id=user_id,
                integration_id=str(integration_id),
            )

            if not integration:
                raise MailIntegrationNotFoundError(
                    "La integración de Email no fue encontrada."
                )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailIntegrationNotFoundError as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "integration": integration,
            },
            status=status.HTTP_200_OK,
        )


class MailMessagesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = MailMessageListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            query = serializer.validated_data

            result = list_mail_messages(
                user_id=str(authenticated_user.id),
                integration_id=(
                    str(query["integration_id"])
                    if query.get("integration_id")
                    else None
                ),
                folder=query.get("folder"),
                unread_only=query["unread_only"],
                starred_only=query["starred_only"],
                search=query.get("search"),
                limit=query["limit"],
                offset=query["offset"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailMessageNotFoundError as error:
            return _mail_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class MailMessageAttachmentDownloadView(AuthenticatedAPIView):
    def get(self, request, message_id, attachment_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            download = download_mail_attachment(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                attachment_id=str(attachment_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailMessageNotFoundError as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        except MailAttachmentError as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_400_BAD_REQUEST,
            )

        response = HttpResponse(
            download.content,
            content_type=download.content_type,
        )

        response["Content-Disposition"] = (
            f'attachment; filename="{download.filename}"'
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Length"] = str(len(download.content))

        return response


class MailMessageDetailView(AuthenticatedAPIView):
    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            result = get_mail_message(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailMessageNotFoundError as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class MailMessageStateView(AuthenticatedAPIView):
    def patch(self, request, message_id):
        serializer = UpdateMailMessageStateSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            result = update_mail_message_state(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                is_read=serializer.validated_data.get("is_read"),
                is_starred=serializer.validated_data.get(
                    "is_starred"
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailMessageNotFoundError as error:
            return _mail_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class MailMessageMoveView(AuthenticatedAPIView):
    def post(self, request, message_id):
        serializer = MoveMailMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            result = move_mail_message(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                folder=serializer.validated_data["folder"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailMessageNotFoundError as error:
            return _mail_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class MailMessageActionView(AuthenticatedAPIView):
    ACTION_FOLDER_MAP = {
        "archive": "archived",
        "restore": "inbox",
        "trash": "trash",
        "spam": "spam",
    }

    def post(self, request, message_id):
        serializer = MailMessageActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            action = serializer.validated_data["action"]

            result = move_mail_message(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                folder=self.ACTION_FOLDER_MAP[action],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailMessageNotFoundError as error:
            return _mail_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class MailDraftsView(AuthenticatedAPIView):
    def post(self, request):
        serializer = MailDraftContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            draft = serializer.validated_data

            result = create_mail_draft(
                user_id=str(authenticated_user.id),
                integration_id=str(draft["integration_id"]),
                to_recipients=draft.get("to"),
                cc_recipients=draft.get("cc"),
                bcc_recipients=draft.get("bcc"),
                subject=draft.get("subject"),
                body=draft.get("body"),
                body_content_type=draft["body_content_type"],
                file_ids=[
                    str(file_id)
                    for file_id in draft.get("file_ids", [])
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailIntegrationNotFoundError as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        except (
            MailIntegrationInactiveError,
            MailSyncError,
        ) as error:
            logger.warning(
                "Mail draft creation failed. detail=%s",
                str(error),
            )
            return _mail_error_response(error)

        return Response(
            result,
            status=status.HTTP_201_CREATED,
        )


class MailDraftDetailView(AuthenticatedAPIView):
    def patch(self, request, message_id):
        serializer = UpdateMailDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            draft = serializer.validated_data

            result = update_mail_draft(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                integration_id=(
                    str(draft["integration_id"])
                    if draft.get("integration_id")
                    else None
                ),
                to_recipients=draft.get("to"),
                cc_recipients=draft.get("cc"),
                bcc_recipients=draft.get("bcc"),
                subject=draft.get("subject"),
                body=draft.get("body"),
                body_content_type=draft["body_content_type"],
                file_ids=[
                    str(file_id)
                    for file_id in draft.get("file_ids", [])
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            MailIntegrationNotFoundError,
            MailMessageNotFoundError,
        ) as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        except (
            MailIntegrationInactiveError,
            MailSyncError,
        ) as error:
            logger.warning(
                "Mail draft update failed. message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return _mail_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            delete_mail_draft(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            MailIntegrationNotFoundError,
            MailMessageNotFoundError,
        ) as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        except (
            MailIntegrationInactiveError,
            MailSyncError,
        ) as error:
            logger.warning(
                "Mail draft deletion failed. message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return _mail_error_response(error)

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class MailDraftSendView(AuthenticatedAPIView):
    def post(self, request, message_id):
        serializer = SendMailDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )
            user_id = str(authenticated_user.id)

            logger.info(
                "Mail draft send requested. user_id=%s message_id=%s",
                user_id,
                str(message_id),
            )

            result = send_mail_draft(
                user_id=user_id,
                message_id=str(message_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except (
            MailIntegrationNotFoundError,
            MailMessageNotFoundError,
        ) as error:
            logger.warning(
                "Mail draft send failed because the draft or integration "
                "was not found. message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        except MailIntegrationInactiveError as error:
            logger.warning(
                "Mail draft send blocked by inactive integration. "
                "message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return _mail_error_response(error)

        except MailSyncError as error:
            logger.warning(
                "Mail draft send provider or persistence failure. "
                "message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return _mail_error_response(error)

        except Exception:
            logger.exception(
                "Unexpected mail draft send failure. message_id=%s",
                str(message_id),
            )
            return Response(
                {
                    "detail": (
                        "Ocurrió un error inesperado al enviar el correo. "
                        "Revisa los logs del servidor e inténtalo de nuevo."
                    ),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        logger.info(
            "Mail draft send succeeded. user_id=%s message_id=%s",
            user_id,
            str(message_id),
        )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class MailSyncView(AuthenticatedAPIView):
    def post(self, request):
        serializer = MailSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            integration_ids = [
                str(integration_id)
                for integration_id in serializer.validated_data.get(
                    "integration_ids",
                    [],
                )
            ]

            result = request_mail_sync(
                user_id=str(authenticated_user.id),
                integration_ids=integration_ids or None,
                force_full_sync=serializer.validated_data[
                    "force_full_sync"
                ],
                trigger="manual",
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except MailIntegrationNotFoundError as error:
            return _mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        except MailIntegrationInactiveError as error:
            return _mail_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )