from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import PublicCommercialProfilesQuerySerializer
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_public_service import (
    get_public_commercial_profile,
    list_public_commercial_catalogs,
    list_public_commercial_profiles,
)
from apps.commercial.throttles import CommercialExploreThrottle


class PublicCommercialProfilesView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request):
        serializer = PublicCommercialProfilesQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            self.get_authenticated_user(request)

            result = list_public_commercial_profiles(
                country_code=serializer.validated_data.get(
                    "country_code"
                ),
                city=serializer.validated_data.get("city"),
                category_id=(
                    str(
                        serializer.validated_data["category_id"]
                    )
                    if serializer.validated_data.get(
                        "category_id"
                    )
                    else None
                ),
                offer_type=serializer.validated_data.get(
                    "offer_type"
                ),
                modality=serializer.validated_data.get(
                    "modality"
                ),
                verified_only=serializer.validated_data[
                    "verified_only"
                ],
                delivery_only=serializer.validated_data[
                    "delivery_only"
                ],
                search=serializer.validated_data.get("search"),
                ordering=serializer.validated_data["ordering"],
                limit=serializer.validated_data["limit"],
                offset=serializer.validated_data["offset"],
            )
        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class PublicCommercialProfileDetailView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        try:
            self.get_authenticated_user(request)

            profile = get_public_commercial_profile(
                commercial_profile_id=str(profile_id),
            )
        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {
                "profile": profile,
            },
            status=status.HTTP_200_OK,
        )



class PublicCommercialCatalogsView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        try:
            self.get_authenticated_user(request)

            catalogs = list_public_commercial_catalogs(
                commercial_profile_id=str(profile_id),
            )
        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {
                "commercial_profile_id": str(profile_id),
                "catalogs": catalogs,
            },
            status=status.HTTP_200_OK,
        )
