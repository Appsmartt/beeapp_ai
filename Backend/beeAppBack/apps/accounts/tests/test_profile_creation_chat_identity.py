from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

from apps.accounts.exceptions import ProfileCreationError
from apps.accounts.services.profile_service import create_profile
from apps.chat.exceptions import ChatIdentityError


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table):
        self.table = table
        self.operation = None
        self.payload = None
        self.filters = []

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def upsert(self, payload, on_conflict):
        self.operation = "upsert"
        self.payload = payload
        self.on_conflict = on_conflict
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def execute(self):
        self.table.operations.append(
            {
                "operation": self.operation,
                "payload": self.payload,
                "filters": self.filters,
            }
        )

        if self.operation == "insert":
            return FakeResponse([self.payload])

        if self.operation == "upsert":
            return FakeResponse([self.payload])

        if self.operation == "delete":
            return FakeResponse([])

        raise AssertionError(
            f"Unexpected operation for {self.table.name}: "
            f"{self.operation}"
        )


class FakeTable:
    def __init__(self, name):
        self.name = name
        self.operations = []

    def insert(self, payload):
        return FakeQuery(self).insert(payload)

    def upsert(self, payload, on_conflict):
        return FakeQuery(self).upsert(payload, on_conflict)

    def delete(self):
        return FakeQuery(self).delete()


class FakeSupabase:
    def __init__(self):
        self.tables = {
            "profile": FakeTable("profile"),
            "storage_quotas": FakeTable("storage_quotas"),
        }

    def table(self, name):
        try:
            return self.tables[name]
        except KeyError as error:
            raise AssertionError(
                f"Unexpected table: {name}"
            ) from error


class CreateProfileChatIdentityTests(TestCase):
    def setUp(self):
        self.user_id = "11111111-1111-1111-1111-111111111111"
        self.supabase = FakeSupabase()

    def create_personal_profile(self):
        return create_profile(
            auth_user_id=self.user_id,
            email="persona@example.com",
            first_name="Persona",
            last_name="Prueba",
            phone_dial_code="+57",
            phone_number="3001234567",
        )

    def test_profile_creation_syncs_private_chat_identity(self):
        with patch(
            "apps.accounts.services.profile_service."
            "get_supabase_admin_client",
            return_value=self.supabase,
        ), patch(
            "apps.accounts.services.profile_service."
            "sync_chat_identities_for_user",
            return_value=[],
        ) as sync_chat_identities:
            profile = self.create_personal_profile()

        self.assertEqual(profile["id"], self.user_id)
        sync_chat_identities.assert_called_once_with(
            user_id=self.user_id,
        )
        self.assertEqual(
            self.supabase.tables["profile"].operations[0][
                "operation"
            ],
            "insert",
        )
        self.assertEqual(
            self.supabase.tables["storage_quotas"].operations[0][
                "operation"
            ],
            "upsert",
        )

    def test_identity_sync_failure_rolls_back_new_profile_and_quota(self):
        with patch(
            "apps.accounts.services.profile_service."
            "get_supabase_admin_client",
            return_value=self.supabase,
        ), patch(
            "apps.accounts.services.profile_service."
            "sync_chat_identities_for_user",
            side_effect=ChatIdentityError("RPC unavailable"),
        ):
            with self.assertRaises(ProfileCreationError):
                self.create_personal_profile()

        profile_operations = self.supabase.tables[
            "profile"
        ].operations
        quota_operations = self.supabase.tables[
            "storage_quotas"
        ].operations

        self.assertEqual(
            [item["operation"] for item in profile_operations],
            ["insert", "delete"],
        )
        self.assertEqual(
            [item["operation"] for item in quota_operations],
            ["upsert", "delete"],
        )
        self.assertEqual(
            profile_operations[1]["filters"],
            [("id", self.user_id)],
        )
        self.assertEqual(
            quota_operations[1]["filters"],
            [("user_id", self.user_id)],
        )
