from django.test import SimpleTestCase
from django.urls import resolve, reverse


class CommercialRequestFormalDetailUrlTests(SimpleTestCase):
    request_id = "11111111-1111-1111-1111-111111111111"

    def test_formal_detail_url_resolves(self):
        from apps.commercial.request_operations_views import (
            CommercialRequestFormalDetailView,
        )

        url = reverse(
            "commercial-request-formal-detail",
            kwargs={
                "request_id": self.request_id,
            },
        )

        match = resolve(url)

        self.assertEqual(
            match.func.view_class,
            CommercialRequestFormalDetailView,
        )
