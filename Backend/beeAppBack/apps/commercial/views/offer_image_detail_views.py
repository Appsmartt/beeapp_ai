from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import UpdateCommercialOfferImageSerializer
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_offer import (
    delete_commercial_offer_image,
    update_commercial_offer_image,
)
from apps.commercial.throttles import CommercialExploreThrottle


class CommercialProfileOfferImageDetailView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def patch(
        self,
        request,
        profile_id,
        offer_id,
        image_id,
    ):
        serializer = UpdateCommercialOfferImageSerializer(
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

            image = update_commercial_offer_image(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                offer_id=str(offer_id),
                image_id=str(image_id),
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
                "image": image,
            },
            status=status.HTTP_200_OK,
        )




    def delete(
        self,
        request,
        profile_id,
        offer_id,
        image_id,
    ):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            delete_commercial_offer_image(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                offer_id=str(offer_id),
                image_id=str(image_id),
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
            status=status.HTTP_204_NO_CONTENT,
        )
