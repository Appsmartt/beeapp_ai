from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import (
    MailIntegrationInactiveError,
    MailIntegrationNotFoundError,
    MailMessageNotFoundError,
)
from apps.mail.serializers import (
    MailIntegrationListQuerySerializer,
    MailMessageListQuerySerializer,
    MailSyncRequestSerializer,
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
)


def _unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
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
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_404_NOT_FOUND,
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
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_404_NOT_FOUND,
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
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except MailIntegrationInactiveError as error:
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