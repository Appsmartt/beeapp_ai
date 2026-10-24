from __future__ import annotations

import ast
from pathlib import Path

from django.test import SimpleTestCase


class ChatConversationRefactorStructureTests(SimpleTestCase):
    def test_conversation_service_monolith_is_absent(self):
        services_path = Path(__file__).resolve().parents[1] / "services"
        monolith_path = services_path / "chat_conversation_service.py"

        self.assertFalse(monolith_path.exists())

    def test_conversation_refactor_modules_stay_within_line_limit(self):
        services_path = Path(__file__).resolve().parents[1] / "services"
        package_path = services_path / "chat_conversation"

        self.assertTrue(package_path.is_dir())

        for module_path in package_path.glob("*.py"):
            with self.subTest(module=module_path.name):
                line_count = len(
                    module_path.read_text(
                        encoding="utf-8"
                    ).splitlines()
                )
                self.assertLessEqual(line_count, 400)

    def test_no_backend_module_imports_conversation_monolith(self):
        backend_path = Path(__file__).resolve().parents[3]
        forbidden_import = (
            "apps.chat.services.chat_conversation_service"
        )
        excluded_parts = {
            ".git",
            ".venv",
            "venv",
            "node_modules",
            "__pycache__",
            "tmp",
            "backups",
            "build",
            "dist",
            "coverage",
        }
        offenders = []

        for python_path in backend_path.rglob("*.py"):
            if excluded_parts.intersection(python_path.parts):
                continue

            tree = ast.parse(
                python_path.read_text(encoding="utf-8"),
                filename=str(python_path),
            )
            imports_monolith = any(
                (
                    isinstance(node, ast.ImportFrom)
                    and node.module == forbidden_import
                )
                or (
                    isinstance(node, ast.Import)
                    and any(
                        alias.name == forbidden_import
                        for alias in node.names
                    )
                )
                for node in ast.walk(tree)
            )
            if imports_monolith:
                offenders.append(
                    str(python_path.relative_to(backend_path))
                )

        self.assertEqual(offenders, [])

    def test_conversation_package_exports_complete_public_api(self):
        from apps.chat.services import chat_conversation

        expected_exports = {
            "clear_chat_conversation",
            "create_or_get_direct_conversation",
            "get_chat_inbox",
            "get_chat_unpinned_inbox_by_type",
            "get_conversation",
            "list_conversation_participants",
            "set_chat_conversation_notifications",
            "set_chat_conversation_pinned",
        }

        self.assertEqual(
            set(chat_conversation.__all__),
            expected_exports,
        )

        for function_name in expected_exports:
            with self.subTest(function=function_name):
                self.assertTrue(
                    callable(
                        getattr(
                            chat_conversation,
                            function_name,
                        )
                    )
                )

    def test_internal_helpers_are_focalized(self):
        expected_modules = {
            "access.py": {
                "_build_conversation_permissions",
                "_get_user_active_participant",
                "_require_identity_active_participant",
                "_require_user_conversation_access",
            },
            "avatars.py": {"_attach_inbox_avatar_urls"},
            "commercial.py": {
                "_attach_commercial_inbox_metadata",
                "_load_commercial_inbox_links",
            },
            "validation.py": {"_extract_rpc_uuid"},
        }
        services_path = Path(__file__).resolve().parents[1] / "services"
        package_path = services_path / "chat_conversation"

        for module_name, helper_names in expected_modules.items():
            source = (package_path / module_name).read_text(
                encoding="utf-8"
            )
            for helper_name in helper_names:
                with self.subTest(
                    module=module_name,
                    helper=helper_name,
                ):
                    self.assertIn(
                        f"def {helper_name}(",
                        source,
                    )
