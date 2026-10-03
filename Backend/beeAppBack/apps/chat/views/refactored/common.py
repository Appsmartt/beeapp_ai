from rest_framework import status
from rest_framework.response import Response

from apps.accounts.exceptions import AccountAuthenticationError


def unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def conversation_not_found_response() -> Response:
    return Response(
        {
            "detail": "Conversation was not found.",
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def message_not_found_response() -> Response:
    return Response(
        {
            "detail": "Message was not found.",
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def group_not_found_response() -> Response:
    return Response(
        {
            "detail": "Group was not found.",
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def get_access_token(request) -> str:
    authorization_header = request.headers.get(
        "Authorization",
        "",
    ).strip()
    scheme, separator, token = authorization_header.partition(" ")

    if scheme.lower() != "bearer" or not separator or not token:
        raise AccountAuthenticationError(
            "Invalid or expired access token."
        )

    return token.strip()
