from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CreateCommercialPaymentMethodSerializer,
    OwnedCommercialPaymentMethodsQuerySerializer,
    UpdateCommercialPaymentMethodSerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_payment_method_service import (
    archive_commercial_payment_method,
    create_commercial_payment_method,
    get_owned_commercial_payment_method,
    list_owned_commercial_payment_methods,
    update_commercial_payment_method,
)
from apps.commercial.throttles import CommercialManageThrottle


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
