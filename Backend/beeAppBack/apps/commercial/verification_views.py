from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import (
    CreateCommercialVerificationDocumentSerializer,
    CreateCommercialVerificationRequestSerializer,
    SubmitCommercialVerificationRequestSerializer,
)
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.verification_service import (
    attach_owned_commercial_verification_document,
    get_owned_commercial_verification,
    save_owned_commercial_verification,
    submit_owned_commercial_verification,
)
from apps.commercial.throttles import CommercialManageThrottle


class CommercialProfileVerificationView(AuthenticatedAPIView):
    throttle_classes = [CommercialManageThrottle]

    def get(self, request, profile_id):
        try:
            user = self.get_authenticated_user(request)
            result = get_owned_commercial_verification(
                user_id=str(user.id),
                commercial_profile_id=str(profile_id),
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(result, status=status.HTTP_200_OK)

    def post(self, request, profile_id):
        serializer = CreateCommercialVerificationRequestSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            user = self.get_authenticated_user(request)
            verification = save_owned_commercial_verification(
                user_id=str(user.id),
                commercial_profile_id=str(profile_id),
                payload=serializer.validated_data,
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {"request": verification},
            status=status.HTTP_200_OK,
        )


class CommercialProfileVerificationSubmitView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request, profile_id):
        serializer = SubmitCommercialVerificationRequestSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            user = self.get_authenticated_user(request)
            verification = submit_owned_commercial_verification(
                user_id=str(user.id),
                commercial_profile_id=str(profile_id),
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {"request": verification},
            status=status.HTTP_200_OK,
        )


class CommercialProfileVerificationDocumentView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialManageThrottle]

    def post(self, request, profile_id):
        serializer = CreateCommercialVerificationDocumentSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            user = self.get_authenticated_user(request)
            verification = (
                attach_owned_commercial_verification_document(
                    user_id=str(user.id),
                    commercial_profile_id=str(profile_id),
                    file_id=str(serializer.validated_data["file_id"]),
                    note=serializer.validated_data.get("note"),
                )
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialError as error:
            return commercial_error_response(error)

        return Response(
            {"request": verification},
            status=status.HTTP_200_OK,
        )
