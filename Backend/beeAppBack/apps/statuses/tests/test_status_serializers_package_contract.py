from __future__ import annotations

import importlib
import inspect
import unittest
from uuid import uuid4

from apps.statuses.serializers import (
    StatusCreateSerializer,
    StatusDetailQuerySerializer,
    StatusFeedAuthorSerializer,
    StatusFeedQuerySerializer,
    StatusFollowCreateSerializer,
    StatusFollowDiscoverItemSerializer,
    StatusFollowDiscoverQuerySerializer,
    StatusFollowListItemSerializer,
    StatusFollowListQuerySerializer,
    StatusFollowSerializer,
    StatusFollowersQuerySerializer,
    StatusMineQuerySerializer,
    StatusReplySerializer,
    StatusStorySerializer,
    StatusTextBackgroundSerializer,
    StatusViewerSerializer,
)


PUBLIC_SERIALIZER_NAMES = (
    "StatusCreateSerializer",
    "StatusDetailQuerySerializer",
    "StatusFeedAuthorSerializer",
    "StatusFeedQuerySerializer",
    "StatusFollowCreateSerializer",
    "StatusFollowDiscoverItemSerializer",
    "StatusFollowDiscoverQuerySerializer",
    "StatusFollowListItemSerializer",
    "StatusFollowListQuerySerializer",
    "StatusFollowSerializer",
    "StatusFollowersQuerySerializer",
    "StatusMineQuerySerializer",
    "StatusReplySerializer",
    "StatusStorySerializer",
    "StatusTextBackgroundSerializer",
    "StatusViewerSerializer",
)

REFACTORED_MODULE_PREFIX = "apps.statuses.serializers."


class StatusSerializersPackageContractTests(unittest.TestCase):
    def test_public_package_exports_expected_serializers(self):
        serializers_package = importlib.import_module(
            "apps.statuses.serializers"
        )

        self.assertEqual(
            tuple(serializers_package.__all__),
            PUBLIC_SERIALIZER_NAMES,
        )

        for serializer_name in PUBLIC_SERIALIZER_NAMES:
            self.assertTrue(
                hasattr(serializers_package, serializer_name),
                serializer_name,
            )

    def test_public_serializers_come_from_refactored_modules(self):
        for serializer_class in (
            StatusCreateSerializer,
            StatusDetailQuerySerializer,
            StatusFeedAuthorSerializer,
            StatusFeedQuerySerializer,
            StatusFollowCreateSerializer,
            StatusFollowDiscoverItemSerializer,
            StatusFollowDiscoverQuerySerializer,
            StatusFollowListItemSerializer,
            StatusFollowListQuerySerializer,
            StatusFollowSerializer,
            StatusFollowersQuerySerializer,
            StatusMineQuerySerializer,
            StatusReplySerializer,
            StatusStorySerializer,
            StatusTextBackgroundSerializer,
            StatusViewerSerializer,
        ):
            self.assertTrue(
                serializer_class.__module__.startswith(
                    REFACTORED_MODULE_PREFIX
                ),
                serializer_class.__module__,
            )
            self.assertNotEqual(
                inspect.getsourcefile(serializer_class),
                None,
            )

    def test_text_story_contract_remains_valid(self):
        serializer = StatusCreateSerializer(
            data={
                "kind": "text",
                "text_content": "Estado de prueba",
                "text_background_id": str(uuid4()),
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["image_layer_files"],
            [],
        )

    def test_profile_story_rejects_commercial_offer_link(self):
        serializer = StatusCreateSerializer(
            data={
                "kind": "text",
                "text_content": "Estado de prueba",
                "text_background_id": str(uuid4()),
                "commercial_offer_link": {
                    "commercial_offer_id": str(uuid4()),
                    "commercial_offer_image_id": str(uuid4()),
                    "image_layer_id": "offer-layer",
                    "x": 50,
                    "y": 50,
                    "scale": 1,
                    "rotation": 0,
                    "size": 100,
                },
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "commercial_offer_link",
            serializer.errors,
        )

    def test_reply_contract_rejects_blank_body(self):
        serializer = StatusReplySerializer(
            data={
                "sender_identity_id": str(uuid4()),
                "body": "   ",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("body", serializer.errors)
