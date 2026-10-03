import secrets

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AccountAuthenticationError,
    AccountLoginError,
    AccountLoginUnavailableError,
    AccountRegistrationError,
    DeviceSessionError,
    PhoneOtpRequestError,
    PhoneOtpVerificationError,
    ProfileLookupError,
)
from apps.accounts.serializers import (
    LoginUserSerializer,
    RefreshSessionSerializer,
    RequestPhoneOtpSerializer,
    RegisterUserSerializer,
    VerifyPhoneOtpSerializer,
)
from apps.accounts.throttles import (
    LoginUserThrottle,
    PhoneOtpRequestThrottle,
    PhoneOtpVerificationThrottle,
    RegisterUserThrottle,
    SessionRefreshThrottle,
)
from apps.accounts.view_modules.common import (
    normalize_phone,
    set_web_session_cookie,
)


def _compatibility_views():
    from apps.accounts import views

    return views


class RegisterUserView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterUserThrottle]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            created_user = _compatibility_views().create_complete_user(
                **serializer.validated_data
            )
        except AccountRegistrationError:
            return Response(
                {
                    "detail": (
                        "Could not create the account. "
                        "The email or phone number may already "
                        "be registered."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "BeeApp account created successfully.",
                "user": {
                    "id": created_user["auth_user_id"],
                    "email": created_user["email"],
                    "phone": created_user["phone"],
                    "first_name": created_user["profile"][
                        "first_name"
                    ],
                    "last_name": created_user["profile"][
                        "last_name"
                    ],
                    "phone_dial_code": created_user["profile"][
                        "phone_dial_code"
                    ],
                    "phone_number": created_user["profile"][
                        "phone_number"
                    ],
                    "role": created_user["profile"]["role"],
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginUserView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginUserThrottle]

    def post(self, request):
        serializer = LoginUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = (
                _compatibility_views().login_with_email_password(
                    **serializer.validated_data
                )
            )
        except AccountLoginUnavailableError:
            return Response(
                {
                    "detail": (
                        "Authentication service is temporarily "
                        "unavailable. Please try again."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except AccountLoginError:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            device_session = (
                _compatibility_views()
                .create_or_replace_mobile_device_session(
                    user_id=str(authenticated_user["user"]["id"]),
                    access_token=authenticated_user["session"][
                        "access_token"
                    ],
                    request=request,
                )
            )
        except DeviceSessionError:
            return Response(
                {
                    "detail": (
                        "Could not create the mobile device session."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        _compatibility_views().send_mobile_session_revoked_push(
            tokens=device_session.get("revoked_push_tokens") or [],
            revoked_device_session_ids=(
                device_session.get(
                    "revoked_device_session_ids"
                )
                or []
            ),
        )

        return Response(
            {
                "message": "Login successful.",
                "session": authenticated_user["session"],
                "user": authenticated_user["user"],
                "device_session_id": str(device_session["id"]),
            },
            status=status.HTTP_200_OK,
        )


class SessionRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [SessionRefreshThrottle]

    def post(self, request):
        serializer = RefreshSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refresh_token = serializer.validated_data.get(
                "refresh_token"
            )
            if refresh_token:
                session = _compatibility_views().refresh_supabase_session(
                    refresh_token=refresh_token,
                )
            else:
                session = _compatibility_views().refresh_mobile_device_session(
                    session_token=serializer.validated_data[
                        "session_token"
                    ],
                )
        except (AccountAuthenticationError, DeviceSessionError):
            return Response(
                {
                    "detail": (
                        "Session is invalid, expired, "
                        "or has been revoked."
                    ),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {"session": session},
            status=status.HTTP_200_OK,
        )


class PhoneOtpRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PhoneOtpRequestThrottle]

    def post(self, request):
        serializer = RequestPhoneOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            _compatibility_views().request_phone_otp(
                **serializer.validated_data
            )
        except PhoneOtpRequestError:
            pass

        return Response(
            {
                "message": (
                    "If the phone number is eligible, a verification "
                    "code has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class PhoneOtpVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PhoneOtpVerificationThrottle]

    def post(self, request):
        serializer = VerifyPhoneOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = _compatibility_views().verify_phone_otp(
                **serializer.validated_data
            )
            profile = _compatibility_views().get_profile(
                auth_user_id=str(authenticated_user.id),
            )
            session_token = secrets.token_urlsafe(48)
            device_session = _compatibility_views().create_web_device_session(
                user_id=str(authenticated_user.id),
                session_token=session_token,
            )
            _compatibility_views().update_device_metadata(
                device_id=device_session["id"],
                request=request,
            )
        except (PhoneOtpVerificationError, ProfileLookupError):
            return Response(
                {
                    "detail": (
                        "Invalid, expired, or unavailable code."
                    ),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except DeviceSessionError:
            return Response(
                {"detail": "Could not create the web session."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = Response(
            {
                "message": "Login successful.",
                "user": {
                    "id": str(authenticated_user.id),
                    "email": authenticated_user.email,
                    "phone": normalize_phone(authenticated_user.phone),
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "role": profile["role"],
                },
            },
            status=status.HTTP_200_OK,
        )
        set_web_session_cookie(
            response=response,
            request=request,
            session_token=session_token,
        )
        return response


class PhoneOtpMobileVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PhoneOtpVerificationThrottle]

    def post(self, request):
        serializer = VerifyPhoneOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            otp_result = _compatibility_views().verify_phone_otp(
                **serializer.validated_data
            )
            authenticated_user = otp_result["user"]
            profile = _compatibility_views().get_profile(
                auth_user_id=str(authenticated_user.id),
            )
            device_session = (
                _compatibility_views()
                .create_or_replace_mobile_device_session(
                    user_id=str(authenticated_user.id),
                    access_token=otp_result["session"]["access_token"],
                    request=request,
                )
            )
        except (PhoneOtpVerificationError, ProfileLookupError):
            return Response(
                {
                    "detail": (
                        "Invalid, expired, or unavailable code."
                    ),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except DeviceSessionError:
            return Response(
                {"detail": "Could not create the mobile session."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        _compatibility_views().send_mobile_session_revoked_push(
            tokens=device_session.get("revoked_push_tokens") or [],
            revoked_device_session_ids=(
                device_session.get(
                    "revoked_device_session_ids"
                )
                or []
            ),
        )

        return Response(
            {
                "message": "Login successful.",
                "session": otp_result["session"],
                "device_session_id": str(device_session["id"]),
                "user": {
                    "id": str(authenticated_user.id),
                    "email": authenticated_user.email,
                    "phone": normalize_phone(authenticated_user.phone),
                    "first_name": profile["first_name"],
                    "last_name": profile["last_name"],
                    "role": profile["role"],
                },
            },
            status=status.HTTP_200_OK,
        )
