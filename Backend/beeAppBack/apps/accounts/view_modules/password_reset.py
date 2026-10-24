from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    PasswordResetConfirmationError,
    PasswordResetRequestError,
    PasswordResetVerificationError,
)
from apps.accounts.serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
)
from apps.accounts.throttles import (
    PasswordResetConfirmationThrottle,
    PasswordResetRequestThrottle,
    PasswordResetVerificationThrottle,
)


def _compatibility_views():
    from apps.accounts import views

    return views


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRequestThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _compatibility_views().request_password_reset(
                phone=serializer.validated_data["phone"],
            )
        except PasswordResetRequestError:
            pass

        return Response(
            {
                "message": (
                    "If the phone number is registered, "
                    "a verification code has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetVerificationThrottle]

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reset_token = _compatibility_views().verify_password_reset_otp(
                phone=serializer.validated_data["phone"],
                code=serializer.validated_data["code"],
            )
        except PasswordResetVerificationError:
            return Response(
                {
                    "detail": (
                        "Invalid, expired, or unavailable "
                        "verification code."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": (
                    "Verification successful. "
                    "You can now set a new password."
                ),
                "reset_token": reset_token,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmationThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _compatibility_views().confirm_password_reset(
                reset_token=serializer.validated_data["reset_token"],
                new_password=serializer.validated_data["new_password"],
            )
        except PasswordResetConfirmationError:
            return Response(
                {
                    "detail": (
                        "The password reset token is invalid, "
                        "expired, or has already been used."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": (
                    "Password updated successfully. "
                    "Please sign in again."
                )
            },
            status=status.HTTP_200_OK,
        )
