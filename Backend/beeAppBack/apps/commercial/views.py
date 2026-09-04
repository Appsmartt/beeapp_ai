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
    CommercialError,
    CommercialProfileCreateError,
    CommercialProfileNotFoundError,
    CommercialProfileUpdateError,
    CommercialProfileValidationError,
    CommercialAccessError,
    CommercialNotFoundError,
    CommercialOperationError,
    CommercialStateError,
)
from apps.commercial.serializers import (
    CommercialCategoryQuerySerializer,
    CreateCommercialProfileSerializer,
    UpdateCommercialProfileSerializer,
    OwnedCommercialCatalogsQuerySerializer,
    CreateCommercialCatalogSerializer,
    UpdateCommercialCatalogSerializer,
    OwnedCommercialOffersQuerySerializer,
    CreateCommercialOfferSerializer,
    UpdateCommercialOfferSerializer,
    CreateCommercialOfferImageSerializer,
    UpdateCommercialOfferImageSerializer,
    AdjustCommercialOfferInventorySerializer,
    CommercialAuditEventsQuerySerializer,
    UpdateCommercialOfferModalitiesSerializer,
    CreateCommercialPaymentMethodSerializer,
    UpdateCommercialPaymentMethodSerializer,
    OwnedCommercialPaymentMethodsQuerySerializer,
    PublicCommercialCategoriesQuerySerializer,
    PublicCommercialCitiesQuerySerializer,
    PublicCommercialProfilesQuerySerializer,
    PublicCommercialOffersQuerySerializer,
)
from apps.commercial.services.commercial_profile_service import (
    create_commercial_profile,
    get_commercial_profile,
    get_owned_commercial_profile,
    list_commercial_categories,
    list_owned_commercial_profiles,
    update_commercial_profile,
)
from apps.commercial.services.commercial_audit_service import (
    list_owned_commercial_audit_events,
)

from apps.commercial.services.commercial_catalog_service import (
    archive_commercial_catalog,
    create_commercial_catalog,
    get_owned_commercial_catalog,
    list_owned_commercial_catalogs,
    pause_commercial_catalog,
    publish_commercial_catalog,
    restore_commercial_catalog,
    update_commercial_catalog,
)

from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_offer_service import (
    add_commercial_offer_image,
    adjust_commercial_offer_inventory,
    archive_commercial_offer,
    archive_commercial_offer_image,
    create_commercial_offer,
    disable_commercial_offer,
    enable_commercial_offer,
    get_owned_commercial_offer,
    list_owned_commercial_offers,
    pause_commercial_offer,
    publish_commercial_offer,
    restore_commercial_offer,
    restore_commercial_offer_image,
    set_commercial_offer_primary_image,
    update_commercial_offer,
    update_commercial_offer_image,
    update_commercial_offer_modalities,
)

from apps.commercial.services.commercial_payment_method_service import (
    archive_commercial_payment_method,
    create_commercial_payment_method,
    get_owned_commercial_payment_method,
    list_owned_commercial_payment_methods,
    update_commercial_payment_method,
)

from apps.commercial.services.commercial_public_service import (
    get_public_commercial_profile,
    get_public_commercial_offer,
    list_public_categories,
    list_public_cities,
    list_public_commercial_catalogs,
    list_public_commercial_offers,
    list_public_commercial_profiles,
    list_public_countries,
)
from apps.commercial.throttles import (
    CommercialExploreThrottle,
    CommercialManageThrottle,
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
        serializer.is_valid(raise_exception=True)

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
    throttle_classes = [CommercialExploreThrottle]

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


class CommercialProfileOfferPauseView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            offer = pause_commercial_offer(
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


class CommercialProfileOfferPublishView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            offer = publish_commercial_offer(
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


class CommercialProfileOfferArchiveView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            offer = archive_commercial_offer(
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


class CommercialProfileOfferRestoreView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            offer = restore_commercial_offer(
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


class CommercialProfileOfferImagesView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        serializer = CreateCommercialOfferImageSerializer(
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

            image = add_commercial_offer_image(
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
                "image": image,
            },
            status=status.HTTP_201_CREATED,
        )


class CommercialProfileOfferImageArchiveView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(
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

            image = archive_commercial_offer_image(
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
            {
                "image": image,
            },
            status=status.HTTP_200_OK,
        )




class CommercialProfileOfferImageRestoreView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(
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

            image = restore_commercial_offer_image(
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
            {
                "image": image,
            },
            status=status.HTTP_200_OK,
        )




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




class CommercialProfileOfferImageSetPrimaryView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(
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

            image = set_commercial_offer_primary_image(
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
            {
                "image": image,
            },
            status=status.HTTP_200_OK,
        )




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




class CommercialProfileOfferEnableView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            offer = enable_commercial_offer(
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


class CommercialProfileOfferDisableView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request
            )

            offer = disable_commercial_offer(
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




class CommercialProfileAuditEventsView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def get(self, request, profile_id):
        serializer = CommercialAuditEventsQuerySerializer(
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

            entity_id = serializer.validated_data.get(
                "entity_id"
            )

            result = list_owned_commercial_audit_events(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                entity_type=serializer.validated_data.get(
                    "entity_type"
                ),
                entity_id=(
                    str(entity_id)
                    if entity_id is not None
                    else None
                ),
                action=serializer.validated_data.get("action"),
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
                requires_booking=serializer.validated_data.get(
                    "requires_booking"
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


class CommercialProfilePaymentMethodsView(
    AuthenticatedAPIView,
):
    """
    GET  /api/commercial/profiles/<profile_id>/payment-methods/
    POST /api/commercial/profiles/<profile_id>/payment-methods/

    Solo el owner del perfil comercial puede listar o administrar
    detalles privados de sus métodos externos de pago.
    """

    throttle_classes = [CommercialManageThrottle]

    def get(self, request, profile_id):
        serializer = OwnedCommercialPaymentMethodsQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request,
            )

            payment_methods = (
                list_owned_commercial_payment_methods(
                    user_id=str(authenticated_user.id),
                    access_token=access_token,
                    commercial_profile_id=str(profile_id),
                    include_archived=serializer.validated_data[
                        "include_archived"
                    ],
                )
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
                "payment_methods": payment_methods,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, profile_id):
        serializer = CreateCommercialPaymentMethodSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request,
            )

            payment_method = create_commercial_payment_method(
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
                "payment_method": payment_method,
            },
            status=status.HTTP_201_CREATED,
        )


class CommercialProfilePaymentMethodDetailView(
    AuthenticatedAPIView,
):
    """
    GET   /api/commercial/profiles/<profile_id>/payment-methods/<id>/
    PATCH /api/commercial/profiles/<profile_id>/payment-methods/<id>/

    El tipo de pago no se modifica: para cambiarlo se crea un método
    nuevo y se archiva el anterior, preservando referencias históricas.
    """

    throttle_classes = [CommercialManageThrottle]

    def get(self, request, profile_id, payment_method_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request,
            )

            payment_method = (
                get_owned_commercial_payment_method(
                    user_id=str(authenticated_user.id),
                    access_token=access_token,
                    commercial_profile_id=str(profile_id),
                    payment_method_id=str(payment_method_id),
                )
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
                "payment_method": payment_method,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, profile_id, payment_method_id):
        serializer = UpdateCommercialPaymentMethodSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request,
            )

            payment_method = update_commercial_payment_method(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                payment_method_id=str(payment_method_id),
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
                "payment_method": payment_method,
            },
            status=status.HTTP_200_OK,
        )


class CommercialProfilePaymentMethodArchiveView(
    AuthenticatedAPIView,
):
    """
    POST /api/commercial/profiles/<profile_id>/payment-methods/<id>/archive/
    """

    throttle_classes = [CommercialManageThrottle]

    def post(self, request, profile_id, payment_method_id):
        try:
            (
                authenticated_user,
                access_token,
            ) = self.get_authenticated_user_and_access_token(
                request,
            )

            payment_method = archive_commercial_payment_method(
                user_id=str(authenticated_user.id),
                access_token=access_token,
                commercial_profile_id=str(profile_id),
                payment_method_id=str(payment_method_id),
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
                "payment_method": payment_method,
            },
            status=status.HTTP_200_OK,
        )
