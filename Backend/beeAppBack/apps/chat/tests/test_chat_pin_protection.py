from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from apps.chat.services.chat_push_service import (
    _process_single_chat_notification,
)
from apps.notifications.services.notification_service import (
    _hide_protected_chat_notification_previews,
    list_notifications,
)

from rest_framework.test import APIRequestFactory

from apps.chat.exceptions import ChatConversationAccessError
from apps.chat.pin_protection_views import (
    ChatPinProtectionDetailView,
)
from apps.chat.services.chat_pin_protection_service import (
    protect_chat_with_pin,
    remove_chat_pin_protection,
)


USER_ID = "11111111-1111-1111-1111-111111111111"
CONVERSATION_ID = "22222222-2222-2222-2222-222222222222"


class ChatPinProtectionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "get_conversation"
    )
    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "account_security_pin_is_configured",
        return_value=False,
    )
    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "get_supabase_admin_client"
    )
    def test_cannot_protect_without_real_pin(
        self, admin_client, configured, get_conversation
    ):
        result = protect_chat_with_pin(
            user_id=USER_ID,
            conversation_id=CONVERSATION_ID,
        )
        self.assertEqual(result, "pin_required")
        get_conversation.assert_called_once_with(
            user_id=USER_ID,
            conversation_id=CONVERSATION_ID,
            include_participants=False,
        )
        configured.assert_called_once_with(user_id=USER_ID)
        admin_client.assert_not_called()

    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "get_conversation",
        side_effect=ChatConversationAccessError("not a participant"),
    )
    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "get_supabase_admin_client"
    )
    def test_non_member_cannot_protect(
        self, admin_client, _membership
    ):
        with self.assertRaises(ChatConversationAccessError):
            protect_chat_with_pin(
                user_id=USER_ID,
                conversation_id=CONVERSATION_ID,
            )
        admin_client.assert_not_called()

    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "get_conversation"
    )
    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "verify_account_security_pin",
        return_value="invalid",
    )
    @patch(
        "apps.chat.services.chat_pin_protection_service."
        "get_supabase_admin_client"
    )
    def test_wrong_pin_does_not_remove_protection(
        self, admin_client, verify, _membership
    ):
        result = remove_chat_pin_protection(
            user_id=USER_ID,
            conversation_id=CONVERSATION_ID,
            pin="0000",
        )
        self.assertEqual(result, "invalid")
        verify.assert_called_once_with(
            user_id=USER_ID, pin="0000"
        )
        admin_client.assert_not_called()

    @patch.object(
        ChatPinProtectionDetailView,
        "get_authenticated_user_and_access_token",
    )
    @patch(
        "apps.chat.pin_protection_views."
        "protect_chat_with_pin",
        return_value="pin_required",
    )
    def test_protect_endpoint_reports_missing_pin(
        self, protect, authenticated
    ):
        authenticated.return_value = (
            SimpleNamespace(id=USER_ID),
            "token",
        )
        request = self.factory.post(
            "/chat/conversations/"
            + CONVERSATION_ID
            + "/pin-protection/",
            {},
            format="json",
        )
        response = ChatPinProtectionDetailView.as_view()(
            request,
            conversation_id=CONVERSATION_ID,
        )
        self.assertEqual(response.status_code, 409)
        protect.assert_called_once_with(
            user_id=USER_ID,
            conversation_id=CONVERSATION_ID,
        )

    @patch.object(
        ChatPinProtectionDetailView,
        "get_authenticated_user_and_access_token",
    )
    @patch(
        "apps.chat.pin_protection_views."
        "remove_chat_pin_protection",
        return_value="locked",
    )
    def test_remove_endpoint_preserves_lockout(
        self, remove, authenticated
    ):
        authenticated.return_value = (
            SimpleNamespace(id=USER_ID),
            "token",
        )
        request = self.factory.delete(
            "/chat/conversations/"
            + CONVERSATION_ID
            + "/pin-protection/",
            {"pin": "0000"},
            format="json",
        )
        response = ChatPinProtectionDetailView.as_view()(
            request,
            conversation_id=CONVERSATION_ID,
        )
        self.assertEqual(response.status_code, 429)
        remove.assert_called_once_with(
            user_id=USER_ID,
            conversation_id=CONVERSATION_ID,
            pin="0000",
        )


class ProtectedChatPushTests(TestCase):
    def test_protected_chat_push_has_no_preview(self):
        client = Mock()
        notification = Mock()
        notification.data = [{
            "recipient_user_id": USER_ID,
            "conversation_id": CONVERSATION_ID,
        }]
        protected = Mock()
        protected.data = [{"conversation_id": CONVERSATION_ID}]
        query = Mock()
        query.select.return_value = query
        query.eq.return_value = query
        query.limit.return_value = query
        query.execute.side_effect = [notification, protected]
        client.table.return_value = query

        with patch(
            "apps.chat.services.chat_push_service._supabase",
            return_value=client,
        ), patch(
            "apps.chat.services.chat_push_service."
            "send_expo_push_notifications",
            return_value={
                "sent_tokens": ["ExpoPushToken[test]"],
                "failed_tokens": {},
            },
        ) as send, patch(
            "apps.chat.services.chat_push_service."
            "_complete_chat_push_notification"
        ), patch(
            "apps.chat.services.chat_push_service."
            "_deactivate_failed_tokens",
            return_value=0,
        ):
            result = _process_single_chat_notification(
                chat_notification_id=CONVERSATION_ID,
                rows=[{
                    "expo_push_token": "ExpoPushToken[test]",
                    "notification_title": "Nombre privado",
                    "notification_body": "Texto privado",
                    "notification_metadata": {"preview": "Texto privado"},
                }],
            )

        self.assertEqual(result["status"], "sent")
        self.assertEqual(send.call_args.kwargs["title"], "Nuevo mensaje")
        self.assertEqual(
            send.call_args.kwargs["body"],
            "Tienes un mensaje en un chat protegido.",
        )
        self.assertEqual(
            send.call_args.kwargs["data"],
            {"module": "chat", "conversation_id": CONVERSATION_ID},
        )

    def test_lookup_failure_does_not_send_push(self):
        client = Mock()
        client.table.side_effect = RuntimeError("Database unavailable")
        with patch(
            "apps.chat.services.chat_push_service._supabase",
            return_value=client,
        ), patch(
            "apps.chat.services.chat_push_service."
            "send_expo_push_notifications"
        ) as send, patch(
            "apps.chat.services.chat_push_service."
            "_complete_chat_push_notification"
        ):
            result = _process_single_chat_notification(
                chat_notification_id=CONVERSATION_ID,
                rows=[{
                    "expo_push_token": "ExpoPushToken[test]",
                    "notification_body": "Texto privado",
                }],
            )
        self.assertEqual(result["status"], "failed")
        send.assert_not_called()


class ProtectedChatNotificationListTests(TestCase):
    def setUp(self):
        self.original = {
            "id": "notice-1",
            "module": "chat",
            "title": "Nombre privado",
            "body": "Mensaje privado",
            "metadata": {
                "conversation_id": CONVERSATION_ID,
                "preview": "Mensaje privado",
            },
        }
        self.client = Mock()
        self.query = Mock()
        self.query.select.return_value = self.query
        self.query.eq.return_value = self.query
        self.query.order.return_value = self.query
        self.query.range.return_value = self.query
        self.client.table.return_value = self.query

    def test_protected_notification_hides_preview_and_metadata(self):
        self.query.execute.return_value = SimpleNamespace(
            data=[{"conversation_id": CONVERSATION_ID}],
        )
        result = _hide_protected_chat_notification_previews(
            supabase=self.client,
            recipient_id=USER_ID,
            notifications=[self.original],
        )
        self.assertEqual(result[0]["title"], "Nuevo mensaje")
        self.assertEqual(
            result[0]["body"],
            "Tienes un mensaje en un chat protegido.",
        )
        self.assertEqual(
            result[0]["metadata"],
            {"conversation_id": CONVERSATION_ID},
        )
        self.assertEqual(self.original["body"], "Mensaje privado")

    def test_unprotected_notification_keeps_preview(self):
        self.query.execute.return_value = SimpleNamespace(data=[])
        result = _hide_protected_chat_notification_previews(
            supabase=self.client,
            recipient_id=USER_ID,
            notifications=[self.original],
        )
        self.assertEqual(result[0]["body"], "Mensaje privado")

    def test_chat_without_conversation_id_hides_preview(self):
        self.query.execute.return_value = SimpleNamespace(data=[])
        unknown = {**self.original, "metadata": {"preview": "Privado"}}
        result = _hide_protected_chat_notification_previews(
            supabase=self.client,
            recipient_id=USER_ID,
            notifications=[unknown],
        )
        self.assertEqual(result[0]["metadata"], {})
        self.assertNotIn("Privado", result[0]["body"])

    @patch(
        "apps.notifications.services.notification_service.database.get_supabase"
    )
    def test_lookup_failure_does_not_return_notification(self, supabase):
        client = supabase.return_value
        query = Mock()
        query.select.return_value = query
        query.eq.return_value = query
        query.order.return_value = query
        query.range.return_value = query
        query.execute.side_effect = [
            SimpleNamespace(data=[self.original], count=1),
            RuntimeError("Protection lookup failed"),
        ]
        client.table.return_value = query

        from apps.notifications.exceptions import NotificationLookupError
        with self.assertRaises(NotificationLookupError):
            list_notifications(recipient_id=USER_ID)
