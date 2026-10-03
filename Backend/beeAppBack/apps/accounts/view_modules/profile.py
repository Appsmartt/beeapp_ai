from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    AssistantSettingsUpdateError,
    ProfileAvatarValidationError,
    ProfileLookupError,
    ProfileUpdateError,
)
from apps.accounts.serializers import (
    UpdateAssistantSettingsSerializer,
    UpdateOnboardingProfileSerializer,
    UpdateProfileAvatarSerializer,
)
from apps.accounts.view_modules.common import AuthenticatedAPIView


def _compatibility_views():
    from apps.accounts import views

    return views


class CurrentProfileView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)
            profile = _compatibility_views().get_profile(
                auth_user_id=str(authenticated_user.id),
            )
            profile["email"] = authenticated_user.email
        except (AccountAuthenticationError, AuthenticationFailed):
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except ProfileLookupError:
            return Response(
                {"detail": "Profile could not be found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"profile": profile},
            status=status.HTTP_200_OK,
        )


class ProfileAvatarView(AuthenticatedAPIView):
    def patch(self, request):
        serializer = UpdateProfileAvatarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            profile = _compatibility_views().update_profile_avatar(
                auth_user_id=str(authenticated_user.id),
                avatar_file_id=str(
                    serializer.validated_data["avatar_file_id"]
                ),
            )
            profile["email"] = authenticated_user.email
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except ProfileAvatarValidationError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ProfileUpdateError:
            return Response(
                {"detail": "Profile avatar could not be updated."},
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
            authenticated_user = self.get_authenticated_user(request)
            profile = _compatibility_views().remove_profile_avatar(
                auth_user_id=str(authenticated_user.id),
            )
            profile["email"] = authenticated_user.email
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except ProfileUpdateError:
            return Response(
                {"detail": "Profile avatar could not be removed."},
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
        serializer = UpdateOnboardingProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            profile = _compatibility_views().update_onboarding_profile(
                auth_user_id=str(authenticated_user.id),
                occupation=serializer.validated_data["occupation"],
                location=serializer.validated_data["location"],
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
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
        serializer = UpdateAssistantSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            profile = _compatibility_views().update_assistant_settings(
                auth_user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
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
