from __future__ import annotations

from hashlib import sha256

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.exceptions import AccountAuthenticationError
from apps.accounts.views import AuthenticatedAPIView
from apps.chat.exceptions import ChatIdentityNotFoundError
from apps.chat.services.chat_presence_service import (
    list_chat_inbox_presence,
    set_chat_identity_presence,
)


class ChatPresenceTokenThrottle(SimpleRateThrottle):
    scope = "chat_presence_token"
    rate = "30/min"

    def get_cache_key(self, request, view):
        authorization = request.headers.get(
            "Authorization", ""
        ).strip()

        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
            if token:
                identifier = sha256(
                    token.encode("utf-8")
                ).hexdigest()
                return self.cache_format % {
                    "scope": self.scope,
                    "ident": identifier,
                }

        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class ChatPresenceStateSerializer(serializers.Serializer):
    identity_id = serializers.UUIDField()
    online = serializers.BooleanField()


class ChatPresenceSnapshotSerializer(serializers.Serializer):
    viewer_identity_id = serializers.UUIDField()
    target_identity_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
        max_length=100,
    )


class ChatPresenceStateView(AuthenticatedAPIView):
    throttle_classes = [ChatPresenceTokenThrottle]

    def post(self, request):
        serializer = ChatPresenceStateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            user = self.get_authenticated_user(request)
            token = self.get_bearer_access_token(request)
            online = set_chat_identity_presence(
                user_id=str(user.id),
                access_token=token,
                identity_id=str(
                    serializer.validated_data["identity_id"]
                ),
                online=serializer.validated_data["online"],
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except ChatIdentityNotFoundError:
            return Response(
                {"detail": "Chat identity not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception:
            return Response(
                {"detail": "Chat presence unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"online": online},
            status=status.HTTP_200_OK,
        )


class ChatPresenceSnapshotView(AuthenticatedAPIView):
    throttle_classes = [ChatPresenceTokenThrottle]

    def post(self, request):
        serializer = ChatPresenceSnapshotSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        try:
            user = self.get_authenticated_user(request)
            token = self.get_bearer_access_token(request)
            rows = list_chat_inbox_presence(
                user_id=str(user.id),
                access_token=token,
                viewer_identity_id=str(
                    serializer.validated_data[
                        "viewer_identity_id"
                    ]
                ),
                target_identity_ids=[
                    str(identity_id)
                    for identity_id in serializer.validated_data[
                        "target_identity_ids"
                    ]
                ],
            )
        except AccountAuthenticationError:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except ChatIdentityNotFoundError:
            return Response(
                {"detail": "Chat identity not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception:
            return Response(
                {"detail": "Chat presence unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"presences": rows},
            status=status.HTTP_200_OK,
        )
