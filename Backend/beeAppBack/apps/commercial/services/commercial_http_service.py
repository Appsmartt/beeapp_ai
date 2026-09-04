from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialAuthenticationError,
    CommercialConflictError,
    CommercialError,
    CommercialNotFoundError,
    CommercialStateError,
    CommercialValidationError,
)


def commercial_error_response(error: CommercialError) -> Response:
    if isinstance(error, CommercialAuthenticationError):
        http_status = status.HTTP_401_UNAUTHORIZED
    elif isinstance(error, CommercialAccessError):
        http_status = status.HTTP_403_FORBIDDEN
    elif isinstance(error, CommercialNotFoundError):
        http_status = status.HTTP_404_NOT_FOUND
    elif isinstance(
        error,
        (
            CommercialConflictError,
            CommercialStateError,
        ),
    ):
        http_status = status.HTTP_409_CONFLICT
    elif isinstance(error, CommercialValidationError):
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
