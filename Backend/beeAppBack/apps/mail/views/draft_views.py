from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import (
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailMessageNotFoundError,
    MailSyncError,
)
from apps.mail.serializers import (
    MailDraftContentSerializer,
    SendMailDraftSerializer,
    UpdateMailDraftSerializer,
)
from apps.mail.services.mail_draft import (
    create_mail_draft,
    delete_mail_draft,
    send_mail_draft,
    update_mail_draft,
)
from apps.mail.views.responses import (
    mail_error_response,
    unauthorized_response,
)


logger = logging.getLogger(__name__)


class MailDraftsView(AuthenticatedAPIView):
    def post(self, request):
        serializer = MailDraftContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
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
            return unauthorized_response()
        except MailIntegrationNotFoundError as error:
            return mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )
        except (MailIntegrationInactiveError, MailSyncError) as error:
            logger.warning(
                "Mail draft creation failed. detail=%s",
                str(error),
            )
            return mail_error_response(error)

        return Response(result, status=status.HTTP_201_CREATED)


class MailDraftDetailView(AuthenticatedAPIView):
    def patch(self, request, message_id):
        serializer = UpdateMailDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
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
            return unauthorized_response()
        except (
            MailIntegrationNotFoundError,
            MailMessageNotFoundError,
        ) as error:
            return mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )
        except (MailIntegrationInactiveError, MailSyncError) as error:
            logger.warning(
                "Mail draft update failed. message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return mail_error_response(error)

        return Response(result, status=status.HTTP_200_OK)

    def delete(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            delete_mail_draft(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except (
            MailIntegrationNotFoundError,
            MailMessageNotFoundError,
        ) as error:
            return mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )
        except (MailIntegrationInactiveError, MailSyncError) as error:
            logger.warning(
                "Mail draft deletion failed. message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return mail_error_response(error)

        return Response(status=status.HTTP_204_NO_CONTENT)


class MailDraftSendView(AuthenticatedAPIView):
    def post(self, request, message_id):
        serializer = SendMailDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
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
            return unauthorized_response()
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
            return mail_error_response(
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
            return mail_error_response(error)
        except MailSyncError as error:
            logger.warning(
                "Mail draft send provider or persistence failure. "
                "message_id=%s detail=%s",
                str(message_id),
                str(error),
            )
            return mail_error_response(error)
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

        return Response(result, status=status.HTTP_200_OK)
