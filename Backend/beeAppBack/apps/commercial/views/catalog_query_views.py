from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CreateCommercialCatalogSerializer,
    OwnedCommercialCatalogsQuerySerializer,
    UpdateCommercialCatalogSerializer,
)
from apps.commercial.services.commercial_catalog_service import (
    create_commercial_catalog,
    get_owned_commercial_catalog,
    list_owned_commercial_catalogs,
    update_commercial_catalog,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.throttles import CommercialExploreThrottle


class CommercialProfileCatalogsView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        serializer = OwnedCommercialCatalogsQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            catalogs = list_owned_commercial_catalogs(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                include_archived=serializer.validated_data[
                    "include_archived"
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
                "commercial_profile_id": str(profile_id),
                "catalogs": catalogs,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, profile_id):
        serializer = CreateCommercialCatalogSerializer(
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

            catalog = create_commercial_catalog(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                payload=serializer.validated_data,
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
                "catalog": catalog,
            },
            status=status.HTTP_201_CREATED,
        )


class CommercialProfileCatalogDetailView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id, catalog_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            catalog = get_owned_commercial_catalog(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                catalog_id=str(catalog_id),
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
                "catalog": catalog,
            },
            status=status.HTTP_200_OK,
        )


    def patch(self, request, profile_id, catalog_id):
        serializer = UpdateCommercialCatalogSerializer(
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

            catalog = update_commercial_catalog(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                catalog_id=str(catalog_id),
                payload=serializer.validated_data,
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
                "catalog": catalog,
            },
            status=status.HTTP_200_OK,
        )
