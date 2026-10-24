from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.services.commercial_catalog import (
    archive_commercial_catalog,
    pause_commercial_catalog,
    publish_commercial_catalog,
    restore_commercial_catalog,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.throttles import CommercialExploreThrottle


class CommercialProfileCatalogArchiveView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, catalog_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            catalog = archive_commercial_catalog(
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


class CommercialProfileCatalogRestoreView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, catalog_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            catalog = restore_commercial_catalog(
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




class CommercialProfileCatalogPauseView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, catalog_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            catalog = pause_commercial_catalog(
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


class CommercialProfileCatalogPublishView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, catalog_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            catalog = publish_commercial_catalog(
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
