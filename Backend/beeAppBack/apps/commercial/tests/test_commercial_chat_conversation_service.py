from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

from apps.commercial.exceptions import CommercialAccessError, CommercialNotFoundError
from apps.commercial.services.commercial_chat_conversation_service import (
    _find_commercial_chat_identity,
    _find_profile_chat_identity,
    find_existing_commercial_chat_conversation,
    open_or_create_commercial_chat_conversation,
    resolve_commercial_chat_identity_context,
)


DEFAULT = object()


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, data=None, insert_error=None):
        self.data = data
        self.insert_error = insert_error

    def select(self, _columns):
        return self

    def eq(self, _column, _value):
        return self

    def maybe_single(self):
        return self

    def insert(self, _payload):
        return self

    def execute(self):
        if self.insert_error:
            raise self.insert_error
        return FakeResponse(self.data)


class FakeSupabaseClient:
    def __init__(self, table_data, insert_error=None):
        self.table_data = table_data
        self.insert_error = insert_error

    def table(self, table_name):
        if table_name not in self.table_data:
            raise AssertionError(f"Tabla inesperada: {table_name}")
        error = self.insert_error if table_name == "commerce_chat_conversations" else None
        return FakeQuery(self.table_data[table_name], error)


class CommercialChatIdentityHelpersTests(unittest.TestCase):
    def setUp(self) -> None:
        self.identities = [
            {
                "id": "client-identity",
                "identity_type": "profile",
                "profile_id": "client-profile",
            },
            {
                "id": "business-a-identity",
                "identity_type": "commercial_profile",
                "commercial_profile_id": "business-a",
            },
            {
                "id": "business-b-identity",
                "identity_type": "commercial_profile",
                "commercial_profile_id": "business-b",
            },
        ]

    def test_finds_exact_client_profile_identity(self) -> None:
        identity = _find_profile_chat_identity(self.identities, "client-profile")
        self.assertEqual(identity["id"], "client-identity")

    def test_finds_exact_commercial_identity(self) -> None:
        identity = _find_commercial_chat_identity(self.identities, "business-b")
        self.assertEqual(identity["id"], "business-b-identity")

    def test_returns_none_when_identity_does_not_match(self) -> None:
        self.assertIsNone(_find_commercial_chat_identity(self.identities, "business-missing"))


class FindExistingCommercialChatConversationTests(unittest.TestCase):
    def _find(self, link):
        client = FakeSupabaseClient({"commerce_chat_conversations": link})
        with patch(
            "apps.commercial.services.commercial_chat_conversation_service.get_commercial_user_supabase_client",
            return_value=client,
        ): 
            return find_existing_commercial_chat_conversation(
                access_token="test-token",
                client_profile_id="client-profile",
                commercial_profile_id="business-a",
            )

    def test_returns_existing_commercial_chat_link(self) -> None:
        link = {"conversation_id": "conversation-1", "commercial_profile_id": "business-a", "client_profile_id": "client-profile"}
        self.assertEqual(self._find(link)["conversation_id"], "conversation-1")

    def test_returns_none_when_commercial_chat_link_does_not_exist(self) -> None:
        self.assertIsNone(self._find(None))


class OpenOrCreateCommercialChatConversationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.access_token = "test-token"
        self.client_profile_id = "client-profile"
        self.commercial_profile_id = "business-a"
        self.context = {
            "commercial_profile": {"id": self.commercial_profile_id, "owner_id": "owner-profile"},
            "client_identity": {"id": "client-identity"},
            "commercial_identity": {"id": "business-a-identity"},
        }
        self.chat_result = {"conversation": {"id": "conversation-new"}, "created": True}

    def _open(self, existing_links, insert_error=None):
        client = FakeSupabaseClient(
            {"commerce_chat_conversations": None},
            insert_error=insert_error,
        )
        with patch(
            "apps.commercial.services.commercial_chat_conversation_service.find_existing_commercial_chat_conversation",
            side_effect=existing_links,
        ), patch(
            "apps.commercial.services.commercial_chat_conversation_service.resolve_commercial_chat_identity_context",
            return_value=self.context,
        ), patch(
            "apps.commercial.services.commercial_chat_conversation_service.create_or_get_direct_conversation",
            return_value=self.chat_result,
        ), patch(
            "apps.commercial.services.commercial_chat_conversation_service.get_commercial_user_supabase_client",
            return_value=client,
        ): 
            return open_or_create_commercial_chat_conversation(
                access_token=self.access_token,
                client_profile_id=self.client_profile_id,
                commercial_profile_id=self.commercial_profile_id,
            )

    def test_returns_existing_link_without_creating_chat(self) -> None:
        link = {"conversation_id": "conversation-existing", "commercial_profile_id": self.commercial_profile_id, "client_profile_id": self.client_profile_id}
        result = self._open([link])
        self.assertEqual(result["conversation_id"], "conversation-existing")
        self.assertFalse(result["created"])

    def test_creates_chat_and_link_when_missing(self) -> None:
        result = self._open([None])
        self.assertEqual(result["conversation_id"], "conversation-new")
        self.assertTrue(result["created"])

    def test_recovers_existing_link_after_unique_conflict(self) -> None:
        error = Exception("23505 commerce_chat_conversations_unique_business_client")
        link = {"conversation_id": "conversation-race", "commercial_profile_id": self.commercial_profile_id, "client_profile_id": self.client_profile_id}
        result = self._open([None, link], insert_error=error)
        self.assertEqual(result["conversation_id"], "conversation-race")
        self.assertFalse(result["created"])

    def test_propagates_non_unique_insert_error(self) -> None:
        error = RuntimeError("network unavailable")
        with self.assertRaisesRegex(RuntimeError, "network unavailable"):
            self._open([None], insert_error=error)


class ResolveCommercialChatIdentityContextTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client_profile_id = "client-profile"
        self.owner_profile_id = "owner-profile"
        self.commercial_profile_id = "business-a"
        self.commercial_profile = {
            "id": self.commercial_profile_id,
            "owner_id": self.owner_profile_id,
            "is_public": True,
            "is_available": True,
            "publication_status": "published",
            "archived_at": None,
        }
        self.client_identity = {"id": "client-identity", "identity_type": "profile", "profile_id": self.client_profile_id}
        self.commercial_identity = {"id": "business-a-identity", "identity_type": "commercial_profile", "commercial_profile_id": self.commercial_profile_id}

    def _resolve(self, commercial_profile=DEFAULT, client_identities=DEFAULT, owner_identities=DEFAULT, client_profile_id=DEFAULT):
        profile = self.commercial_profile if commercial_profile is DEFAULT else commercial_profile
        client_rows = [self.client_identity] if client_identities is DEFAULT else client_identities
        owner_rows = [self.commercial_identity] if owner_identities is DEFAULT else owner_identities
        actor_id = self.client_profile_id if client_profile_id is DEFAULT else client_profile_id
        client = FakeSupabaseClient({"commercial_profiles": profile})
        with patch(
            "apps.commercial.services.commercial_chat_conversation_service.get_commercial_user_supabase_client",
            return_value=client,
        ), patch(
            "apps.commercial.services.commercial_chat_conversation_service.sync_chat_identities_for_user",
            side_effect=[client_rows, owner_rows],
        ): 
            return resolve_commercial_chat_identity_context(
                access_token="test-token",
                client_profile_id=actor_id,
                commercial_profile_id=self.commercial_profile_id,
            )

    def test_resolves_valid_context(self) -> None:
        context = self._resolve()
        self.assertEqual(context["client_identity"]["id"], "client-identity")
        self.assertEqual(context["commercial_identity"]["id"], "business-a-identity")

    def test_rejects_missing_business(self) -> None:
        with self.assertRaises(CommercialNotFoundError):
            self._resolve(commercial_profile=None)

    def test_rejects_unavailable_business(self) -> None:
        with self.assertRaises(CommercialNotFoundError):
            self._resolve(commercial_profile={**self.commercial_profile, "is_available": False})

    def test_rejects_owner_opening_own_business_chat(self) -> None:
        with self.assertRaises(CommercialAccessError):
            self._resolve(client_profile_id=self.owner_profile_id)

    def test_rejects_missing_exact_commercial_identity(self) -> None:
        wrong = {"id": "business-b-identity", "identity_type": "commercial_profile", "commercial_profile_id": "business-b"}
        with self.assertRaises(CommercialNotFoundError):
            self._resolve(owner_identities=[wrong])


if __name__ == "__main__":
    unittest.main()
