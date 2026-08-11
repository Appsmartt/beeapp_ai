from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    AccountLoginError,
    AccountRegistrationError,
    AssistantSettingsUpdateError,
    ProfileLookupError,
    ProfileUpdateError,
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
from apps.accounts.services.login_service import (
    login_with_email_password,
)
from apps.accounts.services.profile_service import (
    get_profile,
    update_assistant_settings,
    update_onboarding_profile,
)
from apps.accounts.services.registration_service import (
    create_complete_user,
)


class AuthenticatedAPIView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_user(self, request):
        authorization_header = request.headers.get(
            "Authorization",
            "",
        )

        scheme, _, access_token = authorization_header.partition(" ")

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
                        "The email or phone number may already be registered."
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
                    "first_name": created_user["profile"]["first_name"],
                    "last_name": created_user["profile"]["last_name"],
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
            authenticated_user = self.get_authenticated_user(request)

            profile = get_profile(
                auth_user_id=str(authenticated_user.id),
            )

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
            authenticated_user = self.get_authenticated_user(request)

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
            authenticated_user = self.get_authenticated_user(request)

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
                    "detail": "Assistant settings could not be updated.",
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