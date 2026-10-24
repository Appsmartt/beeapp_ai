import logging

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialError
from apps.commercial.serializers import CreateCommercialOfferImageSerializer
from apps.commercial.services.commercial_http_service import (
    commercial_error_response,
)
from apps.commercial.services.commercial_offer import (
    add_commercial_offer_image,
)
from apps.commercial.services.commercial_public_media_service import (
    upload_commercial_public_image,
)
from apps.commercial.throttles import CommercialExploreThrottle
from apps.storage.exceptions import StorageUploadError

logger = logging.getLogger(__name__)


class CommercialPublicImageUploadView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if uploaded_file is None:
            return Response(
                {
                    "detail": (
                        "A commercial image file is required."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            authenticated_user = self.get_authenticated_user(request)

            uploaded_image = upload_commercial_public_image(
                user_id=str(authenticated_user.id),
                uploaded_file=uploaded_file,
            )

        except AccountAuthenticationError:
            return Response(
                {
                    "detail": "Invalid or expired access token.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except StorageUploadError as error:
            logger.warning(
                "Commercial public image upload failed: user_id=%s "
                "filename=%s error=%s",
                (
                    str(authenticated_user.id)
                    if "authenticated_user" in locals()
                    else None
                ),
                getattr(uploaded_file, "name", None),
                str(error),
            )
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "files": [
                    {
                        "id": uploaded_image["file_id"],
                        "owner_id": str(authenticated_user.id),
                        "bucket_id": uploaded_image["bucket_id"],
                        "storage_path": uploaded_image[
                            "storage_path"
                        ],
                        "original_name": uploaded_image[
                            "original_name"
                        ],
                        "display_name": uploaded_image[
                            "original_name"
                        ],
                        "extension": uploaded_image["extension"],
                        "mime_type": uploaded_image["mime_type"],
                        "kind": "image",
                        "size_bytes": uploaded_image["size_bytes"],
                        "status": "ready",
                        "is_starred": False,
                        "trashed_at": None,
                        "purge_after": None,
                        "url": uploaded_image["url"],
                    },
                ],
                "failed_files": [],
                "success_count": 1,
                "failure_count": 0,
            },
            status=status.HTTP_201_CREATED,
        )


class CommercialProfileOfferImagesView(
    AuthenticatedAPIView,
):
    throttle_classes = [CommercialExploreThrottle]

    def post(self, request, profile_id, offer_id):
        serializer = CreateCommercialOfferImageSerializer(
            data=request.data,
        )

        if not serializer.is_valid():
            logger.warning(
                "Commercial offer image serializer validation failed: profile_id=%s offer_id=%s payload_keys=%s errors=%s",
                profile_id,
                offer_id,
                sorted(request.data.keys()) if hasattr(request.data, "keys") else [],
                serializer.errors,
            )
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

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
