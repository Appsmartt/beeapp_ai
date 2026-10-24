"""Focused account HTTP view modules."""

from apps.accounts.view_modules.authentication import (
    LoginUserView,
    PhoneOtpMobileVerifyView,
    PhoneOtpRequestView,
    PhoneOtpVerifyView,
    RegisterUserView,
    SessionRefreshView,
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

__all__ = [
    "AccountSecurityPinConfigureView",
    "AccountSecurityPinPasswordVerifyView",
    "AccountSecurityPinReplaceView",
    "AccountSecurityPinStatusView",
    "AccountSecurityPinVerifyView",
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
    "WebSessionActivateView",
    "WebSessionLogoutView",
    "WebSessionProfileView",
]
