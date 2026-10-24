from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import MailMessageNotFoundError
from apps.mail.serializers import MailMessageListQuerySerializer
from apps.mail.services.mail_message import (
    get_mail_message,
    list_mail_messages,
)
from apps.mail.views.responses import (
    mail_error_response,
    unauthorized_response,
)


class MailMessagesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = MailMessageListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
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
            return unauthorized_response()
        except MailMessageNotFoundError as error:
            return mail_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class MailMessageDetailView(AuthenticatedAPIView):
    def get(self, request, message_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            result = get_mail_message(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except MailMessageNotFoundError as error:
            return mail_error_response(
                error,
                response_status=status.HTTP_404_NOT_FOUND,
            )

        return Response(result, status=status.HTTP_200_OK)
