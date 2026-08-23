from django.urls import path

from apps.commercial.views import (
    CommercialCategoriesView,
    CommercialProfileDetailView,
    CommercialProfilesView,
)


urlpatterns = [
    path(
        "categories/",
        CommercialCategoriesView.as_view(),
        name="commercial-categories",
    ),
    path(
        "profiles/",
        CommercialProfilesView.as_view(),
        name="commercial-profiles",
    ),
    path(
        "profiles/<uuid:profile_id>/",
        CommercialProfileDetailView.as_view(),
        name="commercial-profile-detail",
    ),
]