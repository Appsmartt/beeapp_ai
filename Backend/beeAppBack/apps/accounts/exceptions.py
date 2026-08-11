class AccountRegistrationError(Exception):
    """Base exception for account registration errors."""


class AuthUserCreationError(AccountRegistrationError):
    """Raised when Supabase Auth user creation fails."""


class ProfileCreationError(AccountRegistrationError):
    """Raised when BeeApp profile creation fails."""