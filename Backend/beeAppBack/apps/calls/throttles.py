from rest_framework.throttling import SimpleRateThrottle


class CallUserRateThrottle(SimpleRateThrottle):
    scope = "call_user"
    rate = "120/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class CallStartThrottle(SimpleRateThrottle):
    scope = "call_start"
    rate = "12/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class CallJoinThrottle(SimpleRateThrottle):
    scope = "call_join"
    rate = "30/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


class CallMutationThrottle(SimpleRateThrottle):
    scope = "call_mutation"
    rate = "60/min"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }
