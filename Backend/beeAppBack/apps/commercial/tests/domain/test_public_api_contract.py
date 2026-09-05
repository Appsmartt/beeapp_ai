from django.test import SimpleTestCase

from apps.commercial.services.domain.public_api_contract import (
    CONTRACT,
    PUBLIC_COMMERCIAL_ENDPOINTS,
    parse_profiles_query_params,
)


class PublicCommercialApiContractTests(SimpleTestCase):
    def test_public_endpoints_have_expected_prefix(self):
        for endpoint in PUBLIC_COMMERCIAL_ENDPOINTS.values():
            self.assertTrue(endpoint.startswith("/api/commercial/public/"))

    def test_profiles_endpoint_is_canonical(self):
        self.assertEqual(
            CONTRACT.profiles_endpoint,
            "/api/commercial/public/profiles/",
        )

    def test_contract_uses_expected_page_limits(self):
        self.assertEqual(CONTRACT.default_page_size, 20)
        self.assertEqual(CONTRACT.max_page_size, 50)

    def test_profiles_query_uses_shared_filter_contract(self):
        filters = parse_profiles_query_params(
            {
                "country_code": "co",
                "category_id": "category-1",
                "modality": "delivery",
                "verified_only": "true",
                "delivery_only": "true",
                "search": "lavadoras",
                "ordering": "relevance",
                "page": "2",
                "page_size": "10",
            }
        )

        self.assertEqual(filters.country_code, "CO")
        self.assertEqual(filters.category_id, "category-1")
        self.assertEqual(filters.modality, "delivery")
        self.assertTrue(filters.verified_only)
        self.assertTrue(filters.delivery_only)
        self.assertEqual(filters.search, "lavadoras")
        self.assertEqual(filters.ordering, "relevance")
        self.assertEqual(filters.page, 2)
        self.assertEqual(filters.page_size, 10)
