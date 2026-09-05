from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialStateError,
)
from apps.commercial.services.commercial_payment_method_service import (
    _get_user_supabase_client,
    create_commercial_payment_method,
    serialize_public_payment_method,
    update_commercial_payment_method,
)


class CommercialPaymentMethodServiceTests(
    SimpleTestCase,
):
    def _payment_method(self, **overrides):
        payment_method = {
            "id": "payment-method-1",
            "commercial_profile_id": "profile-1",
            "payment_method_type": "nequi",
            "display_name": "Nequi",
            "public_details": {
                "provider": "Nequi",
            },
            "private_details": {
                "phone_number": "3001234567",
            },
            "public_instructions": "Solicita instrucciones.",
            "private_instructions": (
                "Paga al número 3001234567."
            ),
            "available_before_acceptance": False,
            "sort_order": 0,
            "status": "active",
            "archived_at": None,
            "created_at": None,
            "updated_at": None,
        }
        payment_method.update(overrides)
        return payment_method

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service."
        "get_commercial_user_supabase_client"
    )
    def test_empty_token_is_rejected_before_client_creation(
        self,
        get_client_mock,
    ):
        with self.assertRaises(CommercialAccessError) as context:
            _get_user_supabase_client(access_token=" ")

        get_client_mock.assert_not_called()
        self.assertEqual(
            context.exception.code,
            "AUTHENTICATION_REQUIRED",
        )

    def test_public_serialization_never_leaks_private_data(self):
        serialized = serialize_public_payment_method(
            self._payment_method()
        )

        self.assertNotIn("private_details", serialized)
        self.assertNotIn(
            "private_instructions",
            serialized,
        )
        self.assertEqual(
            serialized["payment_method_type"],
            "nequi",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service."
        "get_owned_commercial_payment_method"
    )
    def test_archived_payment_method_cannot_be_updated(
        self,
        get_payment_method_mock,
    ):
        get_payment_method_mock.return_value = (
            self._payment_method(status="archived")
        )

        with self.assertRaises(CommercialStateError) as context:
            update_commercial_payment_method(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                payment_method_id="payment-method-1",
                payload={
                    "display_name": "Nuevo nombre",
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service."
        "_get_user_supabase_client"
    )
    def test_create_uses_real_database_column_names(
        self,
        get_client_mock,
        require_owner_mock,
    ):
        class Response:
            data = [
                {
                    **self._payment_method(),
                }
            ]

        class InsertQuery:
            def __init__(self):
                self.payload = None

            def insert(self, payload):
                self.payload = payload
                return self

            def execute(self):
                return Response()

        class RpcQuery:
            def execute(self):
                return type(
                    "RpcResponse",
                    (),
                    {"data": "audit-id"},
                )()

        class Client:
            def __init__(self):
                self.insert_query = InsertQuery()

            def table(self, table_name):
                self.table_name = table_name
                return self.insert_query

            def rpc(self, function_name, parameters):
                self.rpc_function_name = function_name
                self.rpc_parameters = parameters
                return RpcQuery()

        client = Client()
        get_client_mock.return_value = client

        payment_method = create_commercial_payment_method(
            user_id="user-1",
            access_token="token-1",
            commercial_profile_id="profile-1",
            payload={
                "payment_method_type": "nequi",
                "display_name": "Nequi",
                "public_details": {
                    "provider": "Nequi",
                },
                "private_details": {
                    "phone_number": "3001234567",
                },
                "public_instructions": None,
                "private_instructions": (
                    "Paga al número 3001234567."
                ),
                "available_before_acceptance": False,
                "sort_order": 0,
                "is_active": True,
            },
        )

        self.assertEqual(
            client.table_name,
            "commercial_payment_methods",
        )
        self.assertIn(
            "payment_method_type",
            client.insert_query.payload,
        )
        self.assertNotIn(
            "payment_type",
            client.insert_query.payload,
        )
        self.assertEqual(
            payment_method["payment_method_type"],
            "nequi",
        )


class CommercialPaymentMethodConflictTests(
    SimpleTestCase,
):
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service."
        "_get_user_supabase_client"
    )
    def test_duplicate_active_payment_type_is_conflict(
        self,
        get_client_mock,
        require_owner_mock,
    ):
        from apps.commercial.exceptions import (
            CommercialConflictError,
        )
        from apps.commercial.services.commercial_payment_method_service import (
            create_commercial_payment_method,
        )

        class Query:
            def insert(self, payload):
                return self

            def execute(self):
                raise Exception(
                    "duplicate key value violates unique constraint "
                    "commercial_payment_methods_one_active_type_idx"
                )

        class Client:
            def table(self, table_name):
                self.table_name = table_name
                return Query()

        get_client_mock.return_value = Client()

        with self.assertRaises(
            CommercialConflictError,
        ) as context:
            create_commercial_payment_method(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                payload={
                    "payment_method_type": "nequi",
                    "display_name": "Nequi",
                    "public_details": {},
                    "private_details": {
                        "phone_number": "3001234567",
                    },
                    "public_instructions": None,
                    "private_instructions": None,
                    "available_before_acceptance": False,
                    "sort_order": 0,
                    "is_active": True,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_TYPE_ALREADY_ACTIVE",
        )
