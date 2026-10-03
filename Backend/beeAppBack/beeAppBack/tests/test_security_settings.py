import os
import subprocess
import sys
from pathlib import Path

from django.test import TestCase, override_settings
from django.urls import resolve


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class DjangoSecuritySettingsTests(TestCase):
    def test_production_security_settings_are_enabled(self):
        from django.conf import settings

        self.assertFalse(settings.DEBUG)
        self.assertEqual(
            settings.SECURE_PROXY_SSL_HEADER,
            ("HTTP_X_FORWARDED_PROTO", "https"),
        )
        self.assertTrue(settings.SECURE_SSL_REDIRECT)
        self.assertEqual(settings.SECURE_HSTS_SECONDS, 31_536_000)
        self.assertTrue(settings.SECURE_HSTS_INCLUDE_SUBDOMAINS)
        self.assertTrue(settings.SECURE_HSTS_PRELOAD)
        self.assertTrue(settings.SESSION_COOKIE_SECURE)
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, "Lax")
        self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertEqual(settings.CSRF_COOKIE_SAMESITE, "Lax")
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(settings.SECURE_REFERRER_POLICY, "same-origin")
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")

    def test_admin_route_remains_resolvable(self):
        match = resolve("/admin/")
        self.assertEqual(match.namespace, "admin")

    def test_security_middleware_trusts_forwarded_https(self):
        response = self.client.get(
            "/api/health/",
            HTTP_X_FORWARDED_PROTO="https",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(
            response["Strict-Transport-Security"],
            "max-age=31536000; includeSubDomains; preload",
        )
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response["Referrer-Policy"], "same-origin")
        self.assertEqual(response["X-Frame-Options"], "DENY")

    def test_http_request_redirects_in_production(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 301)
        self.assertEqual(
            response["Location"],
            "https://testserver/api/health/",
        )

    def test_explicit_development_mode_disables_transport_enforcement(self):
        with override_settings(
            DEBUG=True,
            SECURE_SSL_REDIRECT=False,
            SECURE_HSTS_SECONDS=0,
            SECURE_HSTS_INCLUDE_SUBDOMAINS=False,
            SECURE_HSTS_PRELOAD=False,
            SESSION_COOKIE_SECURE=False,
            CSRF_COOKIE_SECURE=False,
        ):
            response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("Strict-Transport-Security", response)

    def test_web_session_cookie_is_secure_outside_local_development(self):
        from apps.accounts.views import set_web_session_cookie
        from rest_framework.response import Response
        from rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get(
            "/api/accounts/web-session/activate/",
            HTTP_HOST="beeappai-production.up.railway.app",
        )
        response = Response(status=204)

        set_web_session_cookie(
            response=response,
            request=request,
            session_token="test-session-token",
        )

        cookie = response.cookies["beeapp_web_session"]
        self.assertTrue(cookie["secure"])
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["path"], "/")

    def test_web_session_cookie_remains_usable_in_explicit_local_development(self):
        from apps.accounts.views import set_web_session_cookie
        from rest_framework.response import Response
        from rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get(
            "/api/accounts/web-session/activate/",
            HTTP_HOST="localhost:8000",
        )
        response = Response(status=204)

        set_web_session_cookie(
            response=response,
            request=request,
            session_token="test-session-token",
        )

        cookie = response.cookies["beeapp_web_session"]
        self.assertEqual(cookie["secure"], "")
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["path"], "/")

    def test_oauth_callback_cookie_is_secure_outside_local_development(self):
        from apps.integrations.views import (
            OAUTH_CALLBACK_COOKIE_PREFIX,
            _set_callback_cookie,
        )
        from django.http import HttpResponse
        from rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get(
            "/api/integrations/oauth/browser-start/",
            HTTP_HOST="beeappai-production.up.railway.app",
        )
        response = HttpResponse()
        oauth_request = {
            "id": "security-test-request",
            "browser_binding_secret": "security-test-secret",
        }

        _set_callback_cookie(response, request, oauth_request)

        cookie_name = (
            f"{OAUTH_CALLBACK_COOKIE_PREFIX}security-test-request"
        )
        cookie = response.cookies[cookie_name]
        self.assertTrue(cookie["secure"])
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")

    def test_production_settings_survive_repeated_import_cycles(self):
        environment = os.environ.copy()
        environment["DEBUG"] = "False"
        command = [
            sys.executable,
            "-c",
            (
                "import os; "
                "os.environ.setdefault('DJANGO_SETTINGS_MODULE', "
                "'beeAppBack.settings'); "
                "import django; django.setup(); "
                "from django.conf import settings; "
                "assert settings.DEBUG is False; "
                "assert settings.SECURE_SSL_REDIRECT is True; "
                "assert settings.SESSION_COOKIE_SECURE is True; "
                "assert settings.CSRF_COOKIE_SECURE is True"
            ),
        ]

        for _ in range(20):
            result = subprocess.run(
                command,
                cwd=BACKEND_ROOT,
                env=environment,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(
                result.returncode,
                0,
                msg=result.stderr,
            )
