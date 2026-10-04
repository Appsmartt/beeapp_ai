from apps.mail.views.draft_views import (
    MailDraftDetailView,
    MailDraftSendView,
    MailDraftsView,
)
from apps.mail.views.integration_views import (
    MailIntegrationDetailView,
    MailIntegrationsView,
)
from apps.mail.views.message_action_views import (
    MailMessageActionView,
    MailMessageMoveView,
    MailMessageStateView,
)
from apps.mail.views.message_attachment_views import (
    MailMessageAttachmentDownloadView,
)
from apps.mail.views.message_query_views import (
    MailMessageDetailView,
    MailMessagesView,
)
from apps.mail.views.sync_views import MailSyncView

__all__ = [
    "MailDraftDetailView",
    "MailDraftSendView",
    "MailDraftsView",
    "MailIntegrationDetailView",
    "MailIntegrationsView",
    "MailMessageActionView",
    "MailMessageAttachmentDownloadView",
    "MailMessageDetailView",
    "MailMessageMoveView",
    "MailMessagesView",
    "MailMessageStateView",
    "MailSyncView",
]
