from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AuthUserLookupError,
    DeviceSessionError,
    ProfileLookupError,
    QrLoginError,
)
from apps.accounts.view_modules.common import (
    WEB_SESSION_COOKIE_NAME,
)


def _compatibility_views():
    from apps.accounts import views

    return views


class WebSessionActivateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        challenge_token = str(
            request.data.get("challenge_token", "")
        ).strip()
        browser_nonce = str(
            request.data.get("browser_nonce", "")
        ).strip()

        if not challenge_token or not browser_nonce:
            return Response(
                {
                    "detail": (
                        "challenge_token and browser_nonce are required."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            consumed_challenge = (
                _compatibility_views()
                .consume_approved_qr_login_challenge(
                    challenge_token=challenge_token,
                    browser_nonce=browser_nonce,
                )
            )
            web_session_token = str(
                consumed_challenge["web_session_token"]
            )
            device_session = (
                _compatibility_views().get_active_session_by_token(
                    session_token=web_session_token,
                )
            )
            _compatibility_views().update_device_metadata(
                device_id=device_session["id"],
                request=request,
            )
        except (DeviceSessionError, QrLoginError):
            return Response(
                {
                    "detail": (
                        "Web session activation is not available."
                    ),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(status=status.HTTP_204_NO_CONTENT)
        _compatibility_views().set_web_session_cookie(
            response=response,
            request=request,
            session_token=web_session_token,
        )
        return response


class WebSessionProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        session_token = request.COOKIES.get(
            WEB_SESSION_COOKIE_NAME
        )

        if not session_token:
            return Response(
                {"detail": "Web session is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            device_session = (
                _compatibility_views().get_active_session_by_token(
                    session_token=session_token,
                )
            )
            _compatibility_views().update_device_metadata(
                device_id=device_session["id"],
                request=request,
            )
            profile = _compatibility_views().get_profile(
                auth_user_id=device_session["user_id"],
            )
            auth_user = _compatibility_views().get_auth_user(
                auth_user_id=device_session["user_id"],
            )
        except (
            AuthUserLookupError,
            DeviceSessionError,
            ProfileLookupError,
        ):
            return Response(
                {"detail": "Web session is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "user": {
                    "id": device_session["user_id"],
                    "email": auth_user.email,
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                },
            },
            status=status.HTTP_200_OK,
        )


class WebSessionLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        session_token = request.COOKIES.get(
            WEB_SESSION_COOKIE_NAME
        )

        if session_token:
            try:
                device_session = (
                    _compatibility_views().get_active_session_by_token(
                        session_token=session_token,
                    )
                )
                _compatibility_views().revoke_device_session_by_id(
                    device_id=device_session["id"],
                )
            except DeviceSessionError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(WEB_SESSION_COOKIE_NAME, path="/")
        return response
