from __future__ import annotations

import importlib
from unittest import TestCase
from unittest.mock import patch


class StatusFollowRefactorListingTests(TestCase):
    def test_follow_list_serializes_profile_target_and_cursor(self):
        targets = importlib.import_module(
            "apps.statuses.services.status_follow_refactor."
            "listing_targets"
        )
        rows = [
            {
                "id": "follow-one",
                "state": "accepted",
                "requested_at": "2026-10-01T10:00:00+00:00",
                "target_actor_type": "profile",
                "target_profile_id": "profile-one",
                "target_commercial_profile_id": None,
                "follower_actor_type": "profile",
                "follower_profile_id": "user-id",
            },
            {
                "id": "follow-two",
                "state": "accepted",
                "requested_at": "2026-10-01T09:00:00+00:00",
                "target_actor_type": "profile",
                "target_profile_id": "profile-two",
                "target_commercial_profile_id": None,
                "follower_actor_type": "profile",
                "follower_profile_id": "user-id",
            },
        ]

        with (
            patch.object(
                targets,
                "get_profiles_for_follow_list",
                return_value={
                    "profile-one": {
                        "id": "profile-one",
                        "first_name": "Persona",
                        "last_name": "Uno",
                        "avatar_file_id": "avatar-one",
                    }
                },
            ),
            patch.object(
                targets,
                "get_commercial_profiles_for_follow_list",
                return_value={},
            ),
        ):
            result = targets.serialize_follow_list(
                rows=rows,
                mode="following",
                limit=1,
                count=2,
                avatar_url_builder=lambda **kwargs: (
                    "https://signed.example/"
                    f"{kwargs['avatar_file_id']}"
                ),
            )

        self.assertEqual(result["count"], 2)
        self.assertEqual(result["limit"], 1)
        self.assertEqual(
            result["next_cursor"],
            "2026-10-01T10:00:00+00:00|follow-one",
        )
        self.assertEqual(
            result["items"],
            [
                {
                    "id": "follow-one",
                    "state": "accepted",
                    "requested_at": "2026-10-01T10:00:00+00:00",
                    "responded_at": None,
                    "accepted_at": None,
                    "rejected_at": None,
                    "target": {
                        "actor_type": "profile",
                        "profile_id": "profile-one",
                        "commercial_profile_id": None,
                        "display_name": "Persona Uno",
                        "avatar_file_id": "avatar-one",
                        "avatar_url": (
                            "https://signed.example/avatar-one"
                        ),
                        "is_available": True,
                    },
                }
            ],
        )

    def test_follow_list_serializes_commercial_target(self):
        targets = importlib.import_module(
            "apps.statuses.services.status_follow_refactor."
            "listing_targets"
        )
        row = {
            "id": "follow-id",
            "state": "accepted",
            "requested_at": "2026-10-01T10:00:00+00:00",
            "target_actor_type": "commercial_profile",
            "target_profile_id": None,
            "target_commercial_profile_id": "commercial-id",
            "follower_actor_type": "profile",
            "follower_profile_id": "user-id",
        }

        with (
            patch.object(
                targets,
                "get_profiles_for_follow_list",
                return_value={},
            ),
            patch.object(
                targets,
                "get_commercial_profiles_for_follow_list",
                return_value={
                    "commercial-id": {
                        "id": "commercial-id",
                        "display_name": "Negocio",
                        "logo_file_id": "logo-id",
                        "is_available": True,
                    }
                },
            ),
        ):
            result = targets.serialize_follow_list(
                rows=[row],
                mode="following",
                limit=20,
                count=1,
                avatar_url_builder=lambda **kwargs: (
                    "https://signed.example/"
                    f"{kwargs['avatar_file_id']}"
                ),
            )

        self.assertEqual(
            result["items"][0]["target"],
            {
                "actor_type": "commercial_profile",
                "profile_id": None,
                "commercial_profile_id": "commercial-id",
                "display_name": "Negocio",
                "avatar_file_id": "logo-id",
                "avatar_url": "https://signed.example/logo-id",
                "is_available": True,
            },
        )
