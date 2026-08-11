from django.urls import path

from apps.accounts.views import (
    CurrentProfileView,
    LoginUserView,
    RegisterUserView,
    UpdateAssistantSettingsView,
    UpdateOnboardingProfileView,
)


urlpatterns = [
    path("register/", RegisterUserView.as_view(), name="register-user"),
    path("login/", LoginUserView.as_view(), name="login-user"),
    path("me/", CurrentProfileView.as_view(), name="current-profile"),
    path(
        "me/profile/",
        UpdateOnboardingProfileView.as_view(),
        name="update-onboarding-profile",
    ),
    path(
        "me/assistant/",
        UpdateAssistantSettingsView.as_view(),
        name="update-assistant-settings",
    ),
]