from apps.accounts.services.account_security_pin_service import (
    account_security_pin_is_configured,
    configure_account_security_pin,
    replace_account_security_pin,
    verify_account_security_pin,
)
from apps.accounts.services.auth_session_service import (
    get_authenticated_user,
)
from apps.accounts.services.auth_user_service import (
    get_auth_user,
)
from apps.accounts.services.device_session_service import (
    create_or_replace_mobile_device_session,
    create_web_device_session,
    get_active_mobile_device_session_for_auth_session,
    get_active_session_by_token,
    get_user_device_sessions,
    refresh_mobile_device_session,
    revoke_all_user_device_sessions,
    revoke_device_session_by_id,
    update_device_metadata,
)
from apps.accounts.services.login_service import (
    login_with_email_password,
)
from apps.accounts.services.password_reset_service import (
    confirm_password_reset,
    request_password_reset,
    verify_password_reset_otp,
)
from apps.accounts.services.phone_otp_service import (
    request_phone_otp,
    verify_phone_otp,
)
from apps.accounts.services.profile_service import (
    get_profile,
    remove_profile_avatar,
    update_assistant_settings,
    update_onboarding_profile,
    update_profile_avatar,
)
from apps.accounts.services.qr_login_service import (
    approve_qr_login_challenge,
    consume_approved_qr_login_challenge,
    create_qr_login_challenge,
    get_qr_login_challenge,
)
from apps.accounts.services.registration_service import (
    create_complete_user,
)
from apps.accounts.services.session_refresh_service import (
    refresh_supabase_session,
)
from apps.accounts.view_modules.authentication import (
    LoginUserView,
    PhoneOtpMobileVerifyView,
    PhoneOtpRequestView,
    PhoneOtpVerifyView,
    RegisterUserView,
    SessionRefreshView,
)
from apps.accounts.view_modules.common import (
    AuthenticatedAPIView,
    WEB_SESSION_COOKIE_MAX_AGE_SECONDS,
    WEB_SESSION_COOKIE_NAME,
    is_local_development_request,
    normalize_phone,
    set_web_session_cookie,
)
from apps.accounts.view_modules.device_sessions import (
    DeviceSessionDetailView,
    DeviceSessionListView,
    RevokeAllDeviceSessionsView,
)
from apps.accounts.view_modules.password_reset import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
)
from apps.accounts.view_modules.profile import (
    CurrentProfileView,
    ProfileAvatarView,
    UpdateAssistantSettingsView,
    UpdateOnboardingProfileView,
)
from apps.accounts.view_modules.qr_login import (
    QrLoginChallengeDetailView,
    QrLoginChallengeView,
    QrLoginScanView,
)
from apps.accounts.view_modules.security_pin import (
    AccountSecurityPinConfigureView,
    AccountSecurityPinPasswordVerifyView,
    AccountSecurityPinReplaceView,
    AccountSecurityPinStatusView,
    AccountSecurityPinVerifyView,
)
from apps.accounts.view_modules.web_sessions import (
    WebSessionActivateView,
    WebSessionLogoutView,
    WebSessionProfileView,
)
from apps.notifications.services.notification_service import (
    send_mobile_session_revoked_push,
)


__all__ = [
    "AccountSecurityPinConfigureView",
    "AccountSecurityPinPasswordVerifyView",
    "AccountSecurityPinReplaceView",
    "AccountSecurityPinStatusView",
    "AccountSecurityPinVerifyView",
    "AuthenticatedAPIView",
    "CurrentProfileView",
    "DeviceSessionDetailView",
    "DeviceSessionListView",
    "LoginUserView",
    "PasswordResetConfirmView",
    "PasswordResetRequestView",
    "PasswordResetVerifyView",
    "PhoneOtpMobileVerifyView",
    "PhoneOtpRequestView",
    "PhoneOtpVerifyView",
    "ProfileAvatarView",
    "QrLoginChallengeDetailView",
    "QrLoginChallengeView",
    "QrLoginScanView",
    "RegisterUserView",
    "RevokeAllDeviceSessionsView",
    "SessionRefreshView",
    "UpdateAssistantSettingsView",
    "UpdateOnboardingProfileView",
    "WEB_SESSION_COOKIE_MAX_AGE_SECONDS",
    "WEB_SESSION_COOKIE_NAME",
    "WebSessionActivateView",
    "WebSessionLogoutView",
    "WebSessionProfileView",
    "is_local_development_request",
    "normalize_phone",
    "set_web_session_cookie",
]
