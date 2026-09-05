class CommercialError(Exception):
    """Base exception for the commercial domain."""

    default_code = "COMMERCIAL_ERROR"

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
            message or "Commercial service request failed."
        )


class CommercialAuthenticationError(CommercialError):
    """Raised when a commercial operation lacks authentication."""

    default_code = "AUTHENTICATION_REQUIRED"


class CommercialAccessError(CommercialError):
    """Raised when the actor cannot access a commercial resource."""

    default_code = "COMMERCIAL_NOT_AUTHORIZED"


class CommercialNotFoundError(CommercialError):
    """Raised when a commercial resource is not found."""

    default_code = "COMMERCIAL_RESOURCE_NOT_FOUND"


class CommercialStateError(CommercialError):
    """Raised when a resource state does not allow an operation."""

    default_code = "COMMERCIAL_STATE_INVALID"


class CommercialValidationError(CommercialError):
    """Raised when a commercial payload or rule is invalid."""

    default_code = "COMMERCIAL_VALIDATION_ERROR"


class CommercialConflictError(CommercialError):
    """Raised when a commercial operation conflicts with current state."""

    default_code = "COMMERCIAL_CONFLICT"


class CommercialOperationError(CommercialError):
    """Raised when a commercial operation cannot be completed."""

    default_code = "COMMERCIAL_OPERATION_FAILED"


class CommercialCategoryLookupError(CommercialOperationError):
    """Raised when commercial categories cannot be retrieved."""

    default_code = "COMMERCIAL_CATEGORY_LOOKUP_FAILED"


class CommercialProfileNotFoundError(CommercialNotFoundError):
    """Raised when a commercial profile cannot be found or accessed."""

    default_code = "COMMERCIAL_PROFILE_NOT_FOUND"


class CommercialProfileCreateError(CommercialOperationError):
    """Raised when a commercial profile cannot be created."""

    default_code = "COMMERCIAL_PROFILE_CREATE_FAILED"


class CommercialProfileUpdateError(CommercialOperationError):
    """Raised when a commercial profile cannot be updated."""

    default_code = "COMMERCIAL_PROFILE_UPDATE_FAILED"


class CommercialProfileDeleteError(CommercialOperationError):
    """Raised when a commercial profile cannot be deleted."""

    default_code = "COMMERCIAL_PROFILE_DELETE_FAILED"


class CommercialProfileValidationError(CommercialValidationError):
    """Raised when profile business rules are not satisfied."""

    default_code = "COMMERCIAL_PROFILE_VALIDATION_FAILED"
