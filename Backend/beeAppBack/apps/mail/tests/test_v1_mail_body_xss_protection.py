import base64
from unittest import TestCase

from apps.mail.services.google_mail_provider_service import (
    GoogleMailProvider,
)
from apps.mail.services.mail_provider_service import (
    normalize_mail_body_text,
)
from apps.mail.services.microsoft_provider.provider import (
    MicrosoftMailProvider,
)


def encode_base64url(value: str) -> str:
    return base64.urlsafe_b64encode(
        value.encode("utf-8")
    ).decode("ascii").rstrip("=")


class V1MailBodyXssProtectionTests(TestCase):
    invisible_values = (
        "\ufeff",
        "\u200b",
        "\u200c",
        "\u200d",
        "\u2060",
        "\u00ad",
        " \t\r\n",
        "\ufeff\u200b\u200c\u200d\u2060\u00ad \t\r\n",
    )

    def test_normalize_mail_body_text_rejects_invisible_content(self):
        for value in self.invisible_values:
            with self.subTest(value=value.encode("unicode_escape")):
                self.assertIsNone(normalize_mail_body_text(value))

    def test_normalize_mail_body_text_preserves_visible_content(self):
        value = "\ufeff\u200b Correo legítimo \u2060"
        self.assertEqual(
            normalize_mail_body_text(value),
            "Correo legítimo",
        )

    def test_google_uses_html_fallback_when_plain_text_is_bom_only(self):
        provider = GoogleMailProvider()
        html = '<p>Contenido seguro</p><img src="x" onerror="alert(1)">'
        payload = {
            "mimeType": "multipart/alternative",
            "parts": [
                {
                    "mimeType": "text/plain",
                    "body": {"data": encode_base64url("\ufeff")},
                },
                {
                    "mimeType": "text/html",
                    "body": {"data": encode_base64url(html)},
                },
            ],
        }

        body_text, body_html = provider._extract_bodies(payload)

        self.assertEqual(body_html, html)
        self.assertEqual(body_text, "Contenido seguro")

    def test_google_ignores_all_invisible_plain_text_variants(self):
        provider = GoogleMailProvider()

        for value in self.invisible_values:
            with self.subTest(value=value.encode("unicode_escape")):
                payload = {
                    "mimeType": "text/plain",
                    "body": {"data": encode_base64url(value)},
                }
                body_text, body_html = provider._extract_bodies(payload)
                self.assertIsNone(body_text)
                self.assertIsNone(body_html)

    def test_google_preserves_visible_plain_text(self):
        provider = GoogleMailProvider()
        payload = {
            "mimeType": "text/plain",
            "body": {
                "data": encode_base64url(
                    "\ufeff\u200b Texto legítimo \u2060"
                ),
            },
        }

        body_text, body_html = provider._extract_bodies(payload)

        self.assertEqual(body_text, "Texto legítimo")
        self.assertIsNone(body_html)

    def test_microsoft_normalizes_bom_only_text_body(self):
        provider = MicrosoftMailProvider()
        message = provider._normalize_message(
            data={
                "id": "message-id",
                "body": {
                    "contentType": "text",
                    "content": "\ufeff",
                },
                "parentFolderId": None,
                "isDraft": False,
                "isRead": True,
            },
            attachments=[],
            attachments_loaded=True,
        )

        self.assertIsNone(message["body_text"])
        self.assertIsNone(message["body_html"])

    def test_microsoft_html_body_extracts_visible_text(self):
        provider = MicrosoftMailProvider()
        html = '<p>Contenido seguro</p><svg onload="alert(1)"></svg>'
        message = provider._normalize_message(
            data={
                "id": "message-id",
                "body": {
                    "contentType": "html",
                    "content": html,
                },
                "parentFolderId": None,
                "isDraft": False,
                "isRead": True,
            },
            attachments=[],
            attachments_loaded=True,
        )

        self.assertEqual(message["body_html"], html)
        self.assertEqual(message["body_text"], "Contenido seguro")

    def test_microsoft_preserves_visible_text_body(self):
        provider = MicrosoftMailProvider()
        message = provider._normalize_message(
            data={
                "id": "message-id",
                "body": {
                    "contentType": "text",
                    "content": "\ufeff\u200b Texto legítimo \u2060",
                },
                "parentFolderId": None,
                "isDraft": False,
                "isRead": True,
            },
            attachments=[],
            attachments_loaded=True,
        )

        self.assertEqual(message["body_text"], "Texto legítimo")
