class AccountError(Exception):
    """Base exception for account domain errors."""


class AccountRegistrationError(AccountError):
    """Raised when account registration fails."""


class AuthUserCreationError(AccountRegistrationError):
    """Raised when Supabase Auth user creation fails."""


class ProfileCreationError(AccountRegistrationError):
    """Raised when BeeApp profile creation fails."""


class AccountLoginError(AccountError):
    """Raised when email and password authentication fails."""