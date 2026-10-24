from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.chat.exceptions import ChatRecipientNotFoundError
from apps.chat.services.recipient_search import (
    build_postgrest_ilike_or_filter,
    search_chat_recipients,
    validate_postgrest_search_value,
)
from apps.chat.services.recipient_search.matching import (
    commercial_match_rank,
    deduplicate_and_sort_results,
    private_match_rank,
)
from apps.chat.services.recipient_search.validation import (
    normalize_phone_digits,
    normalize_query,
)


class ChatRecipientSearchPostgrestSafetyTests(SimpleTestCase):
    def test_builds_literal_ilike_filter_for_valid_search(self):
        result = build_postgrest_ilike_or_filter(
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
            "name;select",
            "name:email",
            "name\nemail",
        ):
            with self.subTest(value=value):
                with self.assertRaises(ChatRecipientNotFoundError):
                    validate_postgrest_search_value(value)


class ChatRecipientSearchNormalizationTests(SimpleTestCase):
    def test_normalizes_query_and_phone_digits(self):
        self.assertEqual(normalize_query("  ALIce  "), "alice")
        self.assertEqual(normalize_phone_digits("+57 300-123-4567"), "573001234567")
        self.assertIsNone(normalize_phone_digits("123"))

    def test_rejects_queries_shorter_than_two_characters(self):
        with self.assertRaises(ChatRecipientNotFoundError):
            search_chat_recipients(
                user_id="requester-id",
                query="a",
            )

    @patch(
        "apps.chat.services.recipient_search.service.search_commercial_profiles",
        return_value=[],
    )
    @patch(
        "apps.chat.services.recipient_search.service.search_private_profiles",
        return_value=[],
    )
    def test_clamps_limit_to_supported_range(
        self,
        private_search,
        commercial_search,
    ):
        result = search_chat_recipients(
            user_id="requester-id",
            query="alice",
            limit=999,
        )

        self.assertEqual(result["limit"], 20)
        private_search.assert_called_once_with(
            user_id="requester-id",
            query="alice",
            phone_digits=None,
            limit=20,
        )
        commercial_search.assert_called_once_with(
            user_id="requester-id",
            query="alice",
            phone_digits=None,
            limit=20,
        )


class ChatRecipientSearchRankingTests(SimpleTestCase):
    def test_private_ranking_prioritizes_phone_and_email(self):
        profile = {
            "first_name": "Alice",
            "last_name": "Smith",
            "email": "alice@example.com",
            "normalized_phone": "+57 300 123 4567",
        }

        self.assertEqual(
            private_match_rank(
                profile=profile,
                query="4567",
                phone_digits="4567",
            ),
            0,
        )
        self.assertEqual(
            private_match_rank(
                profile=profile,
                query="alice@example.com",
                phone_digits=None,
            ),
            1,
        )
        self.assertEqual(
            private_match_rank(
                profile=profile,
                query="alice",
                phone_digits=None,
            ),
            2,
        )

    def test_commercial_ranking_hides_non_public_email(self):
        profile = {
            "display_name": "Alice Bakery",
            "public_email": "contact@alice.co",
            "phone_dial_code": "+57",
            "phone_number": "3001234567",
            "is_phone_public": False,
            "is_email_public": False,
        }

        self.assertEqual(
            commercial_match_rank(
                commercial_profile=profile,
                query="contact@alice.co",
                phone_digits=None,
            ),
            8,
        )
        self.assertEqual(
            commercial_match_rank(
                commercial_profile=profile,
                query="alice",
                phone_digits=None,
            ),
            3,
        )

    def test_deduplicates_sorts_and_removes_internal_rank(self):
        result = deduplicate_and_sort_results(
            results=[
                {
                    "identity_id": "identity-b",
                    "display_name": "Beta",
                    "match_rank": 3,
                },
                {
                    "identity_id": "identity-a",
                    "display_name": "Alpha",
                    "match_rank": 2,
                },
                {
                    "identity_id": "identity-b",
                    "display_name": "Beta",
                    "match_rank": 1,
                },
            ],
        )

        self.assertEqual(
            result,
            [
                {
                    "identity_id": "identity-b",
                    "display_name": "Beta",
                },
                {
                    "identity_id": "identity-a",
                    "display_name": "Alpha",
                },
            ],
        )


class ChatRecipientSearchServiceTests(SimpleTestCase):
    @patch(
        "apps.chat.services.recipient_search.service.search_commercial_profiles",
        return_value=[
            {
                "identity_id": "commercial-identity",
                "identity_type": "commercial_profile",
                "profile_id": None,
                "commercial_profile_id": "commercial-id",
                "display_name": "Alice Bakery",
                "avatar_file_id": "logo-id",
                "is_available": True,
                "match_rank": 3,
            }
        ],
    )
    @patch(
        "apps.chat.services.recipient_search.service.search_private_profiles",
        return_value=[
            {
                "identity_id": "profile-identity",
                "identity_type": "profile",
                "profile_id": "profile-id",
                "commercial_profile_id": None,
                "display_name": "Alice Smith",
                "avatar_file_id": None,
                "is_available": True,
                "match_rank": 1,
            }
        ],
    )
    def test_returns_stable_public_contract(
        self,
        private_search,
        commercial_search,
    ):
        result = search_chat_recipients(
            user_id="requester-id",
            query=" Alice ",
            limit=2,
        )

        self.assertEqual(
            result,
            {
                "query": "alice",
                "limit": 2,
                "results": [
                    {
                        "identity_id": "profile-identity",
                        "identity_type": "profile",
                        "profile_id": "profile-id",
                        "commercial_profile_id": None,
                        "display_name": "Alice Smith",
                        "avatar_file_id": None,
                        "is_available": True,
                    },
                    {
                        "identity_id": "commercial-identity",
                        "identity_type": "commercial_profile",
                        "profile_id": None,
                        "commercial_profile_id": "commercial-id",
                        "display_name": "Alice Bakery",
                        "avatar_file_id": "logo-id",
                        "is_available": True,
                    },
                ],
            },
        )
        self.assertEqual(private_search.call_count, 1)
        self.assertEqual(commercial_search.call_count, 1)


class ChatRecipientSearchRepositoryFailureTests(SimpleTestCase):
    @patch(
        "apps.chat.services.recipient_search.private_profiles.supabase"
    )
    def test_private_search_wraps_repository_failures(
        self,
        supabase_mock,
    ):
        supabase_mock.side_effect = RuntimeError("Database unavailable")

        from apps.chat.services.recipient_search.private_profiles import (
            search_private_profiles,
        )

        with self.assertRaises(ChatRecipientNotFoundError):
            search_private_profiles(
                user_id="requester-id",
                query="alice",
                phone_digits=None,
                limit=20,
            )

    @patch(
        "apps.chat.services.recipient_search.commercial_profiles.supabase"
    )
    def test_commercial_search_wraps_repository_failures(
        self,
        supabase_mock,
    ):
        supabase_mock.side_effect = RuntimeError("Database unavailable")

        from apps.chat.services.recipient_search.commercial_profiles import (
            search_commercial_profiles,
        )

        with self.assertRaises(ChatRecipientNotFoundError):
            search_commercial_profiles(
                user_id="requester-id",
                query="alice",
                phone_digits=None,
                limit=20,
            )

class ChatRecipientSearchProfileFlowTests(SimpleTestCase):
    def _query_mock(self, rows):
        query = Mock()
        query.select.return_value = query
        query.eq.return_value = query
        query.neq.return_value = query
        query.or_.return_value = query
        query.in_.return_value = query
        query.limit.return_value = query
        query.execute.return_value = Mock(data=rows)
        return query

    @patch(
        "apps.chat.services.recipient_search.private_profiles."
        "get_active_profile_identities"
    )
    @patch(
        "apps.chat.services.recipient_search.private_profiles.supabase"
    )
    def test_private_search_excludes_requester_and_requires_active_identity(
        self,
        supabase_mock,
        active_identities_mock,
    ):
        profile_id = "11111111-1111-1111-1111-111111111111"
        identity_id = "22222222-2222-2222-2222-222222222222"
        requester_id = "33333333-3333-3333-3333-333333333333"
        profile_query = self._query_mock(
            [
                {
                    "id": profile_id,
                    "first_name": "Alice",
                    "last_name": "Smith",
                    "email": "alice@example.com",
                    "normalized_phone": "+57 300 123 4567",
                    "is_public": True,
                }
            ]
        )
        supabase_client = Mock()
        supabase_client.table.return_value = profile_query
        supabase_mock.return_value = supabase_client
        active_identities_mock.return_value = {
            profile_id: {
                "id": identity_id,
                "profile_id": profile_id,
                "is_active": True,
            }
        }

        from apps.chat.services.recipient_search.private_profiles import (
            search_private_profiles,
        )

        result = search_private_profiles(
            user_id=requester_id,
            query="alice",
            phone_digits=None,
            limit=20,
        )

        self.assertEqual(
            result,
            [
                {
                    "identity_id": identity_id,
                    "identity_type": "profile",
                    "profile_id": profile_id,
                    "commercial_profile_id": None,
                    "display_name": "Alice Smith",
                    "avatar_file_id": None,
                    "is_available": True,
                    "match_rank": 2,
                }
            ],
        )
        profile_query.eq.assert_called_with("is_public", True)
        profile_query.neq.assert_called_once_with("id", requester_id)
        active_identities_mock.assert_called_once_with(
            profile_ids=[profile_id],
        )

    @patch(
        "apps.chat.services.recipient_search.private_profiles."
        "get_active_profile_identities",
        return_value={},
    )
    @patch(
        "apps.chat.services.recipient_search.private_profiles.supabase"
    )
    def test_private_search_omits_profiles_without_active_identity(
        self,
        supabase_mock,
        active_identities_mock,
    ):
        profile_id = "11111111-1111-1111-1111-111111111111"
        profile_query = self._query_mock(
            [
                {
                    "id": profile_id,
                    "first_name": "Alice",
                    "last_name": "Smith",
                    "email": "alice@example.com",
                    "normalized_phone": "+57 300 123 4567",
                    "is_public": True,
                }
            ]
        )
        supabase_client = Mock()
        supabase_client.table.return_value = profile_query
        supabase_mock.return_value = supabase_client

        from apps.chat.services.recipient_search.private_profiles import (
            search_private_profiles,
        )

        result = search_private_profiles(
            user_id="33333333-3333-3333-3333-333333333333",
            query="alice",
            phone_digits=None,
            limit=20,
        )

        self.assertEqual(result, [])
        active_identities_mock.assert_called_once_with(
            profile_ids=[profile_id],
        )

    @patch(
        "apps.chat.services.recipient_search.commercial_profiles."
        "get_active_commercial_identities"
    )
    @patch(
        "apps.chat.services.recipient_search.commercial_profiles.supabase"
    )
    def test_commercial_search_requires_active_identity(
        self,
        supabase_mock,
        active_identities_mock,
    ):
        commercial_profile_id = (
            "44444444-4444-4444-4444-444444444444"
        )
        commercial_identity_id = (
            "77777777-7777-7777-7777-777777777777"
        )
        logo_file_id = "66666666-6666-6666-6666-666666666666"
        commercial_query = self._query_mock(
            [
                {
                    "id": commercial_profile_id,
                    "owner_id": (
                        "55555555-5555-5555-5555-555555555555"
                    ),
                    "display_name": "Alice Bakery",
                    "phone_dial_code": "+57",
                    "phone_number": "3001234567",
                    "public_email": "contact@alice.co",
                    "logo_file_id": logo_file_id,
                    "is_public": True,
                    "is_available": True,
                    "is_phone_public": True,
                    "is_email_public": True,
                }
            ]
        )
        supabase_client = Mock()
        supabase_client.table.return_value = commercial_query
        supabase_mock.return_value = supabase_client
        active_identities_mock.return_value = {
            commercial_profile_id: {
                "id": commercial_identity_id,
                "commercial_profile_id": commercial_profile_id,
                "is_active": True,
            }
        }

        from apps.chat.services.recipient_search.commercial_profiles import (
            search_commercial_profiles,
        )

        result = search_commercial_profiles(
            user_id="33333333-3333-3333-3333-333333333333",
            query="alice",
            phone_digits=None,
            limit=20,
        )

        self.assertEqual(
            result,
            [
                {
                    "identity_id": commercial_identity_id,
                    "identity_type": "commercial_profile",
                    "profile_id": None,
                    "commercial_profile_id": commercial_profile_id,
                    "display_name": "Alice Bakery",
                    "avatar_file_id": logo_file_id,
                    "is_available": True,
                    "match_rank": 3,
                }
            ],
        )
        commercial_query.eq.assert_any_call("is_public", True)
        commercial_query.eq.assert_any_call("is_available", True)
        active_identities_mock.assert_called_once_with(
            commercial_profile_ids=[commercial_profile_id],
        )

    @patch(
        "apps.chat.services.recipient_search.commercial_profiles.supabase"
    )
    def test_commercial_search_hides_email_when_not_public(
        self,
        supabase_mock,
    ):
        commercial_query = self._query_mock(
            [
                {
                    "id": "44444444-4444-4444-4444-444444444444",
                    "owner_id": "55555555-5555-5555-5555-555555555555",
                    "display_name": "Alice Bakery",
                    "phone_dial_code": "+57",
                    "phone_number": "3001234567",
                    "public_email": "contact@alice.co",
                    "logo_file_id": "66666666-6666-6666-6666-666666666666",
                    "is_public": True,
                    "is_available": True,
                    "is_phone_public": True,
                    "is_email_public": False,
                }
            ]
        )
        supabase_client = Mock()
        supabase_client.table.return_value = commercial_query
        supabase_mock.return_value = supabase_client

        from apps.chat.services.recipient_search.commercial_profiles import (
            search_commercial_profiles,
        )

        result = search_commercial_profiles(
            user_id="33333333-3333-3333-3333-333333333333",
            query="contact@alice.co",
            phone_digits=None,
            limit=20,
        )

        self.assertEqual(result, [])
