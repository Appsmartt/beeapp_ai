from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.commercial.exceptions import CommercialCategoryLookupError
from apps.commercial.serializers import CommercialCategoryQuerySerializer
from apps.commercial.services.commercial_profile_service import (
    list_commercial_categories,
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
                offer_type=serializer.validated_data.get("offer_type"),
                parent_id=str(parent_id) if parent_id else None,
                include_inactive=serializer.validated_data.get(
                    "include_inactive",
                    False,
                ),
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except CommercialCategoryLookupError:
            return Response(
                {"detail": "Could not retrieve commercial categories."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"categories": categories},
            status=status.HTTP_200_OK,
        )
