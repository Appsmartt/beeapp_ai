from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.mail.exceptions import MailMessageNotFoundError
from apps.mail.serializers import (
    MailMessageActionSerializer,
    MoveMailMessageSerializer,
    UpdateMailMessageStateSerializer,
)
from apps.mail.services.mail_message import (
    move_mail_message,
    update_mail_message_state,
)
from apps.mail.views.responses import (
    mail_error_response,
    unauthorized_response,
)


class MailMessageStateView(AuthenticatedAPIView):
    def patch(self, request, message_id):
        serializer = UpdateMailMessageStateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            result = update_mail_message_state(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                is_read=serializer.validated_data.get("is_read"),
                is_starred=serializer.validated_data.get("is_starred"),
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except MailMessageNotFoundError as error:
            return mail_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


class MailMessageMoveView(AuthenticatedAPIView):
    def post(self, request, message_id):
        serializer = MoveMailMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            result = move_mail_message(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                folder=serializer.validated_data["folder"],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except MailMessageNotFoundError as error:
            return mail_error_response(error)

        return Response(result, status=status.HTTP_200_OK)


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
            authenticated_user = self.get_authenticated_user(request)
            action = serializer.validated_data["action"]

            result = move_mail_message(
                user_id=str(authenticated_user.id),
                message_id=str(message_id),
                folder=self.ACTION_FOLDER_MAP[action],
            )
        except AccountAuthenticationError:
            return unauthorized_response()
        except MailMessageNotFoundError as error:
            return mail_error_response(error)

        return Response(result, status=status.HTTP_200_OK)
