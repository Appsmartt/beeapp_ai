from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from apps.commercial.services.domain.business_days import add_business_days, request_expires_at


class BusinessDaysTests(SimpleTestCase):
    timezone = ZoneInfo("America/Bogota")

    def test_two_business_days_from_monday_is_wednesday(self):
        value = datetime(2026, 9, 7, 10, 0, tzinfo=self.timezone)

        self.assertEqual(
            request_expires_at(value),
            datetime(2026, 9, 9, 10, 0, tzinfo=self.timezone),
        )

    def test_two_business_days_from_friday_is_tuesday(self):
        value = datetime(2026, 9, 4, 10, 0, tzinfo=self.timezone)

        self.assertEqual(
            request_expires_at(value),
            datetime(2026, 9, 8, 10, 0, tzinfo=self.timezone),
        )

    def test_business_day_calculation_preserves_timezone_and_clock_time(self):
        value = datetime(2026, 9, 3, 18, 45, tzinfo=self.timezone)

        self.assertEqual(
            add_business_days(value, 2),
            datetime(2026, 9, 7, 18, 45, tzinfo=self.timezone),
        )

    def test_rejects_naive_datetime(self):
        with self.assertRaises(ValueError):
            add_business_days(datetime(2026, 9, 4, 10, 0), 2)

    def test_rejects_negative_business_days(self):
        value = datetime(2026, 9, 4, 10, 0, tzinfo=self.timezone)

        with self.assertRaises(ValueError):
            add_business_days(value, -1)
