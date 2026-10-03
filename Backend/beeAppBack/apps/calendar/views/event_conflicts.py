from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import CalendarError
from apps.calendar.serializers import CalendarConflictQuerySerializer
from apps.calendar.services.calendar_conflict_service import (
    find_calendar_conflicts,
)

from .base import _unauthorized_response

class CalendarConflictView(AuthenticatedAPIView):
    def get(self, request):
        serializer = CalendarConflictQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            conflict_data = find_calendar_conflicts(
                user_id=str(authenticated_user.id),
                starts_at=serializer.validated_data.get(
                    "starts_at"
                ),
                ends_at=serializer.validated_data.get(
                    "ends_at"
                ),
                starts_on=(
                    serializer.validated_data.get("starts_on")
                    .isoformat()
                    if serializer.validated_data.get(
                        "starts_on"
                    )
                    else None
                ),
                ends_on=(
                    serializer.validated_data.get("ends_on")
                    .isoformat()
                    if serializer.validated_data.get(
                        "ends_on"
                    )
                    else None
                ),
                is_all_day=serializer.validated_data[
                    "is_all_day"
                ],
                exclude_event_id=(
                    str(
                        serializer.validated_data[
                            "exclude_event_id"
                        ]
                    )
                    if serializer.validated_data.get(
                        "exclude_event_id"
                    )
                    else None
                ),
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
            conflict_data,
            status=status.HTTP_200_OK,
        )
