from django.urls import path

from apps.notifications.views import (
    NotificationDetailView,
    NotificationListView,
    NotificationMarkAllReadView,
    PushDeviceView,
)


urlpatterns = [
    path(
        "",
        NotificationListView.as_view(),
        name="notification-list",
    ),
    path(
        "read-all/",
        NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "<uuid:notification_id>/read/",
        NotificationDetailView.as_view(),
        name="notification-read",
    ),
    path(
        "push-devices/",
        PushDeviceView.as_view(),
        name="push-device",
    ),
]