from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    AdjustCommercialOfferInventorySerializer,
    UpdateCommercialOfferModalitiesSerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_offer import (
    adjust_commercial_offer_inventory,
    update_commercial_offer_modalities,
)
from apps.commercial.throttles import CommercialExploreThrottle


class CommercialProfileOfferModalitiesView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def patch(self, request, profile_id, offer_id):
        serializer = UpdateCommercialOfferModalitiesSerializer(
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

            offer = update_commercial_offer_modalities(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                offer_id=str(offer_id),
                modalities=serializer.validated_data[
                    "modalities"
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
                "offer": offer,
            },
            status=status.HTTP_200_OK,
        )

class CommercialProfileOfferInventoryAdjustView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        serializer = AdjustCommercialOfferInventorySerializer(
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

            offer = adjust_commercial_offer_inventory(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                offer_id=str(offer_id),
                quantity_delta=serializer.validated_data[
                    "quantity_delta"
                ],
                reason_code=serializer.validated_data[
                    "reason_code"
                ],
                reason_text=serializer.validated_data.get(
                    "reason_text"
                ),
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
