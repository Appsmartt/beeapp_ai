from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CreateCommercialOfferSerializer,
    OwnedCommercialOffersQuerySerializer,
    UpdateCommercialOfferSerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_offer import (
    create_commercial_offer,
    get_owned_commercial_offer,
    list_owned_commercial_offers,
    update_commercial_offer,
)
from apps.commercial.throttles import CommercialExploreThrottle


class CommercialProfileOffersView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        serializer = OwnedCommercialOffersQuerySerializer(
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

            catalog_id = serializer.validated_data.get(
                "catalog_id"
            )

            offers = list_owned_commercial_offers(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                catalog_id=(
                    str(catalog_id)
                    if catalog_id is not None
                    else None
                ),
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
                "offers": offers,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, profile_id):
        serializer = CreateCommercialOfferSerializer(
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

            offer = create_commercial_offer(
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
                "offer": offer,
            },
            status=status.HTTP_201_CREATED,
        )


class CommercialProfileOfferDetailView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id, offer_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            offer = get_owned_commercial_offer(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                offer_id=str(offer_id),
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
                "offer": offer,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, profile_id, offer_id):
        serializer = UpdateCommercialOfferSerializer(
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

            offer = update_commercial_offer(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                offer_id=str(offer_id),
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
                "offer": offer,
            },
            status=status.HTTP_200_OK,
        )
