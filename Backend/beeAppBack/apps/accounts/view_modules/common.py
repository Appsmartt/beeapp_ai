from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    AuthUserLookupError,
    DeviceSessionError,
)


WEB_SESSION_COOKIE_NAME = "beeapp_web_session"
WEB_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    if phone.startswith("+"):
        return phone
    return f"+{phone}"


def is_local_development_request(request) -> bool:
    return request.get_host().startswith(
        ("localhost", "127.0.0.1", "192.168.")
    )


def set_web_session_cookie(*, response, request, session_token: str) -> None:
    response.set_cookie(
        WEB_SESSION_COOKIE_NAME,
        session_token,
        httponly=True,
        secure=not is_local_development_request(request),
        samesite="Lax",
        max_age=WEB_SESSION_COOKIE_MAX_AGE_SECONDS,
        path="/",
    )


class AuthenticatedAPIView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_user_from_session(
        self,
        *,
        session_token: str,
        request,
    ):
        from apps.accounts import views as compatibility_views

        try:
            device_session = compatibility_views.get_active_session_by_token(
                session_token=session_token,
            )
            compatibility_views.update_device_metadata(
                device_id=device_session["id"],
                request=request,
            )
            return compatibility_views.get_auth_user(
                auth_user_id=device_session["user_id"],
            )
        except (AuthUserLookupError, DeviceSessionError) as error:
            raise AccountAuthenticationError(
                "Session authentication failed."
            ) from error

    def get_authenticated_user(self, request):
        from apps.accounts import views as compatibility_views

        authorization_header = request.headers.get("Authorization", "")
        scheme, _, token = authorization_header.partition(" ")

        if scheme.lower() == "bearer" and token:
            try:
                authenticated_user = compatibility_views.get_authenticated_user(
                    access_token=token,
                )
                compatibility_views.get_active_mobile_device_session_for_auth_session(
                    user_id=str(authenticated_user.id),
                    access_token=token,
                )
                return authenticated_user
            except (
                AccountAuthenticationError,
                DeviceSessionError,
            ) as error:
                raise AuthenticationFailed(
                    "Authentication credentials were invalid or "
                    "the mobile session is no longer active."
                ) from error

        if scheme.lower() == "session" and token:
            return self.get_authenticated_user_from_session(
                session_token=token,
                request=request,
            )

        session_token = request.COOKIES.get(WEB_SESSION_COOKIE_NAME)
        if not session_token:
            raise AccountAuthenticationError(
                "Missing authentication credentials."
            )

        return self.get_authenticated_user_from_session(
            session_token=session_token,
            request=request,
        )

    def get_bearer_access_token(self, request) -> str:
        authorization_header = request.headers.get("Authorization", "")
        scheme, _, token = authorization_header.partition(" ")

        if scheme.lower() != "bearer" or not token:
            raise AccountAuthenticationError(
                "Bearer access token is required."
            )
        return token

    def get_authenticated_user_and_access_token(self, request):
        from apps.accounts import views as compatibility_views

        access_token = self.get_bearer_access_token(request)
        try:
            authenticated_user = compatibility_views.get_authenticated_user(
                access_token=access_token,
            )
            compatibility_views.get_active_mobile_device_session_for_auth_session(
                user_id=str(authenticated_user.id),
                access_token=access_token,
            )
            return authenticated_user, access_token
        except (
            AccountAuthenticationError,
            DeviceSessionError,
        ) as error:
            raise AuthenticationFailed(
                "Authentication credentials were invalid or "
                "the mobile session is no longer active."
            ) from error
