from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    AccountLoginError,
    AccountLoginUnavailableError,
)
from apps.accounts.serializers import (
    AccountSecurityPinPasswordSerializer,
    AccountSecurityPinReplaceSerializer,
    AccountSecurityPinSerializer,
)
from apps.accounts.services.account_security_pin_service import (
    AccountSecurityPinStorageError,
)
from apps.accounts.view_modules.common import AuthenticatedAPIView


def _compatibility_views():
    from apps.accounts import views

    return views


class AccountSecurityPinStatusView(AuthenticatedAPIView):
    def get(self, request):
        try:
            user, _ = self.get_authenticated_user_and_access_token(request)
            configured = (
                _compatibility_views().account_security_pin_is_configured(
                    user_id=str(user.id)
                )
            )
        except (AccountAuthenticationError, AuthenticationFailed):
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except AccountSecurityPinStorageError:
            return Response(
                {"detail": "PIN service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"configured": configured})


class AccountSecurityPinConfigureView(AuthenticatedAPIView):
    def post(self, request):
        serializer = AccountSecurityPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, _ = self.get_authenticated_user_and_access_token(request)
            created = _compatibility_views().configure_account_security_pin(
                user_id=str(user.id),
                pin=serializer.validated_data["pin"],
            )
        except (AccountAuthenticationError, AuthenticationFailed):
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except AccountSecurityPinStorageError:
            return Response(
                {"detail": "PIN service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not created:
            return Response(
                {"detail": "PIN already configured."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            {"configured": True},
            status=status.HTTP_201_CREATED,
        )


class AccountSecurityPinVerifyView(AuthenticatedAPIView):
    def post(self, request):
        serializer = AccountSecurityPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, _ = self.get_authenticated_user_and_access_token(request)
            result = _compatibility_views().verify_account_security_pin(
                user_id=str(user.id),
                pin=serializer.validated_data["pin"],
            )
        except (AccountAuthenticationError, AuthenticationFailed):
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except AccountSecurityPinStorageError:
            return Response(
                {"detail": "PIN service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if result == "not_configured":
            return Response(
                {"detail": "PIN is not configured."},
                status=status.HTTP_409_CONFLICT,
            )
        if result == "locked":
            return Response(
                {"detail": "Too many attempts. Try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if result == "invalid":
            return Response(
                {"detail": "Incorrect PIN."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"verified": True})


def _verify_security_pin_account_password(*, user, password):
    if not user.email:
        raise AccountLoginError("An email account is required.")
    authenticated = _compatibility_views().login_with_email_password(
        email=user.email,
        password=password,
    )
    if str(authenticated["user"]["id"]) != str(user.id):
        raise AccountLoginError("Password belongs to another account.")


class AccountSecurityPinPasswordVerifyView(AuthenticatedAPIView):
    def post(self, request):
        serializer = AccountSecurityPinPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, _ = self.get_authenticated_user_and_access_token(request)
            _verify_security_pin_account_password(
                user=user,
                password=serializer.validated_data["password"],
            )
        except (AccountAuthenticationError, AuthenticationFailed):
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except AccountLoginError:
            return Response(
                {"detail": "Incorrect account password."},
                status=status.HTTP_403_FORBIDDEN,
            )
        except AccountLoginUnavailableError:
            return Response(
                {"detail": "Authentication service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"verified": True})


class AccountSecurityPinReplaceView(AuthenticatedAPIView):
    def post(self, request):
        serializer = AccountSecurityPinReplaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user, _ = self.get_authenticated_user_and_access_token(request)
            _verify_security_pin_account_password(
                user=user,
                password=serializer.validated_data["password"],
            )
            replaced = _compatibility_views().replace_account_security_pin(
                user_id=str(user.id),
                pin=serializer.validated_data["pin"],
            )
        except (AccountAuthenticationError, AuthenticationFailed):
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except AccountLoginError:
            return Response(
                {"detail": "Incorrect account password."},
                status=status.HTTP_403_FORBIDDEN,
            )
        except AccountLoginUnavailableError:
            return Response(
                {"detail": "Authentication service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except AccountSecurityPinStorageError:
            return Response(
                {"detail": "PIN service unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not replaced:
            return Response(
                {"detail": "PIN is not configured."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response({"configured": True})
