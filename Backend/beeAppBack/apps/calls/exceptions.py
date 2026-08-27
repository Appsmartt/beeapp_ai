class CallError(Exception):
    """Base exception for the Calls domain."""

    default_code = "CALL_ERROR"

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: dict | list | str | None = None,
    ):
        self.code = code or self.default_code
        self.details = details

        super().__init__(
            message or "Call service request failed."
        )


class CallAuthenticationError(CallError):
    """Raised when a call operation lacks valid authentication."""

    default_code = "AUTHENTICATION_REQUIRED"


class CallAccessError(CallError):
    """Raised when the user cannot perform a call operation."""

    default_code = "NOT_AUTHORIZED"


class CallNotFoundError(CallError):
    """Raised when a call session cannot be found."""

    default_code = "CALL_NOT_FOUND"


class CallStateError(CallError):
    """Raised when the call state does not allow an operation."""

    default_code = "CALL_STATE_INVALID"


class CallValidationError(CallError):
    """Raised when call input is invalid."""

    default_code = "CALL_VALIDATION_ERROR"


class CallCapacityError(CallError):
    """Raised when a call has reached its participant capacity."""

    default_code = "CALL_FULL"


class CallTokenError(CallError):
    """Raised when an Agora RTC token cannot be generated."""

    default_code = "RTC_TOKEN_GENERATION_FAILED"
