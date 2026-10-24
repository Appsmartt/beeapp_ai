from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError
from apps.statuses.exceptions import (
    StatusAccessError,
    StatusArchiveError,
    StatusFollowAccessError,
    StatusFollowNotFoundError,
    StatusFollowValidationError,
    StatusMediaError,
    StatusNotFoundError,
    StatusOperationError,
    StatusReplyError,
    StatusValidationError,
    StatusViewError,
    StatusViewerAccessError,
)


def unauthorized_response():
    return Response(
        {"detail": "Invalid or expired access token."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def follow_error_response(error):
    if isinstance(error, StatusFollowNotFoundError):
        return Response(
            {"detail": "Follow relationship was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if isinstance(error, StatusFollowAccessError):
        return Response(
            {"detail": str(error)},
            status=status.HTTP_403_FORBIDDEN,
        )
    if isinstance(error, StatusFollowValidationError):
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {"detail": str(error)},
        status=status.HTTP_400_BAD_REQUEST,
    )


def status_error_response(error):
    if isinstance(error, StatusNotFoundError):
        return Response(
            {"detail": str(error)},
            status=status.HTTP_404_NOT_FOUND,
        )
    if isinstance(error, (StatusAccessError, StatusViewerAccessError)):
        return Response(
            {"detail": str(error)},
            status=status.HTTP_403_FORBIDDEN,
        )
    if isinstance(error, StatusArchiveError):
        return Response(
            {"detail": str(error)},
            status=status.HTTP_403_FORBIDDEN,
        )
    if isinstance(error, (StatusValidationError, StatusMediaError, StatusViewError, StatusReplyError, StatusOperationError)):
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {"detail": "Could not complete status operation."},
        status=status.HTTP_400_BAD_REQUEST,
    )


def get_required_bearer_token(request) -> str:
    authorization_header = str(request.headers.get("Authorization") or "").strip()
    scheme, separator, token = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token:
        raise AccountAuthenticationError("A Bearer access token is required.")
    return token.strip()
