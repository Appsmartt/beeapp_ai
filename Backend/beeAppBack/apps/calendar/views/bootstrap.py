from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import CalendarError
from apps.calendar.serializers import CalendarEventListQuerySerializer
from apps.calendar.services.calendar_service import get_calendar_bootstrap

from .base import _unauthorized_response

class CalendarBootstrapView(AuthenticatedAPIView):
    def get(self, request):
        serializer = CalendarEventListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            bootstrap = get_calendar_bootstrap(
                user_id=str(authenticated_user.id),
                range_start=serializer.validated_data[
                    "range_start"
                ],
                range_end=serializer.validated_data[
                    "range_end"
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            bootstrap,
            status=status.HTTP_200_OK,
        )
