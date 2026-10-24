from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import (
    CalendarEventCreateError,
    CalendarEventDeleteError,
    CalendarEventNotFoundError,
    CalendarEventUpdateError,
    CalendarNotFoundError,
    CalendarTagNotFoundError,
)
from apps.calendar.serializers import (
    CalendarEventListQuerySerializer,
    CreateCalendarEventSerializer,
    DuplicateCalendarEventSerializer,
    UpdateCalendarEventSerializer,
)
from apps.calendar.services.calendar_service import (
    create_calendar_event,
    delete_calendar_event,
    duplicate_calendar_event,
    get_calendar_event_details,
    list_calendar_events,
    update_calendar_event,
)

from .base import _unauthorized_response

class CalendarEventsView(AuthenticatedAPIView):
    def get(self, request):
        serializer = CalendarEventListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            events = list_calendar_events(
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
            events,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CreateCalendarEventSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            event = create_calendar_event(
                user_id=str(authenticated_user.id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": "Calendar was not found or cannot "
                    "receive events.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarTagNotFoundError:
            return Response(
                {
                    "detail": (
                        "One or more calendar tags were not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarEventCreateError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "event": event,
            },
            status=status.HTTP_201_CREATED,
        )


class CalendarEventDetailView(AuthenticatedAPIView):
    def get(self, request, event_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            event = get_calendar_event_details(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": "Event was not found.",
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
                "event": event,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, event_id):
        serializer = UpdateCalendarEventSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            event = update_calendar_event(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": (
                        "Event was not found or cannot be modified."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarTagNotFoundError:
            return Response(
                {
                    "detail": (
                        "One or more calendar tags were not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except (
            CalendarEventUpdateError,
            CalendarNotFoundError,
        ) as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "event": event,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, event_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            delete_calendar_event(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": (
                        "Event was not found or cannot be deleted."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarEventDeleteError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class CalendarEventDuplicateView(AuthenticatedAPIView):
    def post(self, request, event_id):
        serializer = DuplicateCalendarEventSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            event = duplicate_calendar_event(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": (
                        "Event was not found or cannot be duplicated."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except (
            CalendarEventCreateError,
            CalendarNotFoundError,
        ) as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "event": event,
            },
            status=status.HTTP_201_CREATED,
        )
