from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from apps.mail.exceptions import MailMessageNotFoundError
from apps.mail.services import mail_message
from apps.mail.services.mail_message import persistence
from apps.mail.services.mail_message import provider_actions
from apps.mail.services.mail_message import queries


class QueryRecorder:
    def __init__(self, response: SimpleNamespace) -> None:
        self.response = response
        self.calls: list[tuple[str, tuple, dict]] = []

    def __getattr__(self, name: str):
        def method(*args, **kwargs):
            self.calls.append((name, args, kwargs))
            return self

        return method

    def execute(self):
        self.calls.append(("execute", (), {}))
        return self.response


class MailMessageSecurityTests(unittest.TestCase):
    def test_update_requires_at_least_one_state(self) -> None:
        with self.assertRaisesRegex(
            MailMessageNotFoundError,
            "al menos un estado",
        ):
            mail_message.update_mail_message_state(
                user_id="user-1",
                message_id="message-1",
            )

    def test_move_rejects_invalid_folder_before_access(self) -> None:
        with patch(
            "apps.mail.services.mail_message."
            "get_actionable_mail_message"
        ) as mocked_actionable_message:
            with self.assertRaisesRegex(
                Exception,
                "carpeta de correo",
            ):
                mail_message.move_mail_message(
                    user_id="user-1",
                    message_id="message-1",
                    folder="invalid-folder",
                )

        mocked_actionable_message.assert_not_called()

    def test_get_actionable_message_is_scoped_to_user(self) -> None:
        message_response = SimpleNamespace(
            data={
                "id": "message-1",
                "user_id": "user-1",
                "mail_integration_id": "integration-1",
                "provider": "google",
                "provider_message_id": "provider-message-1",
                "is_provider_deleted": False,
            }
        )
        message_query = QueryRecorder(message_response)
        integration_query = QueryRecorder(
            SimpleNamespace(data=None)
        )
        supabase = Mock()
        supabase.table.side_effect = lambda table_name: {
            "mail_messages": message_query,
            "mail_integrations": integration_query,
        }[table_name]

        with patch(
            "apps.mail.services.mail_message.provider_actions."
            "get_mail_message_supabase",
            return_value=supabase,
        ):
            with self.assertRaisesRegex(
                MailMessageNotFoundError,
                "integración de correo no fue encontrada",
            ):
                provider_actions.get_actionable_mail_message(
                    user_id="user-1",
                    message_id="message-1",
                )

        self.assertIn(
            ("eq", ("id", "message-1"), {}),
            message_query.calls,
        )
        self.assertIn(
            ("eq", ("user_id", "user-1"), {}),
            message_query.calls,
        )
        self.assertIn(
            ("eq", ("is_provider_deleted", False), {}),
            message_query.calls,
        )

    def test_list_search_escapes_filter_wildcards(self) -> None:
        response = SimpleNamespace(data=[], count=0)
        query = QueryRecorder(response)
        supabase = Mock()
        supabase.table.return_value = query

        with patch(
            "apps.mail.services.mail_message.queries."
            "get_mail_message_supabase",
            return_value=supabase,
        ):
            result = queries.list_mail_messages(
                user_id="user-1",
                integration_id=None,
                folder=None,
                unread_only=False,
                starred_only=False,
                search="100%_safe,query",
                limit=20,
                offset=0,
            )

        or_calls = [
            call
            for call in query.calls
            if call[0] == "or_"
        ]

        self.assertEqual(len(or_calls), 1)
        self.assertEqual(
            or_calls[0][1][0],
            "subject.ilike.%100\\%\\_safe query%,"
            "snippet.ilike.%100\\%\\_safe query%,"
            "body_preview.ilike.%100\\%\\_safe query%",
        )
        self.assertEqual(result["messages"], [])
        self.assertFalse(result["pagination"]["has_more"])

    def test_persistence_scopes_update_to_message_owner(self) -> None:
        response = SimpleNamespace(data={"id": "message-1"})
        query = QueryRecorder(response)
        supabase = Mock()
        supabase.table.return_value = query
        provider_message = {
            "provider_message_id": "provider-message-1",
            "is_read": True,
            "is_starred": False,
            "is_archived": False,
            "is_spam": False,
            "is_trashed": False,
            "has_attachments": False,
            "attachment_count": 0,
        }

        with patch(
            "apps.mail.services.mail_message.persistence."
            "get_mail_message_supabase",
            return_value=supabase,
        ), patch(
            "apps.mail.services.mail_message.persistence."
            "get_mail_message",
            return_value={"message": {"id": "message-1"}},
        ) as mocked_get_mail_message:
            result = persistence.persist_provider_message_update(
                message={
                    "id": "message-1",
                    "user_id": "user-1",
                },
                provider_message=provider_message,
            )

        self.assertIn(
            ("eq", ("id", "message-1"), {}),
            query.calls,
        )
        self.assertIn(
            ("eq", ("user_id", "user-1"), {}),
            query.calls,
        )
        mocked_get_mail_message.assert_called_once_with(
            user_id="user-1",
            message_id="message-1",
        )
        self.assertEqual(result, {"id": "message-1"})


if __name__ == "__main__":
    unittest.main()
