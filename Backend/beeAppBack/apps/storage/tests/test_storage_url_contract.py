from django.test import SimpleTestCase
from django.urls import resolve

from apps.storage.urls import urlpatterns


class StorageUrlContractTests(SimpleTestCase):
    def test_storage_url_names_are_unique(self):
        route_names = [
            route.name
            for route in urlpatterns
        ]

        self.assertEqual(len(route_names), len(set(route_names)))

    def test_storage_views_resolve(self):
        expected_routes = {
            "/summary/": "storage-summary",
            "/files/": "storage-files",
            "/uploads/": "storage-upload",
            "/folders/": "storage-folders",
            "/tags/": "storage-tags",
            "/share-recipients/": "storage-share-recipient-search",
            "/shares/received/": "storage-received-shares",
        }

        for route_path, expected_name in expected_routes.items():
            with self.subTest(route_path=route_path):
                matched_route = next(
                    route
                    for route in urlpatterns
                    if route.name == expected_name
                )
                self.assertIsNotNone(matched_route.callback)
