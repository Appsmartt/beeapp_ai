import ipaddress
import os

from rest_framework.throttling import SimpleRateThrottle


class TrustedClientIpThrottle(SimpleRateThrottle):
    fallback_ident = "unknown-client"
    def get_rate(self):
        return self.rate

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_client_ident(request),
        }

    def get_client_ident(self, request):
        remote_addr = self.get_valid_ip(
            request.META.get("REMOTE_ADDR")
        )
        trusted_proxy_count = self.get_trusted_proxy_count()

        if trusted_proxy_count == 0:
            return remote_addr or self.fallback_ident

        forwarded_for = request.META.get(
            "HTTP_X_FORWARDED_FOR",
            "",
        )
        forwarded_addresses = [
            self.get_valid_ip(value)
            for value in forwarded_for.split(",")
        ]

        if (
            len(forwarded_addresses) < trusted_proxy_count + 1
            or any(address is None for address in forwarded_addresses)
        ):
            return remote_addr or self.fallback_ident

        return forwarded_addresses[-(trusted_proxy_count + 1)]

    @staticmethod
    def get_valid_ip(value):
        if not value:
            return None

        try:
            return str(ipaddress.ip_address(value.strip()))
        except ValueError:
            return None

    @staticmethod
    def get_trusted_proxy_count():
        raw_value = os.getenv("NUM_PROXIES", "0").strip()

        try:
            return max(int(raw_value), 0)
        except ValueError:
            return 0


class PhoneOtpRequestThrottle(TrustedClientIpThrottle):
    scope = "phone_otp_request"
    rate = "3/min"


class PhoneOtpVerificationThrottle(TrustedClientIpThrottle):
    scope = "phone_otp_verification"
    rate = "5/min"


class PasswordResetRequestThrottle(TrustedClientIpThrottle):
    scope = "password_reset_request"
    rate = "3/min"


class PasswordResetVerificationThrottle(TrustedClientIpThrottle):
    scope = "password_reset_verification"
    rate = "5/min"


class PasswordResetConfirmationThrottle(TrustedClientIpThrottle):
    scope = "password_reset_confirmation"
    rate = "5/min"
