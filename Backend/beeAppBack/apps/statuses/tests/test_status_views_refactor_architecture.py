from pathlib import Path
from unittest import TestCase

VIEWS_PACKAGE = Path(__file__).resolve().parents[1] / "views_refactor"
VIEW_MODULES = ("common.py", "story_views.py", "interaction_views.py", "follow_views.py", "follow_action_views.py")
PUBLIC_VIEWS = ("StatusTextBackgroundsView", "StatusFeedView", "StatusMineView", "StatusAuthorStoriesView", "StatusCollectionView", "StatusDetailView", "StatusViewsView", "StatusViewersView", "StatusRepliesView", "StatusFollowsView", "StatusFollowDiscoverView", "StatusFollowingView", "StatusFollowersView", "StatusFollowRequestsView", "StatusFollowDetailView", "StatusFollowAcceptView", "StatusFollowRejectView")

class StatusViewsRefactorArchitectureTests(TestCase):
    def test_refactor_modules_exist_and_stay_small(self):
        for module_name in VIEW_MODULES:
            module_path = VIEWS_PACKAGE / module_name
            self.assertTrue(module_path.is_file())
            self.assertLessEqual(len(module_path.read_text(encoding="utf-8").splitlines()), 400)

    def test_package_exports_every_public_view(self):
        from apps.statuses import views_refactor
        for view_name in PUBLIC_VIEWS:
            self.assertTrue(callable(getattr(views_refactor, view_name, None)))

    def test_refactor_package_does_not_import_the_monolith(self):
        for module_name in ("__init__.py",) + VIEW_MODULES:
            module_content = (VIEWS_PACKAGE / module_name).read_text(encoding="utf-8")
            self.assertNotIn("from apps.statuses.views import", module_content)
            self.assertNotIn("import apps.statuses.views", module_content)

    def test_status_urls_resolve_to_public_refactor_views(self):
        from apps.statuses import urls, views_refactor
        expected_views = {
            "status-text-backgrounds": "StatusTextBackgroundsView",
            "status-feed": "StatusFeedView",
            "status-mine": "StatusMineView",
            "status-author-stories": "StatusAuthorStoriesView",
            "status-views": "StatusViewsView",
            "status-viewers": "StatusViewersView",
            "status-replies": "StatusRepliesView",
            "status-detail": "StatusDetailView",
            "status-collection": "StatusCollectionView",
            "status-follows": "StatusFollowsView",
            "status-follow-discover": "StatusFollowDiscoverView",
            "status-following": "StatusFollowingView",
            "status-followers": "StatusFollowersView",
            "status-follow-requests": "StatusFollowRequestsView",
            "status-follow-accept": "StatusFollowAcceptView",
            "status-follow-reject": "StatusFollowRejectView",
            "status-follow-detail": "StatusFollowDetailView",
        }
        callbacks = {pattern.name: pattern.callback.view_class for pattern in urls.urlpatterns}
        for route_name, view_name in expected_views.items():
            with self.subTest(route_name=route_name):
                self.assertIs(callbacks[route_name], getattr(views_refactor, view_name))

    def test_refactor_package_does_not_import_the_monolith(self):
        for module_name in ("__init__.py",) + VIEW_MODULES:
            module_content = (VIEWS_PACKAGE / module_name).read_text(encoding="utf-8")
            self.assertNotIn("from apps.statuses.views import", module_content)
            self.assertNotIn("import apps.statuses.views", module_content)

    def test_status_urls_resolve_to_public_refactor_views(self):
        from apps.statuses import urls, views_refactor
        expected_views = {
            "status-text-backgrounds": "StatusTextBackgroundsView",
            "status-feed": "StatusFeedView",
            "status-mine": "StatusMineView",
            "status-author-stories": "StatusAuthorStoriesView",
            "status-views": "StatusViewsView",
            "status-viewers": "StatusViewersView",
            "status-replies": "StatusRepliesView",
            "status-detail": "StatusDetailView",
            "status-collection": "StatusCollectionView",
            "status-follows": "StatusFollowsView",
            "status-follow-discover": "StatusFollowDiscoverView",
            "status-following": "StatusFollowingView",
            "status-followers": "StatusFollowersView",
            "status-follow-requests": "StatusFollowRequestsView",
            "status-follow-accept": "StatusFollowAcceptView",
            "status-follow-reject": "StatusFollowRejectView",
            "status-follow-detail": "StatusFollowDetailView",
        }
        callbacks = {pattern.name: pattern.callback.view_class for pattern in urls.urlpatterns}
        for route_name, view_name in expected_views.items():
            with self.subTest(route_name=route_name):
                self.assertIs(callbacks[route_name], getattr(views_refactor, view_name))

    def test_monolith_views_file_has_been_removed(self):
        self.assertFalse((VIEWS_PACKAGE.parent / "views.py").exists())
