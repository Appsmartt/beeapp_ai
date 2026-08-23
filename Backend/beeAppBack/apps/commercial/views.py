from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import (
    AccountAuthenticationError,
)
from apps.accounts.views import (
    AuthenticatedAPIView,
)
from apps.commercial.exceptions import (
    CommercialCategoryLookupError,
    CommercialProfileCreateError,
    CommercialProfileNotFoundError,
    CommercialProfileValidationError,
)
from apps.commercial.serializers import (
    CommercialCategoryQuerySerializer,
    CreateCommercialProfileSerializer,
)
from apps.commercial.services.commercial_profile_service import (
    create_commercial_profile,
    get_commercial_profile,
    list_commercial_categories,
)


class CommercialCategoriesView(AuthenticatedAPIView):
    def get(self, request):
        serializer = CommercialCategoryQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            self.get_authenticated_user(request)

            parent_id = serializer.validated_data.get("parent_id")

            categories = list_commercial_categories(
                offer_type=serializer.validated_data.get(
                    "offer_type"
                ),
                parent_id=(
                    str(parent_id)
                    if parent_id is not None
                    else None
                ),
                include_inactive=serializer.validated_data.get(
                    "include_inactive",
                    False,
                ),
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except CommercialCategoryLookupError:
            return Response(
                {
                    "detail": (
                        "Could not retrieve commercial categories."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "categories": categories,
            },
            status=status.HTTP_200_OK,
        )


class CommercialProfilesView(AuthenticatedAPIView):
    def post(self, request):
        serializer = CreateCommercialProfileSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            profile = create_commercial_profile(
                user_id=str(authenticated_user.id),
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
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except CommercialProfileCreateError as error:
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
    def get(self, request, profile_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            profile = get_commercial_profile(
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