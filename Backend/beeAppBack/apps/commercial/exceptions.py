class CommercialError(Exception):
    """Base exception for commercial profile domain errors."""


class CommercialCategoryLookupError(CommercialError):
    """Raised when commercial categories cannot be retrieved."""


class CommercialProfileNotFoundError(CommercialError):
    """Raised when a commercial profile cannot be found or accessed."""


class CommercialProfileCreateError(CommercialError):
    """Raised when a commercial profile cannot be created."""


class CommercialProfileUpdateError(CommercialError):
    """Raised when a commercial profile cannot be updated."""


class CommercialProfileDeleteError(CommercialError):
    """Raised when a commercial profile cannot be deleted."""


class CommercialProfileValidationError(CommercialError):
    """Raised when profile business rules are not satisfied."""