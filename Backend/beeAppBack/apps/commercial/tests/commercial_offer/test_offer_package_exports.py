from django.test import SimpleTestCase


class CommercialOfferPackageExportsTests(SimpleTestCase):
    def test_exports_all_offer_service_functions(self):
        from apps.commercial.services import commercial_offer

        expected_functions = {
            "add_commercial_offer_image",
            "adjust_commercial_offer_inventory",
            "archive_commercial_offer",
            "archive_commercial_offer_image",
            "create_commercial_offer",
            "delete_commercial_offer_image",
            "disable_commercial_offer",
            "enable_commercial_offer",
            "get_owned_commercial_offer",
            "list_owned_commercial_offers",
            "pause_commercial_offer",
            "publish_commercial_offer",
            "restore_commercial_offer",
            "restore_commercial_offer_image",
            "set_commercial_offer_primary_image",
            "update_commercial_offer",
            "update_commercial_offer_image",
            "update_commercial_offer_modalities",
        }

        self.assertEqual(set(commercial_offer.__all__), expected_functions)

        for function_name in expected_functions:
            self.assertTrue(
                callable(getattr(commercial_offer, function_name)),
                function_name,
            )
