from rest_framework import status
from rest_framework.response import Response

from apps.calls.exceptions import (
    CallAccessError,
    CallAuthenticationError,
    CallCapacityError,
    CallError,
    CallNotFoundError,
    CallStateError,
    CallTokenError,
    CallValidationError,
)


def unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def call_error_response(error: CallError) -> Response:
    if isinstance(error, CallNotFoundError):
        http_status = status.HTTP_404_NOT_FOUND
    elif isinstance(error, (CallAccessError, CallAuthenticationError)):
        http_status = status.HTTP_403_FORBIDDEN
    elif isinstance(error, (CallCapacityError, CallStateError)):
        http_status = status.HTTP_409_CONFLICT
    elif isinstance(error, CallTokenError):
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    elif isinstance(error, CallValidationError):
        http_status = status.HTTP_400_BAD_REQUEST
    else:
        http_status = status.HTTP_400_BAD_REQUEST

    return Response(
        {
            "code": error.code,
            "message": str(error),
            "details": error.details,
        },
        status=http_status,
    )
