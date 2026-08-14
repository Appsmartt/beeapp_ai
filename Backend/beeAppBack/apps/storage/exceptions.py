class StorageError(Exception):
    """Base exception for storage domain errors."""


class StorageQuotaExceededError(StorageError):
    """Raised when the user does not have enough storage quota."""


class StorageUploadError(StorageError):
    """Raised when a file upload cannot be completed."""


class StorageFileNotFoundError(StorageError):
    """Raised when a file is not found or inaccessible."""


class StorageFolderNotFoundError(StorageError):
    """Raised when a folder is not found or inaccessible."""


class StorageFolderError(StorageError):
    """Raised when a folder operation fails."""


class StorageAccessError(StorageError):
    """Raised when signed access cannot be created."""


class StorageFileOperationError(StorageError):
    """Raised when a file operation fails."""


class StorageTagError(StorageError):
    """Raised when a tag operation fails."""


class StorageTagNotFoundError(StorageTagError):
    """Raised when a tag is not found or inaccessible."""


class StorageShareError(StorageError):
    """Raised when a sharing operation fails."""


class StorageShareNotFoundError(StorageShareError):
    """Raised when a share is not found or inaccessible."""


class StorageRecipientNotFoundError(StorageShareError):
    """Raised when a share recipient cannot be found."""