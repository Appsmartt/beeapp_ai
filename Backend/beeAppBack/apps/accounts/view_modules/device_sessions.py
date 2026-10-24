from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    DeviceSessionError,
)
from apps.accounts.view_modules.common import AuthenticatedAPIView


def _compatibility_views():
    from apps.accounts import views

    return views


class DeviceSessionListView(AuthenticatedAPIView):
    def get(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)
            devices = _compatibility_views().get_user_device_sessions(
                user_id=str(authenticated_user.id),
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except DeviceSessionError:
            return Response(
                {"detail": "Could not retrieve devices."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"devices": devices},
            status=status.HTTP_200_OK,
        )


class DeviceSessionDetailView(AuthenticatedAPIView):
    def delete(self, request, device_id):
        try:
            authenticated_user = self.get_authenticated_user(request)
            _compatibility_views().revoke_device_session_by_id(
                device_id=str(device_id),
                user_id=str(authenticated_user.id),
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except DeviceSessionError:
            return Response(
                {"detail": "Could not close device session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class RevokeAllDeviceSessionsView(AuthenticatedAPIView):
    def delete(self, request):
        try:
            authenticated_user = self.get_authenticated_user(request)
            _compatibility_views().revoke_all_user_device_sessions(
                user_id=str(authenticated_user.id),
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except DeviceSessionError:
            return Response(
                {"detail": "Could not close device sessions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
