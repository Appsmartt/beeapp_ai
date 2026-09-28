from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.chat.exceptions import ChatConversationNotFoundError
from apps.chat.services.chat_category_service import (
    _require_participant,
    list_chat_category_assignments,
    set_chat_categories,
)


USER_ID = "11111111-1111-1111-1111-111111111111"
IDENTITY_ID = "22222222-2222-2222-2222-222222222222"
CONVERSATION_ID = "33333333-3333-3333-3333-333333333333"


class ChatCategoryServiceTests(SimpleTestCase):
    @patch("apps.chat.services.chat_category_service.get_supabase_admin_client")
    @patch("apps.chat.services.chat_category_service.get_owned_chat_identity")
    def test_non_participant_cannot_assign(self, owned_identity, admin_client):
        admin_client.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.is_.return_value.limit.return_value.execute.return_value = SimpleNamespace(data=[])
        with self.assertRaises(ChatConversationNotFoundError):
            _require_participant(USER_ID, IDENTITY_ID, CONVERSATION_ID)
        owned_identity.assert_called_once_with(
            user_id=USER_ID, identity_id=IDENTITY_ID,
        )

    @patch("apps.chat.services.chat_category_service.get_supabase_admin_client")
    @patch("apps.chat.services.chat_category_service.get_owned_chat_identity")
    def test_unowned_identity_is_rejected_before_participant_query(
        self, owned_identity, admin_client,
    ):
        owned_identity.side_effect = ValueError("Identity is not owned.")
        with self.assertRaises(ValueError):
            _require_participant(USER_ID, IDENTITY_ID, CONVERSATION_ID)
        admin_client.assert_not_called()

    @patch("apps.chat.services.chat_category_service._client")
    @patch("apps.chat.services.chat_category_service._require_identity")
    def test_empty_conversation_page_skips_database(self, require_identity, client):
        self.assertEqual(
            list_chat_category_assignments(
                user_id=USER_ID,
                access_token="token",
                identity_id=IDENTITY_ID,
                conversation_ids=[],
            ),
            [],
        )
        require_identity.assert_called_once_with(USER_ID, IDENTITY_ID)
        client.assert_not_called()

    @patch("apps.chat.services.chat_category_service.list_chat_category_assignments")
    @patch("apps.chat.services.chat_category_service._client")
    @patch("apps.chat.services.chat_category_service._require_participant")
    def test_assignment_uses_user_token_and_atomic_rpc(
        self, require_participant, client, list_assignments,
    ):
        category_id = "44444444-4444-4444-4444-444444444444"
        list_assignments.return_value = [{
            "category_id": category_id,
            "conversation_id": CONVERSATION_ID,
        }]
        result = set_chat_categories(
            user_id=USER_ID,
            access_token="token",
            identity_id=IDENTITY_ID,
            conversation_id=CONVERSATION_ID,
            category_ids=[category_id],
        )
        self.assertEqual(result, [category_id])
        require_participant.assert_called_once_with(
            USER_ID, IDENTITY_ID, CONVERSATION_ID,
        )
        client.assert_called_with("token")
        client.return_value.rpc.assert_called_once_with(
            "set_chat_conversation_categories",
            {
                "p_identity_id": IDENTITY_ID,
                "p_conversation_id": CONVERSATION_ID,
                "p_category_ids": [category_id],
            },
        )


from rest_framework.test import APIRequestFactory
from apps.chat.category_views import (
    ChatCategoriesView,
    ChatConversationCategoriesView,
)


class ChatCategoryViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch.object(ChatCategoriesView, "get_authenticated_user")
    @patch("apps.chat.category_views._get_access_token", return_value="token")
    @patch("apps.chat.category_views.list_chat_categories", return_value=[])
    def test_list_uses_authenticated_user_and_identity(
        self, list_categories, _token, get_user,
    ):
        get_user.return_value = SimpleNamespace(id=USER_ID)
        request = self.factory.get(
            "/api/chat/categories/",
            {"identity_id": IDENTITY_ID},
        )
        response = ChatCategoriesView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"categories": []})
        list_categories.assert_called_once_with(
            user_id=USER_ID, access_token="token", identity_id=IDENTITY_ID,
        )

    @patch("apps.chat.category_views.create_chat_category")
    def test_invalid_category_rejected_before_database(self, create_category):
        request = self.factory.post(
            "/api/chat/categories/",
            {
                "identity_id": IDENTITY_ID,
                "name": "Trabajo",
                "icon": "UnknownIcon",
                "color": "#000000",
            },
            format="json",
        )
        response = ChatCategoriesView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        create_category.assert_not_called()

    @patch.object(ChatConversationCategoriesView, "get_authenticated_user")
    @patch("apps.chat.category_views._get_access_token", return_value="token")
    @patch(
        "apps.chat.category_views.set_chat_categories",
        side_effect=ChatConversationNotFoundError("Conversation was not found."),
    )
    def test_non_participant_cannot_assign(
        self, save_categories, _token, get_user,
    ):
        get_user.return_value = SimpleNamespace(id=USER_ID)
        request = self.factory.put(
            f"/api/chat/conversations/{CONVERSATION_ID}/categories/",
            {"identity_id": IDENTITY_ID, "category_ids": []},
            format="json",
        )
        response = ChatConversationCategoriesView.as_view()(
            request, conversation_id=CONVERSATION_ID,
        )
        self.assertEqual(response.status_code, 404)
        save_categories.assert_called_once()
