from rest_framework.throttling import SimpleRateThrottle


def _request_identity_key(request, throttle_scope: str) -> str:
    authorization = str(
        request.headers.get("Authorization") or ""
    ).strip()

    if authorization:
        return f"{throttle_scope}:authorization:{authorization}"

    session_token = str(
        request.COOKIES.get("beeapp_web_session") or ""
    ).strip()

    if session_token:
        return f"{throttle_scope}:session:{session_token}"

    return f"{throttle_scope}:ip:{request.META.get('REMOTE_ADDR', '')}"


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
