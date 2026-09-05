from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAccessError,
)
from apps.commercial.services.commercial_audit_service import (
    list_owned_commercial_audit_events,
)


class CommercialAuditServiceTests(SimpleTestCase):
    @patch(
        "apps.commercial.services."
        "commercial_audit_service."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_audit_service."
        "get_commercial_user_supabase_client"
    )
    def test_audit_list_rejects_empty_token_before_queries(
        self,
        get_client_mock,
        require_owner_mock,
    ):
        with self.assertRaises(CommercialAccessError) as context:
            list_owned_commercial_audit_events(
                user_id="user-1",
                access_token="   ",
                commercial_profile_id="profile-1",
            )

        get_client_mock.assert_not_called()
        require_owner_mock.assert_not_called()
        self.assertEqual(
            context.exception.code,
            "AUTHENTICATION_REQUIRED",
        )
