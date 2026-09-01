from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


def _cache_identity_fingerprint(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()[:32]


def _request_identity_key(request, throttle_scope: str) -> str:
    authorization = str(
        request.headers.get("Authorization") or ""
    ).strip()

    if authorization:
        return (
            f"{throttle_scope}:authorization:"
            f"{_cache_identity_fingerprint(authorization)}"
        )

    session_token = str(
        request.COOKIES.get("beeapp_web_session") or ""
    ).strip()

    if session_token:
        return (
            f"{throttle_scope}:session:"
            f"{_cache_identity_fingerprint(session_token)}"
        )

    return (
        f"{throttle_scope}:ip:"
        f"{request.META.get('REMOTE_ADDR', '')}"
    )


class StatusUserThrottle(SimpleRateThrottle):
    scope = "status_user"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class StatusPublishThrottle(SimpleRateThrottle):
    scope = "status_publish"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class StatusMediaPublishThrottle(SimpleRateThrottle):
    scope = "status_media_publish"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class StatusViewThrottle(SimpleRateThrottle):
    scope = "status_view"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class StatusReplyThrottle(SimpleRateThrottle):
    scope = "status_reply"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)
