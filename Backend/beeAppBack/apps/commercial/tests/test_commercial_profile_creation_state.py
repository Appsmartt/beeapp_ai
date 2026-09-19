from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

from apps.commercial.services.commercial_profile_service import (
    create_commercial_profile,
)


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table, operation=""):
        self.table = table
        self.operation = operation
        self.payload = None

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def eq(self, *_args):
        return self

    def execute(self):
        if self.operation == "insert":
            self.table.inserted_payloads.append(self.payload)

            if self.table.name == "commercial_profiles":
                return FakeResponse(
                    [{"id": "profile-1", **self.payload}]
                )

            return FakeResponse(self.payload)

        if self.operation == "delete":
            return FakeResponse([])

        raise AssertionError(
            f"Unexpected operation for {self.table.name}: "
            f"{self.operation}"
        )


class FakeTable:
    def __init__(self, name):
        self.name = name
        self.inserted_payloads = []

    def insert(self, payload):
        return FakeQuery(self).insert(payload)

    def delete(self):
        return FakeQuery(self).delete()


class FakeSupabase:
    def __init__(self):
        self.tables = {
            name: FakeTable(name)
            for name in (
                "commercial_profiles",
                "commercial_profile_categories",
                "commercial_profile_modalities",
                "commercial_profile_hours",
                "commercial_profile_social_links",
                "commercial_categories",
            )
        }

    def table(self, name):
        try:
            return self.tables[name]
        except KeyError as error:
            raise AssertionError(
                f"Unexpected table: {name}"
            ) from error


class CreateCommercialProfileInitialStateTests(TestCase):
    def test_new_profile_is_forced_to_private_paused_state(self):
        supabase = FakeSupabase()

        payload = {
            "offer_type": "services",
            "category_ids": [
                "11111111-1111-1111-1111-111111111111",
            ],
            "custom_activity_text": None,
            "display_name": "Negocio de prueba",
            "description": "Descripción de prueba",
            "country_code": "CO",
            "city": "Bogotá",
            "address": None,
            "neighborhood": None,
            "location_reference": None,
            "is_address_public": False,
            "phone_dial_code": None,
            "phone_number": None,
            "is_phone_public": False,
            "public_email": None,
            "is_email_public": False,
            "logo_file_id": None,
            "is_public": True,
            "is_available": True,
            "modalities": ["virtual"],
            "hours": [],
        }

        with patch(
            "apps.commercial.services."
            "commercial_profile_service."
            "get_supabase_user_client",
            return_value=supabase,
        ), patch(
            "apps.commercial.services."
            "commercial_profile_service."
            "validate_commercial_categories",
            return_value=payload["category_ids"],
        ), patch(
            "apps.commercial.services."
            "commercial_profile_service."
            "get_owned_commercial_profile_with_access_token",
            return_value={"id": "profile-1"},
        ):
            profile = create_commercial_profile(
                user_id="22222222-2222-2222-2222-222222222222",
                access_token="test-access-token",
                payload=payload,
            )

        self.assertEqual(profile, {"id": "profile-1"})
        self.assertEqual(
            supabase.tables["commercial_profiles"].inserted_payloads,
            [
                {
                    "owner_id": (
                        "22222222-2222-2222-2222-222222222222"
                    ),
                    "offer_type": "services",
                    "category_id": (
                        "11111111-1111-1111-1111-111111111111"
                    ),
                    "custom_activity_text": None,
                    "display_name": "Negocio de prueba",
                    "description": "Descripción de prueba",
                    "country_code": "CO",
                    "city": "Bogotá",
                    "address": None,
                    "neighborhood": None,
                    "location_reference": None,
                    "is_address_public": False,
                    "phone_dial_code": None,
                    "phone_number": None,
                    "is_phone_public": False,
                    "public_email": None,
                    "is_email_public": False,
                    "logo_file_id": None,
                    "publication_status": "paused",
                    "is_public": False,
                    "is_available": False,
                }
            ],
        )


    def test_new_profile_creates_its_social_links(self):
        supabase = FakeSupabase()

        payload = {
            "offer_type": "services",
            "category_ids": [
                "11111111-1111-1111-1111-111111111111",
            ],
            "custom_activity_text": None,
            "display_name": "Negocio con redes",
            "description": "Descripción de prueba",
            "country_code": "CO",
            "city": "Bogotá",
            "address": None,
            "neighborhood": None,
            "location_reference": None,
            "is_address_public": False,
            "phone_dial_code": None,
            "phone_number": None,
            "is_phone_public": False,
            "public_email": None,
            "is_email_public": False,
            "logo_file_id": None,
            "is_public": False,
            "is_available": False,
            "modalities": ["virtual"],
            "hours": [],
            "social_links": [
                {
                    "platform": "instagram",
                    "url": "https://instagram.com/beeapp",
                },
                {
                    "platform": "website",
                    "url": "https://beeapp.co",
                },
            ],
        }

        with patch(
            "apps.commercial.services."
            "commercial_profile_service."
            "get_supabase_user_client",
            return_value=supabase,
        ), patch(
            "apps.commercial.services."
            "commercial_profile_service."
            "validate_commercial_categories",
            return_value=payload["category_ids"],
        ), patch(
            "apps.commercial.services."
            "commercial_profile_service."
            "get_owned_commercial_profile_with_access_token",
            return_value={"id": "profile-1"},
        ):
            profile = create_commercial_profile(
                user_id="22222222-2222-2222-2222-222222222222",
                access_token="test-access-token",
                payload=payload,
            )

        self.assertEqual(profile, {"id": "profile-1"})
        self.assertEqual(
            supabase.tables[
                "commercial_profile_social_links"
            ].inserted_payloads,
            [
                [
                    {
                        "commercial_profile_id": "profile-1",
                        "platform": "instagram",
                        "url": "https://instagram.com/beeapp",
                    },
                    {
                        "commercial_profile_id": "profile-1",
                        "platform": "website",
                        "url": "https://beeapp.co",
                    },
                ]
            ],
        )
