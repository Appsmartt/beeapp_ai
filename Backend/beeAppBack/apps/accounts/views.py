from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    AccountLoginError,
    AccountRegistrationError,
    AssistantSettingsUpdateError,
    DeviceSessionError,
    ProfileLookupError,
    ProfileUpdateError,
    QrLoginError,
)
from apps.accounts.serializers import (
    LoginUserSerializer,
    RegisterUserSerializer,
    UpdateAssistantSettingsSerializer,
    UpdateOnboardingProfileSerializer,
)
from apps.accounts.services.auth_session_service import (
    get_authenticated_user,
)
from apps.accounts.services.device_session_service import (
    get_active_session_by_token,
    get_user_device_sessions,
    revoke_all_user_device_sessions,
    revoke_device_session_by_id,
    update_web_device_metadata,
)
from apps.accounts.services.login_service import (
    login_with_email_password,
)
from apps.accounts.services.profile_service import (
    get_profile,
    update_assistant_settings,
    update_onboarding_profile,
)
from apps.accounts.services.qr_login_service import (
    approve_qr_login_challenge,
    create_qr_login_challenge,
    get_qr_login_challenge,
)
from apps.accounts.services.registration_service import (
    create_complete_user,
)


WEB_SESSION_COOKIE_NAME = "beeapp_web_session"


class AuthenticatedAPIView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_user(self, request):
        authorization_header = request.headers.get(
            "Authorization",
            "",
        )

        scheme, _, access_token = authorization_header.partition(
            " "
        )

        if scheme.lower() != "bearer" or not access_token:
            raise AccountAuthenticationError(
                "Missing bearer access token."
            )

        return get_authenticated_user(access_token=access_token)


class RegisterUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            created_user = create_complete_user(
                **serializer.validated_data
            )

        except AccountRegistrationError:
            return Response(
                {
                    "detail": (
                        "Could not create the account. "
                        "The email or phone number may already "
                        "be registered."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "BeeApp account created successfully.",
                "user": {
                    "id": created_user["auth_user_id"],
                    "email": created_user["email"],
                    "phone": created_user["phone"],
                    "first_name": created_user["profile"][
                        "first_name"
                    ],
                    "last_name": created_user["profile"][
                        "last_name"
                    ],
                    "phone_dial_code": created_user["profile"][
                        "phone_dial_code"
                    ],
                    "phone_number": created_user["profile"][
                        "phone_number"
                    ],
                    "role": created_user["profile"]["role"],
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = login_with_email_password(
                **serializer.validated_data
            )

        except AccountLoginError:
            return Response(
                {
                    "detail": "Invalid email or password.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "message": "Login successful.",
                "session": authenticated_user["session"],
                "user": authenticated_user["user"],
            },
            status=status.HTTP_200_OK,
        )


class CurrentProfileView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            profile = get_profile(
                auth_user_id=str(authenticated_user.id),
            )

            profile["email"] = authenticated_user.email

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except ProfileLookupError:
            return Response(
                {
                    "detail": "Profile could not be found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )


class UpdateOnboardingProfileView(AuthenticatedAPIView):
    def patch(self, request):
        serializer = UpdateOnboardingProfileSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            profile = update_onboarding_profile(
                auth_user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except ProfileUpdateError:
            return Response(
                {
                    "detail": "Profile could not be updated.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Profile updated successfully.",
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )


class UpdateAssistantSettingsView(AuthenticatedAPIView):
    def patch(self, request):
        serializer = UpdateAssistantSettingsSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            profile = update_assistant_settings(
                auth_user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except AssistantSettingsUpdateError:
            return Response(
                {
                    "detail": (
                        "Assistant settings could not be updated."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Assistant settings updated successfully.",
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )


class QrLoginChallengeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            challenge = create_qr_login_challenge()

        except QrLoginError:
            return Response(
                {
                    "detail": "Could not create QR login code.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            challenge,
            status=status.HTTP_201_CREATED,
        )


class QrLoginChallengeDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, challenge_token):
        try:
            challenge = get_qr_login_challenge(
                challenge_token=challenge_token,
            )

        except QrLoginError:
            return Response(
                {
                    "detail": "QR code was not found.",
                },
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
    def post(self, request):
        challenge_token = str(
            request.data.get("challenge_token", "")
        ).strip()

        if not challenge_token:
            return Response(
                {
                    "detail": "challenge_token is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            device_session = approve_qr_login_challenge(
                challenge_token=challenge_token,
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except QrLoginError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "BeeApp Web session approved.",
                "device": device_session,
            },
            status=status.HTTP_200_OK,
        )


class DeviceSessionListView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            devices = get_user_device_sessions(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except DeviceSessionError:
            return Response(
                {
                    "detail": "Could not retrieve devices.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "devices": devices,
            },
            status=status.HTTP_200_OK,
        )


class DeviceSessionDetailView(AuthenticatedAPIView):
    def delete(self, request, device_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            revoke_device_session_by_id(
                device_id=str(device_id),
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except DeviceSessionError:
            return Response(
                {
                    "detail": "Could not close device session.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class RevokeAllDeviceSessionsView(AuthenticatedAPIView):
    def delete(self, request):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            revoke_all_user_device_sessions(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except DeviceSessionError:
            return Response(
                {
                    "detail": "Could not close device sessions.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class WebSessionActivateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        challenge_token = str(
            request.data.get("challenge_token", "")
        ).strip()

        if not challenge_token:
            return Response(
                {
                    "detail": "challenge_token is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device_session = get_active_session_by_token(
                session_token=challenge_token,
            )

            update_web_device_metadata(
                device_id=device_session["id"],
                request=request,
            )

        except DeviceSessionError:
            return Response(
                {
                    "detail": "Web session is not active.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(status=status.HTTP_204_NO_CONTENT)

        is_local_development = request.get_host().startswith(
            (
                "localhost",
                "127.0.0.1",
                "192.168.",
            )
        )

        response.set_cookie(
            WEB_SESSION_COOKIE_NAME,
            challenge_token,
            httponly=True,
            secure=not is_local_development,
            samesite="Lax",
            max_age=60 * 60 * 24 * 30,
            path="/",
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
                {
                    "detail": "Web session is missing.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            device_session = get_active_session_by_token(
                session_token=session_token,
            )

            update_web_device_metadata(
                device_id=device_session["id"],
                request=request,
            )

            profile = get_profile(
                auth_user_id=device_session["user_id"],
            )

        except (DeviceSessionError, ProfileLookupError):
            return Response(
                {
                    "detail": "Web session is invalid.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "user": {
                    "id": device_session["user_id"],
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
                device_session = get_active_session_by_token(
                    session_token=session_token,
                )

                revoke_device_session_by_id(
                    device_id=device_session["id"],
                )

            except DeviceSessionError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)

        response.delete_cookie(
            WEB_SESSION_COOKIE_NAME,
            path="/",
        )

        return response