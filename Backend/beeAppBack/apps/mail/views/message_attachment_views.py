from __future__ import annotations

from django.http import HttpResponse
from rest_framework import status

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import (
    MailAttachmentError,
    MailMessageNotFoundError,
)
from apps.mail.services.mail_attachment_service import (
    download_mail_attachment,
)
from apps.mail.views.responses import (
    mail_error_response,
    unauthorized_response,
)


class MailMessageAttachmentDownloadView(AuthenticatedAPIView):
    def get(self, request, message_id, attachment_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            download = download_mail_attachment(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                attachment_id=str(attachment_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except MailMessageNotFoundError as error:
            return mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )
        except MailAttachmentError as error:
            return mail_error_response(
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
