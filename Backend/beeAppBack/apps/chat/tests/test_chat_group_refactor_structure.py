from __future__ import annotations

import ast
from pathlib import Path

from django.test import SimpleTestCase


class ChatGroupRefactorStructureTests(SimpleTestCase):
    def test_group_service_monolith_is_absent(self):
        services_path = Path(__file__).resolve().parents[1] / "services"
        monolith_path = services_path / "chat_group_service.py"

        self.assertFalse(monolith_path.exists())

    def test_group_refactor_modules_stay_within_line_limit(self):
        services_path = Path(__file__).resolve().parents[1] / "services"
        package_path = services_path / "chat_group"

        self.assertTrue(package_path.is_dir())

        for module_path in package_path.glob("*.py"):
            with self.subTest(module=module_path.name):
                line_count = len(
                    module_path.read_text(
                        encoding="utf-8"
                    ).splitlines()
                )
                self.assertLessEqual(line_count, 400)

    def test_no_backend_python_module_imports_group_monolith(self):
        backend_path = Path(__file__).resolve().parents[3]
        forbidden_import = "apps.chat.services.chat_group_service"

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

    def test_group_package_exports_the_complete_public_api(self):
        from apps.chat.services import chat_group

        expected_exports = {
            "create_chat_group",
            "deactivate_chat_group",
            "get_chat_group_invite",
            "invite_identity_to_chat_group",
            "leave_chat_group",
            "list_chat_group_invites",
            "remove_identity_from_chat_group",
            "respond_to_chat_group_invite",
            "set_chat_group_participant_role",
            "transfer_chat_group_ownership",
            "update_chat_group",
        }

        self.assertEqual(set(chat_group.__all__), expected_exports)

        for function_name in expected_exports:
            with self.subTest(function=function_name):
                self.assertTrue(
                    callable(getattr(chat_group, function_name))
                )
