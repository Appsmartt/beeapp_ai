from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    PublicCommercialCategoriesQuerySerializer,
    PublicCommercialCitiesQuerySerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_public_service import (
    list_public_categories,
    list_public_cities,
    list_public_countries,
)
from apps.commercial.throttles import CommercialExploreThrottle


class PublicCommercialCountriesView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request):
        try:
            self.get_authenticated_user(request)
            countries = list_public_countries()
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
                "countries": countries,
            },
            status=status.HTTP_200_OK,
        )


class PublicCommercialCitiesView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request):
        serializer = PublicCommercialCitiesQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            self.get_authenticated_user(request)
            cities = list_public_cities(
                country_code=serializer.validated_data[
                    "country_code"
                ],
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
                "cities": cities,
            },
            status=status.HTTP_200_OK,
        )


class PublicCommercialCategoriesView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request):
        serializer = PublicCommercialCategoriesQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            self.get_authenticated_user(request)
            categories = list_public_categories(
                country_code=serializer.validated_data.get(
                    "country_code"
                ),
                city=serializer.validated_data.get("city"),
                offer_type=serializer.validated_data.get(
                    "offer_type"
                ),
                search=serializer.validated_data.get("search"),
                limit=serializer.validated_data["limit"],
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
                "categories": categories,
            },
            status=status.HTTP_200_OK,
        )
