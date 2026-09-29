from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.serializers import AccountSecurityPinSerializer
from apps.accounts.services.account_security_pin_service import (
    AccountSecurityPinStorageError,
)
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import (
    ChatConversationAccessError,
    ChatConversationNotFoundError,
)
from apps.chat.services.chat_pin_protection_service import (
    ChatPinProtectionError,
    is_chat_pin_protected,
    list_protected_chat_ids,
    protect_chat_with_pin,
    remove_chat_pin_protection,
)


def _pin_error(result: str) -> Response:
    if result == "locked":
        return Response(
            {"detail": "Too many PIN attempts."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    if result == "invalid":
        return Response(
            {"detail": "Incorrect PIN."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return Response(
        {"detail": "PIN is not configured."},
        status=status.HTTP_409_CONFLICT,
    )


class ChatPinProtectionsView(AuthenticatedAPIView):
    def get(self, request):
        try:
            user, _ = self.get_authenticated_user_and_access_token(
                request
            )
            identifiers = list_protected_chat_ids(
                user_id=str(user.id)
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except ChatPinProtectionError:
            return Response(
                {"detail": "Chat PIN service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"conversation_ids": identifiers})


class ChatPinProtectionDetailView(AuthenticatedAPIView):
    def _user_id(self, request) -> str:
        user, _ = self.get_authenticated_user_and_access_token(
            request
        )
        return str(user.id)

    def _error_response(self, error: Exception) -> Response:
        if isinstance(
            error,
            (
                ChatConversationAccessError,
                ChatConversationNotFoundError,
            ),
        ):
            return Response(
                {"detail": "Conversation was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if isinstance(error, AccountAuthenticationError):
            return Response(
                {"detail": "Invalid access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(
            {"detail": "Chat PIN service unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def get(self, request, conversation_id):
        try:
            protected = is_chat_pin_protected(
                user_id=self._user_id(request),
                conversation_id=str(conversation_id),
            )
        except (
            AccountAuthenticationError,
            AccountSecurityPinStorageError,
            ChatPinProtectionError,
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ) as error:
            return self._error_response(error)
        return Response({"protected": protected})

    def post(self, request, conversation_id):
        try:
            result = protect_chat_with_pin(
                user_id=self._user_id(request),
                conversation_id=str(conversation_id),
            )
        except (
            AccountAuthenticationError,
            AccountSecurityPinStorageError,
            ChatPinProtectionError,
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ) as error:
            return self._error_response(error)
        if result == "pin_required":
            return _pin_error(result)
        return Response({"protected": True})

    def delete(self, request, conversation_id):
        serializer = AccountSecurityPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = remove_chat_pin_protection(
                user_id=self._user_id(request),
                conversation_id=str(conversation_id),
                pin=serializer.validated_data["pin"],
            )
        except (
            AccountAuthenticationError,
            AccountSecurityPinStorageError,
            ChatPinProtectionError,
            ChatConversationAccessError,
            ChatConversationNotFoundError,
        ) as error:
            return self._error_response(error)
        if result != "removed":
            return _pin_error(result)
        return Response({"protected": False})
