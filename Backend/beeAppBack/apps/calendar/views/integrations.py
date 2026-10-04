from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import CalendarError
from apps.calendar.serializers import (
    CalendarIntegrationListQuerySerializer,
    CalendarIntegrationSyncRequestSerializer,
    UpdateExternalCalendarPreferencesSerializer,
)
from apps.calendar.services.calendar_external_calendar_service import (
    discover_external_calendars,
    list_external_calendars,
    update_external_calendar_preferences,
)
from apps.calendar.services.calendar_integration_service import (
    get_calendar_integration,
    list_calendar_integrations,
)
from apps.calendar.services.calendar_sync import (
    sync_calendar_integration,
)

from .base import _unauthorized_response

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
