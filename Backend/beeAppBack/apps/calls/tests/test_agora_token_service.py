from django.test import SimpleTestCase, override_settings

from apps.calls.exceptions import CallTokenError
from apps.calls.services.agora_token_service import (
    build_agora_rtc_token,
)


@override_settings(
    AGORA_APP_ID="test-app-id",
    AGORA_APP_CERTIFICATE="test-app-certificate",
    AGORA_RTC_TOKEN_TTL_SECONDS=3600,
)
class AgoraRtcTokenValidationTests(SimpleTestCase):
    def test_rejects_blank_channel_name(self):
        with self.assertRaises(CallTokenError):
            build_agora_rtc_token(
                channel_name="   ",
                agora_uid=1,
            )

    def test_rejects_zero_uid(self):
        with self.assertRaises(CallTokenError):
            build_agora_rtc_token(
                channel_name="beeapp_test",
                agora_uid=0,
            )

    def test_rejects_ttl_below_one_minute(self):
        with self.assertRaises(CallTokenError):
            build_agora_rtc_token(
                channel_name="beeapp_test",
                agora_uid=1,
                expires_in_seconds=59,
            )
