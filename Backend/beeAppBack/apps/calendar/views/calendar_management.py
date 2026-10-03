from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import (
    CalendarCreateError,
    CalendarDeleteError,
    CalendarError,
    CalendarNotFoundError,
    CalendarUpdateError,
)
from apps.calendar.serializers import (
    CalendarListQuerySerializer,
    CreateCalendarSerializer,
    UpdateCalendarSerializer,
)
from apps.calendar.services.calendar_service import (
    create_calendar,
    delete_calendar,
    list_calendars,
    update_calendar,
)

from .base import _unauthorized_response

class CalendarsView(AuthenticatedAPIView):
    def get(self, request):
        serializer = CalendarListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            calendars = list_calendars(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
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
            {
                "calendars": calendars,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CreateCalendarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            calendar = create_calendar(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarCreateError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "calendar": calendar,
            },
            status=status.HTTP_201_CREATED,
        )


class CalendarDetailView(AuthenticatedAPIView):
    def get(self, request, calendar_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            calendars = list_calendars(
                user_id=str(authenticated_user.id),
                include_archived=True,
            )

            calendar = next(
                (
                    item
                    for item in calendars
                    if str(item["id"]) == str(calendar_id)
                ),
                None,
            )

            if not calendar:
                raise CalendarNotFoundError(
                    "Calendar was not found."
                )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": "Calendar was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "calendar": calendar,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, calendar_id):
        serializer = UpdateCalendarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            calendar = update_calendar(
                user_id=str(authenticated_user.id),
                calendar_id=str(calendar_id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": "Calendar was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarUpdateError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "calendar": calendar,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, calendar_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            delete_calendar(
                user_id=str(authenticated_user.id),
                calendar_id=str(calendar_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": "Calendar was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarDeleteError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )
