from django.urls import path

from apps.statuses.views import (
    StatusFollowAcceptView,
    StatusFollowDetailView,
    StatusFollowDiscoverView,
    StatusFollowRejectView,
    StatusFollowersView,
    StatusFollowingView,
    StatusFollowRequestsView,
    StatusFollowsView,
    StatusTextBackgroundsView,
)


app_name = "statuses"

urlpatterns = [
    path(
        "text-backgrounds/",
        StatusTextBackgroundsView.as_view(),
        name="status-text-backgrounds",
    ),
    path(
        "follows/",
        StatusFollowsView.as_view(),
        name="status-follows",
    ),
    path(
        "follows/discover/",
        StatusFollowDiscoverView.as_view(),
        name="status-follow-discover",
    ),
    path(
        "follows/following/",
        StatusFollowingView.as_view(),
        name="status-following",
    ),
    path(
        "follows/followers/",
        StatusFollowersView.as_view(),
        name="status-followers",
    ),
    path(
        "follows/requests/",
        StatusFollowRequestsView.as_view(),
        name="status-follow-requests",
    ),
    path(
        "follows/<uuid:follow_id>/accept/",
        StatusFollowAcceptView.as_view(),
        name="status-follow-accept",
    ),
    path(
        "follows/<uuid:follow_id>/reject/",
        StatusFollowRejectView.as_view(),
        name="status-follow-reject",
    ),
    path(
        "follows/<uuid:follow_id>/",
        StatusFollowDetailView.as_view(),
        name="status-follow-detail",
    ),
]
