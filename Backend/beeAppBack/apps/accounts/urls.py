from django.urls import path

from apps.accounts.views import (
    LoginUserView,
    RegisterUserView,
)


urlpatterns = [
    path("register/", RegisterUserView.as_view(), name="register-user"),
    path("login/", LoginUserView.as_view(), name="login-user"),
]