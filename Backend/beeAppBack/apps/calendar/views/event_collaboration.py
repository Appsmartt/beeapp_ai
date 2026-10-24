from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import (
    CalendarError,
    CalendarEventNotFoundError,
)
from apps.calendar.serializers import (
    CreateInviteeRequestSerializer,
    DeclinedEventVisibilitySerializer,
    EventRsvpSerializer,
    RemoveEventAttendeeSerializer,
    ReviewInviteeRequestSerializer,
)
from apps.calendar.services.calendar_collaboration import (
    create_invitee_request,
    list_event_attendees,
    list_event_invitee_requests,
    remove_event_attendee,
    respond_to_event_invitation,
    review_invitee_request,
    set_declined_event_hidden,
)

from .base import _unauthorized_response

class CalendarEventAttendeesView(AuthenticatedAPIView):
    def get(self, request, event_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            attendees = list_event_attendees(
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
                "attendees": attendees,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, event_id):
        serializer = RemoveEventAttendeeSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            attendee = remove_event_attendee(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
                attendee_user_id=str(
                    serializer.validated_data[
                        "attendee_user_id"
                    ]
                ),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": (
                        "Event or attendee was not found or "
                        "cannot be managed."
                    ),
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
                "attendee": attendee,
            },
            status=status.HTTP_200_OK,
        )


class CalendarEventRsvpView(AuthenticatedAPIView):
    def post(self, request, event_id):
        serializer = EventRsvpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            attendee = respond_to_event_invitation(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
                response_status=serializer.validated_data[
                    "response_status"
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": "Event invitation was not found.",
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
                "attendee": attendee,
            },
            status=status.HTTP_200_OK,
        )


class DeclinedEventVisibilityView(AuthenticatedAPIView):
    def patch(self, request, event_id):
        serializer = DeclinedEventVisibilitySerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            attendee = set_declined_event_hidden(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
                hidden=serializer.validated_data["hidden"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": "Declined event was not found.",
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
                "attendee": attendee,
            },
            status=status.HTTP_200_OK,
        )


class CalendarEventInviteeRequestsView(
    AuthenticatedAPIView,
):
    def get(self, request, event_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            requests = list_event_invitee_requests(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": (
                        "Event was not found or cannot be managed."
                    ),
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
                "invitee_requests": requests,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, event_id):
        serializer = CreateInviteeRequestSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            invitee_request = create_invitee_request(
                user_id=str(authenticated_user.id),
                event_id=str(event_id),
                requested_user_id=str(
                    serializer.validated_data[
                        "requested_user_id"
                    ]
                ),
                note=serializer.validated_data.get("note"),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": (
                        "Event was not found or you must accept "
                        "the invitation first."
                    ),
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
                "invitee_request": invitee_request,
            },
            status=status.HTTP_201_CREATED,
        )


class CalendarInviteeRequestDetailView(
    AuthenticatedAPIView,
):
    def post(self, request, request_id):
        serializer = ReviewInviteeRequestSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            invitee_request = review_invitee_request(
                user_id=str(authenticated_user.id),
                request_id=str(request_id),
                approved=serializer.validated_data["approved"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarEventNotFoundError:
            return Response(
                {
                    "detail": (
                        "Event was not found or cannot be managed."
                    ),
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
                "invitee_request": invitee_request,
            },
            status=status.HTTP_200_OK,
        )
