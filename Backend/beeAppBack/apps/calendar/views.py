from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.calendar.exceptions import (
    CalendarCreateError,
    CalendarDeleteError,
    CalendarError,
    CalendarEventCreateError,
    CalendarEventDeleteError,
    CalendarEventNotFoundError,
    CalendarEventUpdateError,
    CalendarNotFoundError,
    CalendarPreferencesError,
    CalendarTagError,
    CalendarTagNotFoundError,
    CalendarUpdateError,
    CalendarUserSearchError,
)
from apps.calendar.services.calendar_integration_service import (
    get_calendar_integration,
    list_calendar_integrations,
)
from apps.calendar.services.calendar_sync_service import (
    sync_calendar_integration,
)
from apps.calendar.serializers import (
    CalendarConflictQuerySerializer,
    CalendarEventListQuerySerializer,
    CalendarIntegrationListQuerySerializer,
    CalendarListQuerySerializer,
    CalendarUserSearchQuerySerializer,
    CalendarIntegrationSyncRequestSerializer,
    CreateCalendarEventSerializer,
    CreateCalendarSerializer,
    CreateCalendarShareSerializer,
    CreateCalendarTagSerializer,
    CreateInviteeRequestSerializer,
    DeclinedEventVisibilitySerializer,
    DuplicateCalendarEventSerializer,
    EventRsvpSerializer,
    RemoveEventAttendeeSerializer,
    ReviewInviteeRequestSerializer,
    UpdateCalendarEventSerializer,
    UpdateCalendarPreferencesSerializer,
    UpdateCalendarSerializer,
    UpdateCalendarTagSerializer,
    UpdateExternalCalendarPreferencesSerializer,
)
from apps.calendar.services.calendar_external_calendar_service import (
    discover_external_calendars,
    list_external_calendars,
    update_external_calendar_preferences,
)
from apps.calendar.services.calendar_collaboration_service import (
    accept_calendar_share,
    create_calendar_share,
    create_invitee_request,
    list_calendar_shares,
    list_event_attendees,
    list_event_invitee_requests,
    remove_event_attendee,
    respond_to_event_invitation,
    review_invitee_request,
    revoke_calendar_share,
    set_declined_event_hidden,
)
from apps.calendar.services.calendar_conflict_service import (
    find_calendar_conflicts,
)
from apps.calendar.services.calendar_service import (
    create_calendar,
    create_calendar_event,
    create_calendar_tag,
    delete_calendar,
    delete_calendar_event,
    delete_calendar_tag,
    duplicate_calendar_event,
    get_calendar_bootstrap,
    get_calendar_event_details,
    get_calendar_preferences,
    list_calendar_events,
    list_calendar_tags,
    list_calendars,
    search_beeapp_users,
    update_calendar,
    update_calendar_event,
    update_calendar_preferences,
    update_calendar_tag,
)


def _unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


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


class CalendarTagsView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            tags = list_calendar_tags(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarTagError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tags": tags,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = CreateCalendarTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            tag = create_calendar_tag(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarTagError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tag": tag,
            },
            status=status.HTTP_201_CREATED,
        )


class CalendarTagDetailView(AuthenticatedAPIView):
    def patch(self, request, tag_id):
        serializer = UpdateCalendarTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            tag = update_calendar_tag(
                user_id=str(authenticated_user.id),
                tag_id=str(tag_id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarTagNotFoundError:
            return Response(
                {
                    "detail": "Calendar tag was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarTagError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "tag": tag,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, tag_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            delete_calendar_tag(
                user_id=str(authenticated_user.id),
                tag_id=str(tag_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarTagNotFoundError:
            return Response(
                {
                    "detail": "Calendar tag was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except CalendarTagError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class CalendarPreferencesView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            preferences = get_calendar_preferences(
                user_id=str(authenticated_user.id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarPreferencesError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "preferences": preferences,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        serializer = UpdateCalendarPreferencesSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            preferences = update_calendar_preferences(
                user_id=str(authenticated_user.id),
                payload=serializer.validated_data,
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarPreferencesError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "preferences": preferences,
            },
            status=status.HTTP_200_OK,
        )


class CalendarUsersSearchView(AuthenticatedAPIView):
    def get(self, request):
        serializer = CalendarUserSearchQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            users = search_beeapp_users(
                user_id=str(authenticated_user.id),
                query=serializer.validated_data["q"],
                limit=serializer.validated_data["limit"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarUserSearchError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "users": users,
            },
            status=status.HTTP_200_OK,
        )


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


class CalendarSharesView(AuthenticatedAPIView):
    def get(self, request, calendar_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            shares = list_calendar_shares(
                user_id=str(authenticated_user.id),
                calendar_id=str(calendar_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": (
                        "Calendar was not found or cannot be managed."
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
                "shares": shares,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, calendar_id):
        serializer = CreateCalendarShareSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            share = create_calendar_share(
                user_id=str(authenticated_user.id),
                calendar_id=str(calendar_id),
                shared_with_user_id=str(
                    serializer.validated_data[
                        "shared_with_user_id"
                    ]
                ),
                permission=serializer.validated_data["permission"],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": (
                        "Calendar was not found or cannot be shared."
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
                "share": share,
            },
            status=status.HTTP_201_CREATED,
        )


class CalendarShareAcceptView(AuthenticatedAPIView):
    def post(self, request, share_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            share = accept_calendar_share(
                user_id=str(authenticated_user.id),
                share_id=str(share_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": (
                        "Calendar share invitation was not found."
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
                "share": share,
            },
            status=status.HTTP_200_OK,
        )


class CalendarShareDetailView(AuthenticatedAPIView):
    def post(self, request, share_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            share = revoke_calendar_share(
                user_id=str(authenticated_user.id),
                share_id=str(share_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarNotFoundError:
            return Response(
                {
                    "detail": (
                        "Calendar share was not found or cannot be "
                        "revoked."
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
                "share": share,
            },
            status=status.HTTP_200_OK,
        )

class CalendarIntegrationsView(AuthenticatedAPIView):
    def get(self, request):
        serializer = CalendarIntegrationListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            integrations = list_calendar_integrations(
                user_id=str(authenticated_user.id),
            )

            provider = serializer.validated_data.get("provider")

            if provider:
                integrations = [
                    integration
                    for integration in integrations
                    if integration["provider"] == provider
                ]

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
                "integrations": integrations,
            },
            status=status.HTTP_200_OK,
        )


class CalendarIntegrationDetailView(
    AuthenticatedAPIView,
):
    def get(self, request, integration_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            integration = get_calendar_integration(
                user_id=str(authenticated_user.id),
                integration_id=str(integration_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarError as error:
            detail = str(error)

            if detail == "Calendar integration was not found.":
                return Response(
                    {
                        "detail": detail,
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "detail": detail,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "integration": integration,
            },
            status=status.HTTP_200_OK,
        )

class CalendarIntegrationExternalCalendarsView(
    AuthenticatedAPIView,
):
    def get(self, request, integration_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            external_calendars = list_external_calendars(
                user_id=str(authenticated_user.id),
                integration_id=str(integration_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarError as error:
            detail = str(error)

            return Response(
                {
                    "detail": detail,
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                    if detail == "Calendar integration was not found."
                    else status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            {
                "external_calendars": external_calendars,
            },
            status=status.HTTP_200_OK,
        )


class CalendarIntegrationDiscoverCalendarsView(
    AuthenticatedAPIView,
):
    def post(self, request, integration_id):
        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            result = discover_external_calendars(
                user_id=str(authenticated_user.id),
                integration_id=str(integration_id),
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarError as error:
            detail = str(error)

            return Response(
                {
                    "detail": detail,
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                    if detail == "Calendar integration was not found."
                    else status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )

class CalendarIntegrationSyncView(
    AuthenticatedAPIView,
):
    def post(self, request, integration_id):
        serializer = CalendarIntegrationSyncRequestSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            result = sync_calendar_integration(
                user_id=str(authenticated_user.id),
                integration_id=str(integration_id),
                force_full_sync=serializer.validated_data[
                    "force_full_sync"
                ],
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarError as error:
            detail = str(error)

            return Response(
                {
                    "detail": detail,
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                    if detail
                    == "Calendar integration was not found."
                    else status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


class CalendarExternalCalendarDetailView(
    AuthenticatedAPIView,
):
    def patch(self, request, external_calendar_id):
        serializer = UpdateExternalCalendarPreferencesSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(
                request
            )

            external_calendar = (
                update_external_calendar_preferences(
                    user_id=str(authenticated_user.id),
                    external_calendar_id=str(
                        external_calendar_id
                    ),
                    **serializer.validated_data,
                )
            )

        except AccountAuthenticationError:
            return _unauthorized_response()

        except CalendarError as error:
            detail = str(error)

            return Response(
                {
                    "detail": detail,
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                    if detail
                    in {
                        "External calendar was not found.",
                        "Calendar integration was not found.",
                    }
                    else status.HTTP_400_BAD_REQUEST
                ),
            )

        return Response(
            {
                "external_calendar": external_calendar,
            },
            status=status.HTTP_200_OK,
        )