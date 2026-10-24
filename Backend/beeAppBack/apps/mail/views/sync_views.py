from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import (
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
)
from apps.mail.serializers import MailSyncRequestSerializer
from apps.mail.services.mail_integration_service import request_mail_sync
from apps.mail.views.responses import (
    mail_error_response,
    unauthorized_response,
)


class MailSyncView(AuthenticatedAPIView):
    def post(self, request):
        serializer = MailSyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

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
            return unauthorized_response()
        except MailIntegrationNotFoundError as error:
            return mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )
        except MailIntegrationInactiveError as error:
            return mail_error_response(error)

        return Response(result, status=status.HTTP_200_OK)
