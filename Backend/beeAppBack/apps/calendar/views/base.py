from rest_framework import status
from rest_framework.response import Response

def _unauthorized_response() -> Response:
    return Response(
        {
            "detail": "Invalid or expired access token.",
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )
