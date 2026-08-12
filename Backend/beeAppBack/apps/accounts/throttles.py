from rest_framework.throttling import SimpleRateThrottle


class PhoneOtpRequestThrottle(SimpleRateThrottle):
    scope = "phone_otp_request"
    rate = "3/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class PhoneOtpVerificationThrottle(SimpleRateThrottle):
    scope = "phone_otp_verification"
    rate = "5/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }