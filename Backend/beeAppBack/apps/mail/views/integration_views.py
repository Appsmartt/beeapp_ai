from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import MailIntegrationNotFoundError
from apps.mail.serializers import MailIntegrationListQuerySerializer
from apps.mail.services.mail_integration_link_service import (
    get_mail_integration,
    list_mail_integrations,
    sync_user_mail_integrations_from_connections,
)
from apps.mail.views.responses import (
    mail_error_response,
    unauthorized_response,
)


class MailIntegrationsView(AuthenticatedAPIView):
    def get(self, request):
        serializer = MailIntegrationListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            user_id = str(authenticated_user.id)

            sync_user_mail_integrations_from_connections(user_id=user_id)

            integrations = list_mail_integrations(
                user_id=user_id,
                provider=serializer.validated_data.get("provider"),
                include_inactive=serializer.validated_data[
                    "include_inactive"
                ],
            )
        except AccountAuthenticationError:
            return unauthorized_response()

        return Response(
            {"integrations": integrations},
            status=status.HTTP_200_OK,
        )


class MailIntegrationDetailView(AuthenticatedAPIView):
    def get(self, request, integration_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            integration = get_mail_integration(
                user_id=str(authenticated_user.id),
                integration_id=str(integration_id),
            )

            if not integration:
                raise MailIntegrationNotFoundError(
                    "La integración de Email no fue encontrada."
                )
        except AccountAuthenticationError:
            return unauthorized_response()
        except MailIntegrationNotFoundError as error:
            return mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"integration": integration},
            status=status.HTTP_200_OK,
        )
