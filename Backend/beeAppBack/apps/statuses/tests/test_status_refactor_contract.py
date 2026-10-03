from __future__ import annotations

import importlib
import inspect
from unittest import TestCase
from unittest.mock import patch

from apps.statuses.exceptions import (
    StatusNotFoundError,
    StatusValidationError,
)


PUBLIC_FUNCTIONS = (
    "list_active_text_backgrounds",
    "create_status_story",
    "list_status_feed",
    "get_my_statuses",
    "list_author_status_stories",
    "get_status_story",
    "register_status_story_view",
    "list_status_story_viewers",
    "archive_status_story",
)


class StatusRefactorContractTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.service = importlib.import_module(
            "apps.statuses.services.status_refactor"
        )
        cls.validation = importlib.import_module(
            "apps.statuses.services.status_refactor.validation"
        )

    def test_exports_all_public_functions(self):
        for function_name in PUBLIC_FUNCTIONS:
            self.assertTrue(
                callable(getattr(self.service, function_name))
            )

    def test_create_story_signature_is_keyword_only(self):
        signature = inspect.signature(
            self.service.create_status_story
        )
        self.assertTrue(
            all(
                parameter.kind is inspect.Parameter.KEYWORD_ONLY
                for parameter in signature.parameters.values()
            )
        )

    def test_normalize_actor_type(self):
        self.assertEqual(
            self.validation.normalize_actor_type("profile"),
            "profile",
        )
        self.assertEqual(
            self.validation.normalize_actor_type(
                " commercial_profile "
            ),
            "commercial_profile",
        )

        for value in ("", "company", "PROFILE", None):
            with self.subTest(value=value):
                with self.assertRaises(StatusValidationError):
                    self.validation.normalize_actor_type(value)

    def test_normalize_story_kind_includes_gif(self):
        self.assertEqual(
            self.validation.normalize_story_kind("gif"),
            "gif",
        )

    def test_normalize_optional_text(self):
        cases = (
            (None, None),
            ("  hello  ", "hello"),
            ("", None),
            ("   ", None),
        )

        for value, expected in cases:
            with self.subTest(value=value):
                self.assertEqual(
                    self.validation.normalize_optional_text(value),
                    expected,
                )

    def test_register_view_maps_unavailable_story(self):
        commands = importlib.import_module(
            "apps.statuses.services.status_refactor.story_commands"
        )

        with patch.object(
            commands,
            "execute_with_supabase_admin_retry",
            side_effect=Exception("STATUS_STORY_NOT_AVAILABLE"),
        ):
            with self.assertRaises(StatusNotFoundError):
                commands.register_status_story_view(
                    user_id="user-id",
                    story_id="story-id",
                )

    def test_rollback_archives_and_deletes_objects(self):
        creation = importlib.import_module(
            "apps.statuses.services.status_refactor.story_creation"
        )

        with (
            patch.object(creation, "archive_story_safely") as archive_story,
            patch.object(
                creation,
                "delete_status_media_object_safely",
            ) as delete_object,
        ):
            creation.rollback_story_creation(
                story={"id": "story-id"},
                owner_profile_id="owner-id",
                uploaded_media={
                    "bucket_id": "bucket-id",
                    "storage_path": "media-path",
                },
                uploaded_image_layers=[
                    {
                        "bucket_id": "bucket-id",
                        "storage_path": "layer-path",
                    },
                ],
            )

        archive_story.assert_called_once_with(
            owner_profile_id="owner-id",
            story_id="story-id",
        )
        self.assertEqual(delete_object.call_count, 2)

    def test_create_text_story_uses_expected_rpc_payload(self):
        creation = importlib.import_module(
            "apps.statuses.services.status_refactor.story_creation"
        )

        class Response:
            data = [{"id": "story-id"}]

        captured_calls = []

        def execute_operation(operation):
            class Client:
                def rpc(self, name, payload):
                    captured_calls.append((name, payload))
                    return self

                def execute(self):
                    return Response()

            return operation(Client())

        with (
            patch.object(
                creation,
                "resolve_owned_actor",
                return_value=("user-id", None, "user-id"),
            ),
            patch.object(
                creation,
                "execute_with_supabase_admin_retry",
                side_effect=execute_operation,
            ),
            patch.object(
                creation,
                "create_status_mention_notifications_safely",
            ),
            patch(
                "apps.statuses.services.status_refactor.story_queries."
                "get_status_story",
                return_value={"id": "story-id"},
            ),
        ):
            result = creation.create_status_story(
                user_id="user-id",
                actor_type="profile",
                actor_commercial_profile_id=None,
                kind="text",
                caption="  caption  ",
                text_content="  content  ",
                text_background_id="background-id",
                editor_metadata={"font": "bold"},
            )

        self.assertEqual(result, {"id": "story-id"})
        self.assertEqual(captured_calls[0][0], "status_create_story")
        self.assertEqual(
            captured_calls[0][1]["p_text_content"],
            "content",
        )

    def test_empty_author_uses_actor_presentation_fallback(self):
        queries = importlib.import_module(
            "apps.statuses.services.status_refactor.story_queries"
        )

        class Response:
            data = []

        with (
            patch.object(
                queries,
                "execute_with_supabase_admin_retry",
                return_value=Response(),
            ),
            patch.object(
                queries,
                "get_actor_presentation",
                return_value={"actor_id": "actor-id"},
            ),
        ):
            result = queries.list_author_status_stories(
                user_id="user-id",
                actor_type="profile",
                actor_id="actor-id",
            )

        self.assertEqual(result["stories"], [])
        self.assertEqual(result["actor"], {"actor_id": "actor-id"})
