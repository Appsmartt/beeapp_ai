import secrets

from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    AccountLoginError,
    AccountLoginUnavailableError,
    AccountRegistrationError,
    AssistantSettingsUpdateError,
    AuthUserLookupError,
    DeviceSessionError,
    PasswordResetConfirmationError,
    PasswordResetRequestError,
    PasswordResetVerificationError,
    PhoneOtpRequestError,
    PhoneOtpVerificationError,
    ProfileAvatarValidationError,
    ProfileLookupError,
    ProfileUpdateError,
    QrLoginError,
)
from apps.accounts.serializers import (
    LoginUserSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    RefreshSessionSerializer,
    RequestPhoneOtpSerializer,
    RegisterUserSerializer,
    UpdateAssistantSettingsSerializer,
    UpdateOnboardingProfileSerializer,
    UpdateProfileAvatarSerializer,
    UpdateProfileSerializer,
    VerifyPhoneOtpSerializer,
)
from apps.accounts.services.auth_session_service import (
    get_authenticated_user,
)
from apps.accounts.services.auth_user_service import (
    get_auth_user,
    update_auth_user_email,
)
from apps.accounts.services.device_session_service import (
    create_or_replace_mobile_device_session,
    create_mobile_device_session,
    create_web_device_session,
    get_active_mobile_device_session_for_auth_session,
    get_active_session_by_token,
    get_user_device_sessions,
    refresh_mobile_device_session,
    revoke_all_user_device_sessions,
    revoke_device_session_by_id,
    update_device_metadata,
)
from apps.accounts.services.login_service import (
    login_with_email_password,
)
from apps.accounts.services.password_reset_service import (
    confirm_password_reset,
    request_password_reset,
    verify_password_reset_otp,
)
from apps.accounts.services.phone_otp_service import (
    request_phone_otp,
    verify_phone_otp,
)
from apps.accounts.services.profile_service import (
    get_profile,
    remove_profile_avatar,
    update_assistant_settings,
    update_onboarding_profile,
    update_profile,
    update_profile_avatar,
)
from apps.accounts.services.qr_login_service import (
    approve_qr_login_challenge,
    create_qr_login_challenge,
    get_qr_login_challenge,
)
from apps.accounts.services.registration_service import (
    create_complete_user,
)
from apps.accounts.services.session_refresh_service import (
    refresh_supabase_session,
)
from apps.accounts.throttles import (
    PasswordResetConfirmationThrottle,
    PasswordResetRequestThrottle,
    PasswordResetVerificationThrottle,
    PhoneOtpRequestThrottle,
    PhoneOtpVerificationThrottle,
)


WEB_SESSION_COOKIE_NAME = "beeapp_web_session"
WEB_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None

    if phone.startswith("+"):
        return phone

    return f"+{phone}"


def is_local_development_request(request) -> bool:
    return request.get_host().startswith(
        (
            "localhost",
            "127.0.0.1",
            "192.168.",
        )
    )


def set_web_session_cookie(
    *,
    response: Response,
    request,
    session_token: str,
) -> None:
    response.set_cookie(
        WEB_SESSION_COOKIE_NAME,
        session_token,
        httponly=True,
        secure=not is_local_development_request(request),
        samesite="Lax",
        max_age=WEB_SESSION_COOKIE_MAX_AGE_SECONDS,
        path="/",
    )


class AuthenticatedAPIView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_user_from_session(
        self,
        *,
        session_token: str,
        request,
    ):
        try:
            device_session = get_active_session_by_token(
                session_token=session_token,
            )

            update_device_metadata(
                device_id=device_session["id"],
                request=request,
            )

            return get_auth_user(
                auth_user_id=device_session["user_id"],
            )
        except (
            AuthUserLookupError,
            DeviceSessionError,
        ) as error:
            raise AccountAuthenticationError(
                "Session authentication failed."
            ) from error

    def get_authenticated_user(self, request):
        authorization_header = request.headers.get(
            "Authorization",
            "",
        )

        scheme, _, token = authorization_header.partition(" ")

        if scheme.lower() == "bearer" and token:
            try:
                authenticated_user = get_authenticated_user(
                    access_token=token,
                )

                get_active_mobile_device_session_for_auth_session(
                    user_id=str(authenticated_user.id),
                    access_token=token,
                )

                return authenticated_user
            except (
                AccountAuthenticationError,
                DeviceSessionError,
            ) as error:
                raise AuthenticationFailed(
                    "Authentication credentials were invalid or "
                    "the mobile session is no longer active."
                ) from error

        if scheme.lower() == "session" and token:
            return self.get_authenticated_user_from_session(
                session_token=token,
                request=request,
            )

        session_token = request.COOKIES.get(
            WEB_SESSION_COOKIE_NAME
        )

        if not session_token:
            raise AccountAuthenticationError(
                "Missing authentication credentials."
            )

        return self.get_authenticated_user_from_session(
            session_token=session_token,
            request=request,
        )

    def get_bearer_access_token(self, request) -> str:
        authorization_header = request.headers.get(
            "Authorization",
            "",
        )

        scheme, _, token = authorization_header.partition(" ")

        if scheme.lower() != "bearer" or not token:
            raise AccountAuthenticationError(
                "Bearer access token is required."
            )

        return token

    def get_authenticated_user_and_access_token(
        self,
        request,
    ):
        access_token = self.get_bearer_access_token(request)

        try:
            authenticated_user = get_authenticated_user(
                access_token=access_token,
            )

            get_active_mobile_device_session_for_auth_session(
                user_id=str(authenticated_user.id),
                access_token=access_token,
            )

            return authenticated_user, access_token
        except (
            AccountAuthenticationError,
            DeviceSessionError,
        ) as error:
            raise AuthenticationFailed(
                "Authentication credentials were invalid or "
                "the mobile session is no longer active."
            ) from error


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
        except AccountLoginUnavailableError:
            return Response(
                {
                    "detail": (
                        "Authentication service is temporarily "
                        "unavailable. Please try again."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except AccountLoginError:
            return Response(
                {
                    "detail": "Invalid email or password.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            create_or_replace_mobile_device_session(
                user_id=str(authenticated_user["user"]["id"]),
                access_token=authenticated_user["session"][
                    "access_token"
                ],
                request=request,
            )
        except DeviceSessionError:
            return Response(
                {
                    "detail": (
                        "Could not create the mobile device session."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Login successful.",
                "session": authenticated_user["session"],
                "user": authenticated_user["user"],
            },
            status=status.HTTP_200_OK,
        )


class SessionRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RefreshSessionSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            refresh_token = serializer.validated_data.get(
                "refresh_token"
            )

            if refresh_token:
                session = refresh_supabase_session(
                    refresh_token=refresh_token,
                )
            else:
                session = refresh_mobile_device_session(
                    session_token=serializer.validated_data[
                        "session_token"
                    ],
                )
        except (
            AccountAuthenticationError,
            DeviceSessionError,
        ):
            return Response(
                {
                    "detail": (
                        "Session is invalid, expired, "
                        "or has been revoked."
                    ),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "session": session,
            },
            status=status.HTTP_200_OK,
        )


class PhoneOtpRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PhoneOtpRequestThrottle]

    def post(self, request):
        serializer = RequestPhoneOtpSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            request_phone_otp(
                **serializer.validated_data
            )
        except PhoneOtpRequestError:
            pass

        return Response(
            {
                "message": (
                    "If the phone number is eligible, a verification "
                    "code has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class PhoneOtpVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PhoneOtpVerificationThrottle]

    def post(self, request):
        serializer = VerifyPhoneOtpSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = verify_phone_otp(
                **serializer.validated_data
            )

            profile = get_profile(
                auth_user_id=str(authenticated_user.id),
            )

            session_token = secrets.token_urlsafe(48)

            device_session = create_web_device_session(
                user_id=str(authenticated_user.id),
                session_token=session_token,
            )

            update_device_metadata(
                device_id=device_session["id"],
                request=request,
            )
        except (
            PhoneOtpVerificationError,
            ProfileLookupError,
        ):
            return Response(
                {
                    "detail": (
                        "Invalid, expired, or unavailable code."
                    ),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except DeviceSessionError:
            return Response(
                {
                    "detail": "Could not create the web session.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = Response(
            {
                "message": "Login successful.",
                "user": {
                    "id": str(authenticated_user.id),
                    "email": authenticated_user.email,
                    "phone": normalize_phone(
                        authenticated_user.phone
                    ),
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "role": profile["role"],
                },
            },
            status=status.HTTP_200_OK,
        )

        set_web_session_cookie(
            response=response,
            request=request,
            session_token=session_token,
        )

        return response


class PhoneOtpMobileVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PhoneOtpVerificationThrottle]

    def post(self, request):
        serializer = VerifyPhoneOtpSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            otp_result = verify_phone_otp(
                **serializer.validated_data
            )

            authenticated_user = otp_result["user"]

            profile = get_profile(
                auth_user_id=str(authenticated_user.id),
            )

            create_or_replace_mobile_device_session(
                user_id=str(authenticated_user.id),
                access_token=otp_result["session"][
                    "access_token"
                ],
                request=request,
            )
        except (
            PhoneOtpVerificationError,
            ProfileLookupError,
        ):
            return Response(
                {
                    "detail": (
                        "Invalid, expired, or unavailable code."
                    ),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except DeviceSessionError:
            return Response(
                {
                    "detail": "Could not create the mobile session.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Login successful.",
                "session": otp_result["session"],
                "user": {
                    "id": str(authenticated_user.id),
                    "email": authenticated_user.email,
                    "phone": normalize_phone(
                        authenticated_user.phone
                    ),
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "role": profile["role"],
                },
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRequestThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            request_password_reset(
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
        serializer = PasswordResetVerifySerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            reset_token = verify_password_reset_otp(
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
        serializer = PasswordResetConfirmSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            confirm_password_reset(
                reset_token=serializer.validated_data[
                    "reset_token"
                ],
                new_password=serializer.validated_data[
                    "new_password"
                ],
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
        except (
            AccountAuthenticationError,
            AuthenticationFailed,
        ):
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


class ProfileAvatarView(AuthenticatedAPIView):
    def patch(self, request):
        serializer = UpdateProfileAvatarSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            profile = update_profile_avatar(
                auth_user_id=str(authenticated_user.id),
                avatar_file_id=str(
                    serializer.validated_data["avatar_file_id"]
                ),
            )

            profile["email"] = authenticated_user.email

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except ProfileAvatarValidationError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ProfileUpdateError:
            return Response(
                {
                    "detail": "Profile avatar could not be updated.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Profile avatar updated successfully.",
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            profile = remove_profile_avatar(
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

        except ProfileUpdateError:
            return Response(
                {
                    "detail": "Profile avatar could not be removed.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Profile avatar removed successfully.",
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
                occupation=serializer.validated_data[
                    "occupation"
                ],
                location=serializer.validated_data[
                    "location"
                ],
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
                    "detail": (
                        "Onboarding profile could not be updated."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": (
                    "Onboarding profile updated successfully."
                ),
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
                    )
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

            update_device_metadata(
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

        set_web_session_cookie(
            response=response,
            request=request,
            session_token=challenge_token,
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

            update_device_metadata(
                device_id=device_session["id"],
                request=request,
            )

            profile = get_profile(
                auth_user_id=device_session["user_id"],
            )

            auth_user = get_auth_user(
                auth_user_id=device_session["user_id"],
            )
        except (
            AuthUserLookupError,
            DeviceSessionError,
            ProfileLookupError,
        ):
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