import logging

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import (
    CommercialProfileCreateError,
    CommercialProfileNotFoundError,
    CommercialProfileUpdateError,
    CommercialProfileValidationError,
)
from apps.commercial.serializers import (
    CreateCommercialProfileSerializer,
    UpdateCommercialProfileSerializer,
)
from apps.commercial.services.commercial_profile_service import (
    create_commercial_profile,
    get_owned_commercial_profile,
    list_owned_commercial_profiles,
    update_commercial_profile,
)
from apps.commercial.throttles import CommercialExploreThrottle

logger = logging.getLogger(__name__)


class CommercialProfilesView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)

            profiles = list_owned_commercial_profiles(
                user_id=str(authenticated_user.id),
            )
        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialProfileNotFoundError:
            return Response(
                {
                    "detail": "Could not retrieve commercial profiles.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "profiles": profiles,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CreateCommercialProfileSerializer(
            data=request.data,
        )

        if not serializer.is_valid():
            logger.warning(
                'Commercial profile create serializer validation failed: %s',
                serializer.errors,
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            profile = create_commercial_profile(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except CommercialProfileValidationError as error:
            logger.warning(
                'Commercial profile domain validation failed: %s',
                str(error),
            )
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except CommercialProfileCreateError as error:
            logger.exception(
                'Commercial profile creation failed: %s',
                str(error),
            )
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "profile": profile,
            },
            status=status.HTTP_201_CREATED,
        )


class CommercialProfileDetailView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            profile = get_owned_commercial_profile(
                user_id=str(authenticated_user.id),
                profile_id=str(profile_id),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except CommercialProfileNotFoundError:
            return Response(
                {
                    "detail": (
                        "Commercial profile was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )


    def patch(self, request, profile_id):
        serializer = UpdateCommercialProfileSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            profile = update_commercial_profile(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                profile_id=str(profile_id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except CommercialProfileNotFoundError:
            return Response(
                {
                    "detail": (
                        "Commercial profile was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CommercialProfileValidationError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except CommercialProfileUpdateError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )
