from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import (
    CalendarPreferencesError,
    CalendarTagError,
    CalendarTagNotFoundError,
    CalendarUserSearchError,
)
from apps.calendar.serializers import (
    CalendarUserSearchQuerySerializer,
    CreateCalendarTagSerializer,
    UpdateCalendarPreferencesSerializer,
    UpdateCalendarTagSerializer,
)
from apps.calendar.services.calendar_service import (
    create_calendar_tag,
    delete_calendar_tag,
    get_calendar_preferences,
    list_calendar_tags,
    search_beeapp_users,
    update_calendar_preferences,
    update_calendar_tag,
)

from .base import _unauthorized_response

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
