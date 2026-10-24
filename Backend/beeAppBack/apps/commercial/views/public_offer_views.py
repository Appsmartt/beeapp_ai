from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    PublicCommercialOffersQuerySerializer,
    PublicCommercialProductFeedQuerySerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_public_service import (
    get_public_commercial_offer,
    list_public_commercial_offers,
    list_public_commercial_product_feed,
)
from apps.commercial.throttles import CommercialExploreThrottle


class PublicCommercialProductFeedView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request):
        serializer = PublicCommercialProductFeedQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            self.get_authenticated_user(request)

            result = list_public_commercial_product_feed(
                search=serializer.validated_data.get("search"),
                seed=serializer.validated_data.get("seed"),
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


class PublicCommercialOffersView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        serializer = PublicCommercialOffersQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            self.get_authenticated_user(request)

            catalog_id = serializer.validated_data.get(
                "catalog_id"
            )

            result = list_public_commercial_offers(
                commercial_profile_id=str(profile_id),
                catalog_id=(
                    str(catalog_id)
                    if catalog_id is not None
                    else None
                ),
                offer_kind=serializer.validated_data.get(
                    "offer_kind"
                ),
                modality=serializer.validated_data.get(
                    "modality"
                ),
                requires_booking=(
                    serializer.validated_data["requires_booking"]
                    if "requires_booking" in request.query_params
                    else None
                ),
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


class PublicCommercialOfferDetailView(AuthenticatedAPIView):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, offer_id):
        try:
            self.get_authenticated_user(request)

            offer = get_public_commercial_offer(
                commercial_offer_id=str(offer_id),
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
