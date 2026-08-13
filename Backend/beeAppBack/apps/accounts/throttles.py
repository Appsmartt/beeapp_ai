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


class PasswordResetRequestThrottle(SimpleRateThrottle):
    scope = "password_reset_request"
    rate = "3/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class PasswordResetVerificationThrottle(SimpleRateThrottle):
    scope = "password_reset_verification"
    rate = "5/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class PasswordResetConfirmationThrottle(SimpleRateThrottle):
    scope = "password_reset_confirmation"
    rate = "5/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }