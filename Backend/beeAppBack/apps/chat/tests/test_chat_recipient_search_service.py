from django.test import SimpleTestCase

from apps.chat.exceptions import ChatRecipientNotFoundError
from apps.chat.services.chat_recipient_search_service import (
    _build_postgrest_ilike_or_filter,
    _validate_postgrest_search_value,
)


class ChatRecipientSearchPostgrestSafetyTests(SimpleTestCase):
    def test_builds_literal_ilike_filter_for_valid_search(self):
        result = _build_postgrest_ilike_or_filter(
            columns=("first_name", "last_name", "email"),
            value="O'Connor_50%",
        )

        expected_pattern = r"%O'Connor\_50\%%"
        self.assertEqual(
            result,
            ",".join(
                f"{column}.ilike.{expected_pattern}"
                for column in (
                    "first_name",
                    "last_name",
                    "email",
                )
            ),
        )

    def test_rejects_postgrest_structural_characters(self):
        for value in (
            "name,email.ilike.%private%",
            "name)",
            "(email.ilike.%private%",
            '"email"',
            "name\\value",
        ):
            with self.subTest(value=value):
                with self.assertRaises(ChatRecipientNotFoundError):
                    _validate_postgrest_search_value(value)


class ChatRecipientSearchExtendedPostgrestSafetyTests(SimpleTestCase):
    def test_rejects_semicolon_and_colon(self):
        for value in ("name;select", "name:email"):
            with self.subTest(value=value):
                with self.assertRaises(ChatRecipientNotFoundError):
                    _validate_postgrest_search_value(value)


class ChatRecipientSearchWhitespaceSafetyTests(SimpleTestCase):
    def test_rejects_line_breaks(self):
        with self.assertRaises(ChatRecipientNotFoundError):
            _validate_postgrest_search_value("name\nemail")
