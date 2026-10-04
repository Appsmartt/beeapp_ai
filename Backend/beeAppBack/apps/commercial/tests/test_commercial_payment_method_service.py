from unittest.mock import patch

from django.test import SimpleTestCase

from apps.commercial.exceptions import (
    CommercialAccessError,
    CommercialOperationError,
    CommercialStateError,
    CommercialValidationError,
)
from apps.commercial.services.commercial_payment_method_service import (
    create_commercial_payment_method,
    serialize_public_payment_method,
    update_commercial_payment_method,
)
from apps.commercial.services.commercial_payment_method_service.client import (
    get_user_supabase_client,
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
        "commercial_payment_method_service.client."
        "get_commercial_user_supabase_client"
    )
    def test_empty_token_is_rejected_before_client_creation(
        self,
        get_client_mock,
    ):
        with self.assertRaises(CommercialAccessError) as context:
            get_user_supabase_client(access_token=" ")

        get_client_mock.assert_not_called()
        self.assertEqual(
            context.exception.code,
            "AUTHENTICATION_REQUIRED",
        )

    def test_public_serialization_never_leaks_private_data(self):
        serialized = serialize_public_payment_method(
            {
                **self._payment_method(),
                "commercial_mobile_payment_accounts": [
                    {
                        "wallet_type": "nequi",
                        "payment_key": "3001234567",
                        "account_holder_name": "Owner",
                    }
                ],
                "private_details": {
                    "phone_number": "3001234567",
                },
                "private_instructions": (
                    "Paga al número 3001234567."
                ),
            }
        )

        self.assertNotIn("private_details", serialized)
        self.assertNotIn(
            "private_instructions",
            serialized,
        )
        self.assertNotIn("mobile_account", serialized)
        self.assertNotIn("bank_account", serialized)
        self.assertEqual(
            serialized["payment_method_type"],
            "nequi",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.operations."
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
                    "sort_order": 0,
                    "mobile_account": {
                        "wallet_type": "nequi",
                        "payment_key": "3001234567",
                    },
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.operations."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.operations."
        "get_user_supabase_client"
    )
    def test_create_uses_real_database_column_names(
        self,
        get_client_mock,
        require_owner_mock,
    ):
        payment_method_data = {
            **self._payment_method(),
            "mobile_account": {
                "wallet_type": "nequi",
                "payment_key": "3001234567",
                "account_holder_name": "Owner",
            },
            "bank_account": None,
        }

        class UpsertQuery:
            def execute(self):
                return type(
                    "UpsertResponse",
                    (),
                    {"data": [payment_method_data]},
                )()

        class AuditQuery:
            def execute(self):
                return type(
                    "AuditResponse",
                    (),
                    {"data": "audit-id"},
                )()

        class Client:
            def __init__(self):
                self.rpc_calls = []

            def rpc(self, function_name, parameters):
                self.rpc_calls.append((function_name, parameters))
                if function_name == "commerce_upsert_owned_payment_method":
                    return UpsertQuery()
                return AuditQuery()

        client = Client()
        get_client_mock.return_value = client

        payment_method = create_commercial_payment_method(
            user_id="user-1",
            access_token="token-1",
            commercial_profile_id="profile-1",
            payload={
                "payment_method_type": "nequi",
                "display_name": "Nequi",
                "sort_order": 0,
                "mobile_account": {
                    "wallet_type": "nequi",
                    "payment_key": "3001234567",
                    "account_holder_name": "Owner",
                },
                "bank_account": None,
            },
        )

        upsert_name, upsert_parameters = client.rpc_calls[0]
        audit_name, audit_parameters = client.rpc_calls[1]
        self.assertEqual(
            upsert_name,
            "commerce_upsert_owned_payment_method",
        )
        self.assertIn("p_payment_method_type", upsert_parameters)
        self.assertNotIn("payment_type", upsert_parameters)
        self.assertEqual(
            audit_name,
            "commerce_write_audit_event",
        )
        self.assertEqual(
            audit_parameters["p_entity_type"],
            "commercial_payment_method",
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
        "commercial_payment_method_service.operations."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.operations."
        "get_user_supabase_client"
    )
    def test_duplicate_active_payment_type_is_conflict(
        self,
        get_client_mock,
        require_owner_mock,
    ):
        class UpsertQuery:
            def execute(self):
                raise Exception(
                    "duplicate key value violates unique constraint "
                    "commercial_payment_methods_one_active_type_idx"
                )

        class Client:
            def rpc(self, function_name, parameters):
                self.rpc_function_name = function_name
                self.rpc_parameters = parameters
                return UpsertQuery()

        get_client_mock.return_value = Client()

        with self.assertRaises(
            CommercialOperationError,
        ) as context:
            create_commercial_payment_method(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                payload={
                    "payment_method_type": "nequi",
                    "display_name": "Nequi",
                    "sort_order": 0,
                    "mobile_account": {
                        "wallet_type": "nequi",
                        "payment_key": "3001234567",
                    },
                    "bank_account": None,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_CREATE_FAILED",
        )


class CommercialPaymentMethodSerializationTests(
    SimpleTestCase,
):
    def _base_payment_method(self, **overrides):
        payment_method = {
            "id": "payment-method-1",
            "commercial_profile_id": "profile-1",
            "payment_method_type": "nequi",
            "display_name": "Nequi",
            "sort_order": 0,
            "status": "active",
            "archived_at": None,
            "created_at": "2026-10-04T00:00:00+00:00",
            "updated_at": "2026-10-04T00:00:00+00:00",
            "commercial_mobile_payment_accounts": [
                {
                    "wallet_type": "nequi",
                    "payment_key": "3001234567",
                    "account_holder_name": "Owner",
                }
            ],
            "commercial_bank_accounts": [],
        }
        payment_method.update(overrides)
        return payment_method

    def test_owned_mobile_serialization_returns_expected_data(self):
        from apps.commercial.services.commercial_payment_method_service.serialization import (
            serialize_owned_payment_method,
        )

        serialized = serialize_owned_payment_method(
            self._base_payment_method()
        )

        self.assertEqual(
            serialized["mobile_account"]["payment_key"],
            "3001234567",
        )
        self.assertIsNone(serialized["bank_account"])

    def test_owned_bank_serialization_returns_expected_data(self):
        from apps.commercial.services.commercial_payment_method_service.serialization import (
            serialize_owned_payment_method,
        )

        serialized = serialize_owned_payment_method(
            self._base_payment_method(
                payment_method_type="bank_account",
                commercial_mobile_payment_accounts=[],
                commercial_bank_accounts=[
                    {
                        "account_holder_name": "Owner",
                        "account_holder_document_type": "cc",
                        "account_holder_document_number": "123456",
                        "bank_name": "Bank",
                        "account_type": "savings",
                        "account_number": "123456789",
                    }
                ],
            )
        )

        self.assertIsNone(serialized["mobile_account"])
        self.assertEqual(
            serialized["bank_account"]["account_number"],
            "123456789",
        )

    def test_owned_serialization_rejects_missing_details(self):
        from apps.commercial.services.commercial_payment_method_service.serialization import (
            serialize_owned_payment_method,
        )

        with self.assertRaises(CommercialOperationError) as context:
            serialize_owned_payment_method(
                self._base_payment_method(
                    commercial_mobile_payment_accounts=[],
                )
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_DETAILS_MISSING",
        )

    def test_owned_serialization_rejects_unknown_type(self):
        from apps.commercial.services.commercial_payment_method_service.serialization import (
            serialize_owned_payment_method,
        )

        with self.assertRaises(CommercialOperationError) as context:
            serialize_owned_payment_method(
                self._base_payment_method(
                    payment_method_type="cash",
                )
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_TYPE_INVALID",
        )


class CommercialPaymentMethodValidationTests(
    SimpleTestCase,
):
    def _current_payment_method(self, **overrides):
        payment_method = {
            "payment_method_type": "nequi",
            "display_name": "Nequi",
            "sort_order": 0,
            "status": "active",
        }
        payment_method.update(overrides)
        return payment_method

    def test_mobile_update_requires_mobile_account(self):
        from apps.commercial.services.commercial_payment_method_service.validation import (
            build_update_payload,
        )

        with self.assertRaises(CommercialValidationError) as context:
            build_update_payload(
                current_payment_method=self._current_payment_method(),
                payload={
                    "display_name": "Nequi updated",
                    "sort_order": 1,
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_MOBILE_ACCOUNT_REQUIRED",
        )

    def test_mobile_update_prevents_type_change(self):
        from apps.commercial.services.commercial_payment_method_service.validation import (
            build_update_payload,
        )

        with self.assertRaises(CommercialValidationError) as context:
            build_update_payload(
                current_payment_method=self._current_payment_method(),
                payload={
                    "display_name": "Nequi updated",
                    "sort_order": 1,
                    "mobile_account": {
                        "wallet_type": "daviplata",
                        "payment_key": "3001234567",
                    },
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_TYPE_IMMUTABLE",
        )

    def test_bank_update_rejects_mobile_account(self):
        from apps.commercial.services.commercial_payment_method_service.validation import (
            build_update_payload,
        )

        with self.assertRaises(CommercialValidationError) as context:
            build_update_payload(
                current_payment_method=self._current_payment_method(
                    payment_method_type="bank_account",
                ),
                payload={
                    "display_name": "Bank updated",
                    "sort_order": 1,
                    "mobile_account": {
                        "wallet_type": "nequi",
                        "payment_key": "3001234567",
                    },
                },
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_BANK_ACCOUNT_REQUIRED",
        )


class CommercialPaymentMethodQueryTests(
    SimpleTestCase,
):
    def _payment_method_row(self, **overrides):
        payment_method = {
            "id": "payment-method-1",
            "commercial_profile_id": "profile-1",
            "payment_method_type": "nequi",
            "display_name": "Nequi",
            "sort_order": 0,
            "status": "active",
            "archived_at": None,
            "created_at": None,
            "updated_at": None,
            "commercial_mobile_payment_accounts": [
                {
                    "wallet_type": "nequi",
                    "payment_key": "3001234567",
                    "account_holder_name": "Owner",
                }
            ],
            "commercial_bank_accounts": [],
        }
        payment_method.update(overrides)
        return payment_method

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.queries."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.queries."
        "get_user_supabase_client"
    )
    def test_list_excludes_archived_methods_by_default(
        self,
        get_client_mock,
        require_owner_mock,
    ):
        from apps.commercial.services.commercial_payment_method_service.queries import (
            list_owned_commercial_payment_methods,
        )

        payment_method_row = self._payment_method_row()

        class Query:
            def __init__(self):
                self.calls = []

            def select(self, value):
                self.calls.append(("select", value))
                return self

            def eq(self, column, value):
                self.calls.append(("eq", column, value))
                return self

            def order(self, column):
                self.calls.append(("order", column))
                return self

            def neq(self, column, value):
                self.calls.append(("neq", column, value))
                return self

            def execute(self):
                return type(
                    "Response",
                    (),
                    {"data": [payment_method_row]},
                )()

        query = Query()

        class Client:
            def table(self, name):
                self.table_name = name
                return query

        get_client_mock.return_value = Client()

        methods = list_owned_commercial_payment_methods(
            user_id="user-1",
            access_token="token-1",
            commercial_profile_id="profile-1",
        )

        self.assertEqual(len(methods), 1)
        self.assertEqual(query.calls[0][0], "select")
        self.assertIn(
            ("neq", "status", "archived"),
            query.calls,
        )
        self.assertEqual(
            query.calls.count(("order", "sort_order")),
            1,
        )
        self.assertEqual(
            query.calls.count(("order", "created_at")),
            1,
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.queries."
        "require_commercial_profile_owner"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.queries."
        "get_user_supabase_client"
    )
    def test_get_missing_payment_method_returns_not_found(
        self,
        get_client_mock,
        require_owner_mock,
    ):
        from apps.commercial.exceptions import CommercialNotFoundError
        from apps.commercial.services.commercial_payment_method_service.queries import (
            get_owned_commercial_payment_method,
        )

        class Query:
            def select(self, value):
                return self

            def eq(self, column, value):
                return self

            def order(self, column):
                return self

            def execute(self):
                return type("Response", (), {"data": []})()

        class Client:
            def table(self, name):
                return Query()

        get_client_mock.return_value = Client()

        with self.assertRaises(CommercialNotFoundError) as context:
            get_owned_commercial_payment_method(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                payment_method_id="missing-method",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_NOT_FOUND",
        )


class CommercialPaymentMethodOperationTests(
    SimpleTestCase,
):
    def _payment_method(self, **overrides):
        payment_method = {
            "id": "payment-method-1",
            "commercial_profile_id": "profile-1",
            "payment_method_type": "nequi",
            "display_name": "Nequi",
            "sort_order": 0,
            "status": "active",
            "archived_at": None,
            "created_at": None,
            "updated_at": None,
            "mobile_account": {
                "wallet_type": "nequi",
                "payment_key": "3001234567",
            },
            "bank_account": None,
        }
        payment_method.update(overrides)
        return payment_method

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.operations."
        "get_owned_commercial_payment_method"
    )
    def test_archive_rejects_already_archived_method(
        self,
        get_payment_method_mock,
    ):
        from apps.commercial.services.commercial_payment_method_service import (
            archive_commercial_payment_method,
        )

        get_payment_method_mock.return_value = self._payment_method(
            status="archived",
        )

        with self.assertRaises(CommercialStateError) as context:
            archive_commercial_payment_method(
                user_id="user-1",
                access_token="token-1",
                commercial_profile_id="profile-1",
                payment_method_id="payment-method-1",
            )

        self.assertEqual(
            context.exception.code,
            "COMMERCIAL_PAYMENT_METHOD_ALREADY_ARCHIVED",
        )

    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.operations."
        "get_owned_commercial_payment_method"
    )
    @patch(
        "apps.commercial.services."
        "commercial_payment_method_service.operations."
        "get_user_supabase_client"
    )
    def test_archive_uses_profile_and_status_guards(
        self,
        get_client_mock,
        get_payment_method_mock,
    ):
        from apps.commercial.services.commercial_payment_method_service import (
            archive_commercial_payment_method,
        )

        get_payment_method_mock.return_value = self._payment_method()

        class AuditQuery:
            def execute(self):
                return type("Response", (), {"data": "audit-id"})()

        class ArchiveQuery:
            def __init__(self):
                self.calls = []

            def update(self, value):
                self.calls.append(("update", value))
                return self

            def eq(self, column, value):
                self.calls.append(("eq", column, value))
                return self

            def neq(self, column, value):
                self.calls.append(("neq", column, value))
                return self

            def execute(self):
                return type(
                    "Response",
                    (),
                    {
                        "data": [
                            {
                                "archived_at": "2026-10-04T00:00:00+00:00",
                                "updated_at": "2026-10-04T00:00:00+00:00",
                            }
                        ]
                    },
                )()

        archive_query = ArchiveQuery()

        class Client:
            def table(self, name):
                self.table_name = name
                return archive_query

            def rpc(self, function_name, parameters):
                self.rpc_name = function_name
                self.rpc_parameters = parameters
                return AuditQuery()

        get_client_mock.return_value = Client()

        archived = archive_commercial_payment_method(
            user_id="user-1",
            access_token="token-1",
            commercial_profile_id="profile-1",
            payment_method_id="payment-method-1",
        )

        self.assertEqual(archived["status"], "archived")
        self.assertIn(
            ("eq", "commercial_profile_id", "profile-1"),
            archive_query.calls,
        )
        self.assertIn(
            ("neq", "status", "archived"),
            archive_query.calls,
        )


class CommercialPaymentMethodPackageTests(
    SimpleTestCase,
):
    def test_package_exports_expected_public_api(self):
        from apps.commercial.services import (
            commercial_payment_method_service,
        )

        self.assertEqual(
            set(commercial_payment_method_service.__all__),
            {
                "archive_commercial_payment_method",
                "create_commercial_payment_method",
                "get_owned_commercial_payment_method",
                "list_owned_commercial_payment_methods",
                "serialize_public_payment_method",
                "update_commercial_payment_method",
            },
        )

    def test_removed_monolith_is_not_imported(self):
        from pathlib import Path

        from apps.commercial.services import (
            commercial_payment_method_service,
        )

        service_path = Path(
            commercial_payment_method_service.__file__
        )
        self.assertEqual(service_path.name, "__init__.py")
        self.assertEqual(
            service_path.parent.name,
            "commercial_payment_method_service",
        )
