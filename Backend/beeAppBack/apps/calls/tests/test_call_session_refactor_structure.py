from pathlib import Path

from django.test import SimpleTestCase


CALLS_DIRECTORY = Path(__file__).resolve().parents[1]
SERVICES_DIRECTORY = CALLS_DIRECTORY / "services"
CALL_SESSION_DIRECTORY = SERVICES_DIRECTORY / "call_session"
REFACTORED_VIEWS_DIRECTORY = CALLS_DIRECTORY / "refactored_views"
URLS_PATH = CALLS_DIRECTORY / "urls.py"


class CallSessionRefactorStructureTests(SimpleTestCase):
    def test_call_session_modules_are_present(self):
        expected_files = {
            "__init__.py",
            "validation_service.py",
            "repository_service.py",
            "identity_service.py",
            "credentials_service.py",
        }

        self.assertTrue(CALL_SESSION_DIRECTORY.is_dir())

        existing_files = {
            path.name
            for path in CALL_SESSION_DIRECTORY.iterdir()
            if path.is_file()
        }

        self.assertTrue(expected_files <= existing_files)

    def test_call_session_modules_stay_under_limit(self):
        for module_path in CALL_SESSION_DIRECTORY.glob("*.py"):
            line_count = len(
                module_path.read_text(
                    encoding="utf-8"
                ).splitlines()
            )
            self.assertLessEqual(
                line_count,
                400,
                f"{module_path} exceeds 400 lines.",
            )

    def test_refactored_call_view_modules_are_present(self):
        expected_files = {
            "__init__.py",
            "common.py",
            "start_and_query_views.py",
            "participant_views.py",
            "lifecycle_views.py",
        }

        self.assertTrue(REFACTORED_VIEWS_DIRECTORY.is_dir())

        existing_files = {
            path.name
            for path in REFACTORED_VIEWS_DIRECTORY.iterdir()
            if path.is_file()
        }

        self.assertTrue(expected_files <= existing_files)

    def test_refactored_call_view_modules_stay_under_limit(self):
        for module_path in REFACTORED_VIEWS_DIRECTORY.glob("*.py"):
            line_count = len(
                module_path.read_text(
                    encoding="utf-8"
                ).splitlines()
            )
            self.assertLessEqual(
                line_count,
                400,
                f"{module_path} exceeds 400 lines.",
            )

    def test_call_urls_use_refactored_views_only(self):
        urls_content = URLS_PATH.read_text(encoding="utf-8")

        self.assertIn(
            "from apps.calls.refactored_views import (",
            urls_content,
        )
        self.assertNotIn(
            "from apps.calls.views import (",
            urls_content,
        )

    def test_call_urls_keep_all_public_route_names(self):
        urls_content = URLS_PATH.read_text(encoding="utf-8")

        expected_route_names = {
            "start-call",
            "active-call-for-conversation",
            "call-history-for-conversation",
            "join-call",
            "refresh-call-rtc-token",
            "confirm-call-joined",
            "cancel-call-join-attempt",
            "decline-direct-call",
            "kick-call-participant",
            "leave-call",
            "end-call",
            "call-detail",
        }

        for route_name in expected_route_names:
            self.assertIn(
                f'name="{route_name}"',
                urls_content,
            )

    def test_legacy_call_views_module_is_removed(self):
        self.assertFalse(
            (CALLS_DIRECTORY / "views.py").exists()
        )
