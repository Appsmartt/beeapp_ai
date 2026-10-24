from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.test import SimpleTestCase, override_settings
from django.urls import reverse

from apps.accounts.exceptions import AccountAuthenticationError
from apps.mail.exceptions import (
    MailAttachmentError,
    MailIntegrationNotFoundError,
    MailMessageNotFoundError,
)
from apps.mail.views import (
    MailDraftDetailView,
    MailDraftSendView,
    MailDraftsView,
    MailIntegrationDetailView,
    MailIntegrationsView,
    MailMessageActionView,
    MailMessageAttachmentDownloadView,
    MailMessageDetailView,
    MailMessageMoveView,
    MailMessagesView,
    MailMessageStateView,
    MailSyncView,
)


@override_settings(ROOT_URLCONF="apps.mail.urls")
class MailViewsRefactorContractTests(SimpleTestCase):
    def test_public_views_are_importable(self) -> None:
        public_views = (
            MailDraftDetailView,
            MailDraftSendView,
            MailDraftsView,
            MailIntegrationDetailView,
            MailIntegrationsView,
            MailMessageActionView,
            MailMessageAttachmentDownloadView,
            MailMessageDetailView,
            MailMessageMoveView,
            MailMessagesView,
            MailMessageStateView,
            MailSyncView,
        )

        self.assertEqual(len(public_views), 12)

    def test_url_contract_is_unchanged(self) -> None:
        integration_id = uuid4()
        message_id = uuid4()
        attachment_id = uuid4()

        self.assertEqual(
            reverse("mail-integrations"),
            "/integrations/",
        )
        self.assertEqual(
            reverse(
                "mail-integration-detail",
                kwargs={"integration_id": integration_id},
            ),
            f"/integrations/{integration_id}/",
        )
        self.assertEqual(
            reverse(
                "mail-message-attachment-download",
                kwargs={
                    "message_id": message_id,
                    "attachment_id": attachment_id,
                },
            ),
            (
                f"/messages/{message_id}/attachments/"
                f"{attachment_id}/download/"
            ),
        )

    @patch.object(
        MailIntegrationDetailView,
        "get_authenticated_user",
        side_effect=AccountAuthenticationError("expired"),
    )
    def test_integration_detail_returns_unauthorized_response(
        self,
        mocked_user,
    ) -> None:
        response = MailIntegrationDetailView.as_view()(
            self.factory.get("/integrations/"),
            integration_id=uuid4(),
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data,
            {"detail": "Invalid or expired access token."},
        )
        mocked_user.assert_called_once()

    @patch.object(
        MailIntegrationDetailView,
        "get_authenticated_user",
        return_value=SimpleNamespace(id="user-1"),
    )
    @patch(
        "apps.mail.views.integration_views.get_mail_integration",
        return_value=None,
    )
    def test_integration_detail_returns_not_found_response(
        self,
        mocked_get_integration,
        mocked_user,
    ) -> None:
        integration_id = uuid4()

        response = MailIntegrationDetailView.as_view()(
            self.factory.get("/integrations/"),
            integration_id=integration_id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data,
            {"detail": "La integración de Email no fue encontrada."},
        )
        mocked_get_integration.assert_called_once_with(
            user_id="user-1",
            integration_id=str(integration_id),
        )
        mocked_user.assert_called_once()

    @patch.object(
        MailMessageAttachmentDownloadView,
        "get_authenticated_user",
        return_value=SimpleNamespace(id="user-1"),
    )
    @patch(
        "apps.mail.views.message_attachment_views."
        "download_mail_attachment"
    )
    def test_attachment_download_preserves_security_headers(
        self,
        mocked_download,
        mocked_user,
    ) -> None:
        message_id = uuid4()
        attachment_id = uuid4()
        mocked_download.return_value = SimpleNamespace(
            content=b"safe-content",
            content_type="text/plain",
            filename="safe.txt",
        )

        response = MailMessageAttachmentDownloadView.as_view()(
            self.factory.get("/attachments/download/"),
            message_id=message_id,
            attachment_id=attachment_id,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Content-Disposition"],
            'attachment; filename="safe.txt"',
        )
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(
            response["X-Content-Type-Options"],
            "nosniff",
        )
        self.assertEqual(response["Content-Length"], "12")
        mocked_download.assert_called_once_with(
            user_id="user-1",
            message_id=str(message_id),
            attachment_id=str(attachment_id),
        )
        mocked_user.assert_called_once()

    @patch.object(
        MailMessageAttachmentDownloadView,
        "get_authenticated_user",
        return_value=SimpleNamespace(id="user-1"),
    )
    @patch(
        "apps.mail.views.message_attachment_views."
        "download_mail_attachment",
        side_effect=MailAttachmentError("invalid attachment"),
    )
    def test_attachment_download_returns_safe_error(
        self,
        mocked_download,
        mocked_user,
    ) -> None:
        response = MailMessageAttachmentDownloadView.as_view()(
            self.factory.get("/attachments/download/"),
            message_id=uuid4(),
            attachment_id=uuid4(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data,
            {"detail": "invalid attachment"},
        )
        mocked_download.assert_called_once()
        mocked_user.assert_called_once()

    @patch.object(
        MailMessageDetailView,
        "get_authenticated_user",
        return_value=SimpleNamespace(id="user-1"),
    )
    @patch(
        "apps.mail.views.message_query_views.get_mail_message",
        side_effect=MailMessageNotFoundError("not found"),
    )
    def test_message_detail_returns_not_found_response(
        self,
        mocked_get_message,
        mocked_user,
    ) -> None:
        message_id = uuid4()

        response = MailMessageDetailView.as_view()(
            self.factory.get("/messages/"),
            message_id=message_id,
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data, {"detail": "not found"})
        mocked_get_message.assert_called_once_with(
            user_id="user-1",
            message_id=str(message_id),
        )
        mocked_user.assert_called_once()


MailViewsRefactorContractTests.factory = (
    __import__("django.test", fromlist=["RequestFactory"]).RequestFactory()
)
