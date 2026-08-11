from django.urls import path

from apps.accounts.views import RegisterUserView


urlpatterns = [
    path("register/", RegisterUserView.as_view(), name="register-user"),
]
