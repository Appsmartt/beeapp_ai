class AccountError(Exception):
    """Base exception for account domain errors."""


class AccountRegistrationError(AccountError):
    """Raised when account registration fails."""


class AuthUserCreationError(AccountRegistrationError):
    """Raised when Supabase Auth user creation fails."""


class AuthUserLookupError(AccountError):
    """Raised when a Supabase Auth user cannot be retrieved."""


class AuthUserPasswordUpdateError(AccountError):
    """Raised when a Supabase Auth password update fails."""


class ProfileCreationError(AccountRegistrationError):
    """Raised when BeeApp profile creation fails."""


class AccountLoginError(AccountError):
    """Raised when email and password authentication fails."""


class PhoneOtpRequestError(AccountError):
    """Raised when a phone OTP cannot be requested."""


class PhoneOtpVerificationError(AccountError):
    """Raised when a phone OTP cannot be verified."""


class PasswordResetRequestError(AccountError):
    """Raised when a password reset OTP cannot be requested."""


class PasswordResetVerificationError(AccountError):
    """Raised when a password reset OTP cannot be verified."""


class PasswordResetTokenError(AccountError):
    """Raised when a password reset token is invalid or expired."""


class PasswordResetConfirmationError(AccountError):
    """Raised when a password reset cannot be completed."""


class AccountAuthenticationError(AccountError):
    """Raised when access token authentication fails."""


class ProfileLookupError(AccountError):
    """Raised when a profile cannot be retrieved."""


class ProfileUpdateError(AccountError):
    """Raised when a profile cannot be updated."""


class AssistantSettingsUpdateError(AccountError):
    """Raised when assistant settings cannot be updated."""


class DeviceSessionError(AccountError):
    """Raised when a device session cannot be created or accessed."""


class QrLoginError(AccountError):
    """Raised when a QR login challenge is invalid or expired."""