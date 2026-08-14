from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.notifications.exceptions import (
    NotificationLookupError,
    NotificationUpdateError,
    PushDeviceError,
)
from apps.notifications.serializers import (
    NotificationListQuerySerializer,
    RegisterPushDeviceSerializer,
)
from apps.notifications.services.notification_service import (
    get_unread_notification_count,
    list_notifications,
    mark_all_notifications_as_read,
    mark_notification_as_read,
    register_push_device,
)


class NotificationListView(AuthenticatedAPIView):
    def get(self, request):
        serializer = NotificationListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)
            user_id = str(authenticated_user.id)

            notifications = list_notifications(
                recipient_id=user_id,
                **serializer.validated_data,
            )

            unread_count = get_unread_notification_count(
                recipient_id=user_id,
                module=serializer.validated_data.get("module"),
            )

        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NotificationLookupError:
            return Response(
                {"detail": "Could not retrieve notifications."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                **notifications,
                "unread_count": unread_count,
            },
            status=status.HTTP_200_OK,
        )


class NotificationDetailView(AuthenticatedAPIView):
    def post(self, request, notification_id):
        try:
            authenticated_user = self.get_authenticated_user(request)

            notification = mark_notification_as_read(
                recipient_id=str(authenticated_user.id),
                notification_id=str(notification_id),
            )

        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NotificationUpdateError:
            return Response(
                {"detail": "Notification was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"notification": notification},
            status=status.HTTP_200_OK,
        )


class NotificationMarkAllReadView(AuthenticatedAPIView):
    def post(self, request):
        serializer = NotificationListQuerySerializer(
            data=request.query_params,
        )
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            updated_count = mark_all_notifications_as_read(
                recipient_id=str(authenticated_user.id),
                module=serializer.validated_data.get("module"),
            )

        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except NotificationUpdateError:
            return Response(
                {"detail": "Could not update notifications."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Notifications marked as read.",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )


class PushDeviceView(AuthenticatedAPIView):
    def post(self, request):
        serializer = RegisterPushDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = self.get_authenticated_user(request)

            device = register_push_device(
                user_id=str(authenticated_user.id),
                **serializer.validated_data,
            )

        except AccountAuthenticationError:
            return Response(
                {"detail": "Invalid or expired access token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        except PushDeviceError:
            return Response(
                {"detail": "Could not register push device."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"device": device},
            status=status.HTTP_201_CREATED,
        )