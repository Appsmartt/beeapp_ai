from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


def _fingerprint(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()[:32]


def _request_identity_key(
    request,
    throttle_scope: str,
) -> str:
    authorization = str(
        request.headers.get("Authorization") or ""
    ).strip()

    if authorization:
        return (
            f"{throttle_scope}:authorization:"
            f"{_fingerprint(authorization)}"
        )

    session_token = str(
        request.COOKIES.get("beeapp_web_session") or ""
    ).strip()

    if session_token:
        return (
            f"{throttle_scope}:session:"
            f"{_fingerprint(session_token)}"
        )

    return (
        f"{throttle_scope}:ip:"
        f"{request.META.get('REMOTE_ADDR', '')}"
    )


class CommercialExploreThrottle(SimpleRateThrottle):
    scope = "commercial_explore"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class CommercialManageThrottle(SimpleRateThrottle):
    scope = "commercial_manage"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class CommercialRequestThrottle(SimpleRateThrottle):
    scope = "commercial_request"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class CommercialNegotiationThrottle(SimpleRateThrottle):
    scope = "commercial_negotiation"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class CommercialBookingThrottle(SimpleRateThrottle):
    scope = "commercial_booking"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class CommercialEvidenceThrottle(SimpleRateThrottle):
    scope = "commercial_evidence"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)


class CommercialDisputeThrottle(SimpleRateThrottle):
    scope = "commercial_dispute"

    def get_cache_key(self, request, view):
        return _request_identity_key(request, self.scope)
