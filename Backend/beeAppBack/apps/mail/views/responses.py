from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response


def unauthorized_response() -> Response:
    return Response(
        {"detail": "Invalid or expired access token."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def mail_error_response(
    error: Exception,
    *,
    response_status: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
    return Response(
        {"detail": str(error)},
        status=response_status,
    )
