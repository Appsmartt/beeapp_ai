from uuid import UUID

from django.test import SimpleTestCase
from django.urls import resolve, reverse

from apps.commercial.verification_views import (
    CommercialProfileVerificationDocumentView,
    CommercialProfileVerificationSubmitView,
    CommercialProfileVerificationView,
)


class CommercialVerificationUrlsTests(SimpleTestCase):
    profile_id = UUID("11111111-1111-1111-1111-111111111111")

    def test_verification_detail_url_resolves(self):
        url = reverse(
            "commercial-profile-verification",
            kwargs={"profile_id": self.profile_id},
        )

        match = resolve(url)

        self.assertEqual(
            match.func.view_class,
            CommercialProfileVerificationView,
        )
        self.assertEqual(match.kwargs["profile_id"], self.profile_id)

    def test_verification_submit_url_resolves(self):
        url = reverse(
            "commercial-profile-verification-submit",
            kwargs={"profile_id": self.profile_id},
        )

        match = resolve(url)

        self.assertEqual(
            match.func.view_class,
            CommercialProfileVerificationSubmitView,
        )
        self.assertEqual(match.kwargs["profile_id"], self.profile_id)

    def test_verification_document_url_resolves(self):
        url = reverse(
            "commercial-profile-verification-document",
            kwargs={"profile_id": self.profile_id},
        )

        match = resolve(url)

        self.assertEqual(
            match.func.view_class,
            CommercialProfileVerificationDocumentView,
        )
        self.assertEqual(match.kwargs["profile_id"], self.profile_id)
