from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

from apps.statuses.services.status_follow_service import (
    discover_follow_targets,
)


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeRpcQuery:
    def __init__(self, client, function_name, payload):
        self.client = client
        self.function_name = function_name
        self.payload = payload

    def execute(self):
        self.client.rpc_calls.append(
            {
                "function_name": self.function_name,
                "payload": self.payload,
            }
        )
        return FakeResponse(self.client.rows)


class FakeSupabase:
    def __init__(self, rows):
        self.rows = rows
        self.rpc_calls = []

    def rpc(self, function_name, payload):
        return FakeRpcQuery(
            self,
            function_name,
            payload,
        )


class DiscoverFollowTargetsTests(TestCase):
    def test_discovery_uses_unified_rpc_and_serializes_identity(self):
        rows = [
            {
                "actor_type": "profile",
                "profile_id": (
                    "11111111-1111-1111-1111-111111111111"
                ),
                "commercial_profile_id": None,
                "identity_id": (
                    "22222222-2222-2222-2222-222222222222"
                ),
                "display_name": "Persona de prueba",
                "avatar_file_id": (
                    "33333333-3333-3333-3333-333333333333"
                ),
                "follow_id": (
                    "44444444-4444-4444-4444-444444444444"
                ),
                "follow_state": "pending",
                "match_rank": 3,
                "next_cursor": "3|persona de prueba|profile|111",
            },
            {
                "actor_type": "commercial_profile",
                "profile_id": None,
                "commercial_profile_id": (
                    "55555555-5555-5555-5555-555555555555"
                ),
                "identity_id": (
                    "66666666-6666-6666-6666-666666666666"
                ),
                "display_name": "Negocio de prueba",
                "avatar_file_id": None,
                "follow_id": None,
                "follow_state": None,
                "match_rank": 3,
                "next_cursor": "3|persona de prueba|profile|111",
            },
        ]
        supabase = FakeSupabase(rows)

        with patch(
            "apps.statuses.services.status_follow_service."
            "get_supabase_user_client",
            return_value=supabase,
        ):
            result = discover_follow_targets(
                user_id="77777777-7777-7777-7777-777777777777",
                access_token="test-access-token",
                query="prueba",
                limit=20,
                cursor=None,
            )

        self.assertEqual(
            result["query"],
            "prueba",
        )
        self.assertEqual(result["limit"], 20)
        self.assertEqual(
            result["next_cursor"],
            "3|persona de prueba|profile|111",
        )
        self.assertEqual(
            supabase.rpc_calls,
            [
                {
                    "function_name": (
                        "status_discover_people_targets"
                    ),
                    "payload": {
                        "p_follower_actor_type": "profile",
                        "p_follower_profile_id": (
                            "77777777-7777-7777-7777-777777777777"
                        ),
                        "p_follower_commercial_profile_id": None,
                        "p_query": "prueba",
                        "p_limit": 20,
                        "p_cursor": None,
                    },
                }
            ],
        )
        self.assertEqual(
            result["items"],
            [
                {
                    "actor_type": "profile",
                    "profile_id": (
                        "11111111-1111-1111-1111-111111111111"
                    ),
                    "commercial_profile_id": None,
                    "identity_id": (
                        "22222222-2222-2222-2222-222222222222"
                    ),
                    "display_name": "Persona de prueba",
                    "avatar_file_id": (
                        "33333333-3333-3333-3333-333333333333"
                    ),
                    "follow_id": (
                        "44444444-4444-4444-4444-444444444444"
                    ),
                    "follow_state": "pending",
                },
                {
                    "actor_type": "commercial_profile",
                    "profile_id": None,
                    "commercial_profile_id": (
                        "55555555-5555-5555-5555-555555555555"
                    ),
                    "identity_id": (
                        "66666666-6666-6666-6666-666666666666"
                    ),
                    "display_name": "Negocio de prueba",
                    "avatar_file_id": None,
                    "follow_id": None,
                    "follow_state": None,
                },
            ],
        )


class UnfollowTests(TestCase):
    def test_personal_follower_cancels_pending_request(self):
        follow_id = "11111111-1111-1111-1111-111111111111"
        user_id = "22222222-2222-2222-2222-222222222222"
        rpc_calls = []

        class FakeResponse:
            data = True

        def fake_execute_with_retry(operation):
            class FakeClient:
                def rpc(self, function_name, payload):
                    rpc_calls.append(
                        {
                            "function_name": function_name,
                            "payload": payload,
                        }
                    )

                    class FakeQuery:
                        def execute(self):
                            return FakeResponse()

                    return FakeQuery()

            return operation(FakeClient())

        follow = {
            "id": follow_id,
            "follower_actor_type": "profile",
            "follower_profile_id": user_id,
            "follower_commercial_profile_id": None,
            "target_actor_type": "profile",
            "target_profile_id": (
                "33333333-3333-3333-3333-333333333333"
            ),
            "target_commercial_profile_id": None,
            "state": "pending",
        }

        with patch(
            "apps.statuses.services.status_follow_service."
            "_get_follow_by_id",
            return_value=follow,
        ), patch(
            "apps.statuses.services.status_follow_service."
            "execute_with_supabase_admin_retry",
            side_effect=fake_execute_with_retry,
        ):
            from apps.statuses.services.status_follow_service import (
                unfollow,
            )

            unfollow(
                user_id=user_id,
                follow_id=follow_id,
            )

        self.assertEqual(
            rpc_calls,
            [
                {
                    "function_name": "status_unfollow",
                    "payload": {
                        "p_follower_actor_type": "profile",
                        "p_follower_profile_id": user_id,
                        "p_follower_commercial_profile_id": None,
                        "p_follow_id": follow_id,
                    },
                }
            ],
        )

    def test_commercial_follower_removes_accepted_follow(self):
        follow_id = "44444444-4444-4444-4444-444444444444"
        user_id = "55555555-5555-5555-5555-555555555555"
        commercial_profile_id = (
            "66666666-6666-6666-6666-666666666666"
        )
        rpc_calls = []

        class FakeResponse:
            data = True

        def fake_execute_with_retry(operation):
            class FakeClient:
                def rpc(self, function_name, payload):
                    rpc_calls.append(
                        {
                            "function_name": function_name,
                            "payload": payload,
                        }
                    )

                    class FakeQuery:
                        def execute(self):
                            return FakeResponse()

                    return FakeQuery()

            return operation(FakeClient())

        follow = {
            "id": follow_id,
            "follower_actor_type": "commercial_profile",
            "follower_profile_id": None,
            "follower_commercial_profile_id": (
                commercial_profile_id
            ),
            "target_actor_type": "commercial_profile",
            "target_profile_id": None,
            "target_commercial_profile_id": (
                "77777777-7777-7777-7777-777777777777"
            ),
            "state": "accepted",
        }

        with patch(
            "apps.statuses.services.status_follow_service."
            "_get_follow_by_id",
            return_value=follow,
        ), patch(
            "apps.statuses.services.status_follow_service."
            "_get_commercial_profile",
            return_value={
                "id": commercial_profile_id,
                "owner_id": user_id,
            },
        ), patch(
            "apps.statuses.services.status_follow_service."
            "execute_with_supabase_admin_retry",
            side_effect=fake_execute_with_retry,
        ):
            from apps.statuses.services.status_follow_service import (
                unfollow,
            )

            unfollow(
                user_id=user_id,
                follow_id=follow_id,
            )

        self.assertEqual(
            rpc_calls,
            [
                {
                    "function_name": "status_unfollow",
                    "payload": {
                        "p_follower_actor_type": (
                            "commercial_profile"
                        ),
                        "p_follower_profile_id": None,
                        "p_follower_commercial_profile_id": (
                            commercial_profile_id
                        ),
                        "p_follow_id": follow_id,
                    },
                }
            ],
        )
