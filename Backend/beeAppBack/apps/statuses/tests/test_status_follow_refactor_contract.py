from __future__ import annotations

import importlib
import inspect
from unittest import TestCase
from unittest.mock import patch

from apps.statuses.exceptions import (
    StatusFollowAccessError,
    StatusFollowValidationError,
)


PUBLIC_FUNCTIONS = (
    "accept_follow_request",
    "discover_follow_targets",
    "get_follow_for_user",
    "list_followers",
    "list_following",
    "list_received_follow_requests",
    "reject_follow_request",
    "request_follow",
    "unfollow",
)


class FakeResponse:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count


class StatusFollowRefactorContractTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.service = importlib.import_module(
            "apps.statuses.services.status_follow_refactor"
        )
        cls.access = importlib.import_module(
            "apps.statuses.services.status_follow_refactor.access"
        )
        cls.discovery = importlib.import_module(
            "apps.statuses.services.status_follow_refactor.discovery"
        )
        cls.operations = importlib.import_module(
            "apps.statuses.services.status_follow_refactor.operations"
        )

    def test_exports_all_public_functions(self):
        for function_name in PUBLIC_FUNCTIONS:
            with self.subTest(function_name=function_name):
                self.assertTrue(
                    callable(getattr(self.service, function_name))
                )

    def test_public_function_parameters_are_keyword_only(self):
        for function_name in PUBLIC_FUNCTIONS:
            with self.subTest(function_name=function_name):
                signature = inspect.signature(
                    getattr(self.service, function_name)
                )
                self.assertTrue(
                    all(
                        parameter.kind
                        is inspect.Parameter.KEYWORD_ONLY
                        for parameter in signature.parameters.values()
                    )
                )

    def test_normalize_actor_type(self):
        self.assertEqual(
            self.access.normalize_actor_type("profile"),
            "profile",
        )
        self.assertEqual(
            self.access.normalize_actor_type(
                " commercial_profile "
            ),
            "commercial_profile",
        )

        for value in ("", "company", "PROFILE", None):
            with self.subTest(value=value):
                with self.assertRaises(
                    StatusFollowValidationError
                ):
                    self.access.normalize_actor_type(value)

    def test_discovery_uses_expected_rpc_payload(self):
        captured_calls = []

        class Client:
            def rpc(self, name, payload):
                captured_calls.append((name, payload))
                return self

            def execute(self):
                return FakeResponse(
                    [
                        {
                            "actor_type": "profile",
                            "profile_id": "profile-id",
                            "commercial_profile_id": None,
                            "identity_id": "identity-id",
                            "display_name": "Persona",
                            "avatar_file_id": "avatar-id",
                            "follow_id": None,
                            "follow_state": None,
                            "next_cursor": "cursor-value",
                        }
                    ]
                )

        result = self.discovery.discover_follow_targets(
            user_id="user-id",
            access_token="access-token",
            query="  Persona  ",
            limit=99,
            cursor=" cursor-value ",
            get_user_client=lambda **kwargs: Client(),
            avatar_url_builder=lambda **kwargs: (
                f"https://signed.example/{kwargs['avatar_file_id']}"
            ),
        )

        self.assertEqual(
            captured_calls,
            [
                (
                    "status_discover_people_targets",
                    {
                        "p_follower_actor_type": "profile",
                        "p_follower_profile_id": "user-id",
                        "p_follower_commercial_profile_id": None,
                        "p_query": "persona",
                        "p_limit": 20,
                        "p_cursor": "cursor-value",
                    },
                )
            ],
        )
        self.assertEqual(result["next_cursor"], "cursor-value")
        self.assertEqual(
            result["items"][0]["avatar_url"],
            "https://signed.example/avatar-id",
        )

    def test_discovery_rejects_short_query(self):
        with self.assertRaises(StatusFollowValidationError):
            self.discovery.discover_follow_targets(
                user_id="user-id",
                access_token="access-token",
                query="x",
                get_user_client=lambda **kwargs: None,
                avatar_url_builder=lambda **kwargs: None,
            )

    def test_unfollow_personal_uses_expected_rpc_payload(self):
        captured_calls = []

        class Client:
            def rpc(self, name, payload):
                captured_calls.append((name, payload))
                return self

            def execute(self):
                return FakeResponse(True)

        self.operations.unfollow(
            user_id="user-id",
            access_token="access-token",
            follow_id="follow-id",
            get_user_client=lambda **kwargs: Client(),
            follow_loader=lambda **kwargs: {
                "follower_actor_type": "profile",
                "follower_profile_id": "user-id",
            },
        )

        self.assertEqual(
            captured_calls,
            [
                (
                    "status_unfollow",
                    {
                        "p_follower_actor_type": "profile",
                        "p_follower_profile_id": "user-id",
                        "p_follower_commercial_profile_id": None,
                        "p_follow_id": "follow-id",
                    },
                )
            ],
        )

    def test_unfollow_commercial_requires_owner(self):
        with self.assertRaises(StatusFollowAccessError):
            self.operations.unfollow(
                user_id="user-id",
                access_token="access-token",
                follow_id="follow-id",
                get_user_client=lambda **kwargs: None,
                follow_loader=lambda **kwargs: {
                    "follower_actor_type": "commercial_profile",
                    "follower_commercial_profile_id": "commercial-id",
                },
                commercial_loader=lambda **kwargs: {
                    "owner_id": "other-user-id",
                },
            )

    def test_request_follow_serializes_returned_relationship(self):
        follow = {
            "id": "follow-id",
            "follower_profile_id": "user-id",
            "target_actor_type": "profile",
            "target_profile_id": "target-id",
            "target_commercial_profile_id": None,
            "state": "pending",
        }

        class Client:
            def rpc(self, name, payload):
                return self

            def execute(self):
                return FakeResponse([follow])

        with (
            patch.object(
                self.operations,
                "validate_target_exists",
            ),
            patch.object(
                self.operations,
                "validate_follow_target_payload",
            ),
        ):
            result = self.operations.request_follow(
                user_id="user-id",
                access_token="access-token",
                target_actor_type="profile",
                target_profile_id="target-id",
                get_user_client=lambda **kwargs: Client(),
            )

        self.assertEqual(result["id"], "follow-id")
        self.assertEqual(result["state"], "pending")




    def test_invalid_follow_cursor_is_rejected(self):
        listing = importlib.import_module(
            "apps.statuses.services.status_follow_refactor.listing"
        )

        for cursor in ("", "missing-separator", "|", None):
            with self.subTest(cursor=cursor):
                with self.assertRaises(StatusFollowValidationError):
                    listing._parse_follow_cursor(cursor)
