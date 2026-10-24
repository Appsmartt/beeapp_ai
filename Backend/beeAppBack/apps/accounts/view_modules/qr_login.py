from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    QrLoginError,
)
from apps.accounts.throttles import (
    QrLoginChallengeStatusThrottle,
    QrLoginChallengeThrottle,
    QrLoginScanThrottle,
)
from apps.accounts.view_modules.common import AuthenticatedAPIView


def _compatibility_views():
    from apps.accounts import views

    return views


class QrLoginChallengeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [QrLoginChallengeThrottle]

    def post(self, request):
        browser_nonce = str(
            request.data.get("browser_nonce", "")
        ).strip()

        if not browser_nonce:
            return Response(
                {"detail": "browser_nonce is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            challenge = _compatibility_views().create_qr_login_challenge(
                browser_nonce=browser_nonce,
            )
        except QrLoginError:
            return Response(
                {"detail": "Could not create QR login code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(challenge, status=status.HTTP_201_CREATED)


class QrLoginChallengeDetailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [QrLoginChallengeStatusThrottle]

    def get(self, request, challenge_token):
        try:
            challenge = _compatibility_views().get_qr_login_challenge(
                challenge_token=challenge_token,
            )
        except QrLoginError:
            return Response(
                {"detail": "QR code was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "status": challenge["status"],
                "expires_at": challenge["expires_at"],
            },
            status=status.HTTP_200_OK,
        )


class QrLoginScanView(AuthenticatedAPIView):
    throttle_classes = [QrLoginScanThrottle]

    def post(self, request):
        challenge_token = str(
            request.data.get("challenge_token", "")
        ).strip()

        if not challenge_token:
            return Response(
                {"detail": "challenge_token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            authenticated_user = self.get_authenticated_user(request)
            device_session = (
                _compatibility_views().approve_qr_login_challenge(
                    challenge_token=challenge_token,
                    user_id=str(authenticated_user.id),
                )
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except QrLoginError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "BeeApp Web session approved.",
                "device": device_session,
            },
            status=status.HTTP_200_OK,
        )
