from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView

from apps.calendar.exceptions import CalendarError, CalendarNotFoundError
from apps.calendar.serializers import CreateCalendarShareSerializer
from apps.calendar.services.calendar_collaboration import (
    accept_calendar_share,
    create_calendar_share,
    list_calendar_shares,
    revoke_calendar_share,
)

from .base import _unauthorized_response

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
