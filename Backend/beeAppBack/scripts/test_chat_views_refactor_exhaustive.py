#!/usr/bin/env python
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = PROJECT_ROOT.parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
OUTPUT_DIRECTORY = REPOSITORY_ROOT / "tmp" / "chat_views_refactor"
REPORT_PATH = OUTPUT_DIRECTORY / "chat_views_refactor_exhaustive_report.txt"
VIEWS_DIRECTORY = PROJECT_ROOT / "apps" / "chat" / "views"
MONOLITH_PATH = PROJECT_ROOT / "apps" / "chat" / "views.py"

EXPECTED_VIEW_NAMES = [
    "ChatBootstrapView",
    "ChatSyncBootstrapView",
    "ChatSyncChangesView",
    "ChatIdentitiesView",
    "ChatRecipientSearchView",
    "ChatContactProfileView",
    "ChatTypedInboxView",
    "ChatInboxView",
    "ChatDirectConversationsView",
    "ChatConversationDetailView",
    "ChatConversationClearView",
    "ChatConversationNotificationsView",
    "ChatConversationPinnedView",
    "ChatConversationParticipantsView",
    "ChatConversationMessagesView",
    "ChatConversationAttachmentUploadView",
    "ChatConversationDeliveredView",
    "ChatConversationReadView",
    "ChatMessageDetailView",
    "ChatMessageAttachmentView",
    "ChatMessageAttachmentAccessView",
    "ChatMessageReadStatusView",
    "ChatMessageReadersView",
    "ChatMessageReactionsView",
    "ChatMessageReactionDetailView",
    "ChatGroupsView",
    "ChatGroupDetailView",
    "ChatGroupSoleOwnerDeactivationView",
    "ChatGroupInvitesView",
    "ChatGroupConversationInvitesView",
    "ChatGroupInviteDetailView",
    "ChatGroupInviteResponseView",
    "ChatGroupOwnershipTransferView",
    "ChatGroupLeaveView",
    "ChatGroupParticipantRoleView",
    "ChatGroupParticipantDetailView",
]

EXPECTED_HELPERS = [
    "_get_access_token",
    "_unauthorized_response",
    "_conversation_not_found_response",
    "_message_not_found_response",
    "_group_not_found_response",
    "get_chat_unpinned_inbox_by_type",
    "attach_chat_inbox_receipts",
]


def write_result(report, label, passed, detail):
    status = "PASS" if passed else "FAIL"
    report.append(f"{status} | {label} | {detail}")
    return passed


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "beeAppBack.settings")

    import django

    django.setup()

    from apps.chat import urls
    from apps.chat import views

    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    report = []
    passed = True

    passed &= write_result(
        report,
        "monolith_removed",
        not MONOLITH_PATH.exists(),
        str(MONOLITH_PATH),
    )

    python_files = sorted(VIEWS_DIRECTORY.rglob("*.py"))
    passed &= write_result(
        report,
        "package_files_present",
        bool(python_files),
        str(len(python_files)),
    )

    for python_file in python_files:
        line_count = len(python_file.read_text().splitlines())
        passed &= write_result(
            report,
            "line_limit",
            line_count <= 400,
            f"{python_file.relative_to(PROJECT_ROOT)}={line_count}",
        )

    missing_views = [
        name for name in EXPECTED_VIEW_NAMES if not hasattr(views, name)
    ]
    invalid_views = [
        name
        for name in EXPECTED_VIEW_NAMES
        if hasattr(views, name)
        and not isinstance(getattr(views, name), type)
    ]
    passed &= write_result(
        report,
        "public_views",
        not missing_views and not invalid_views,
        f"missing={missing_views}; invalid={invalid_views}",
    )

    missing_helpers = [
        name for name in EXPECTED_HELPERS if not hasattr(views, name)
    ]
    passed &= write_result(
        report,
        "public_helpers",
        not missing_helpers,
        f"missing={missing_helpers}",
    )

    url_names = [pattern.name for pattern in urls.urlpatterns]
    callbacks_callable = all(
        callable(pattern.callback) for pattern in urls.urlpatterns
    )
    passed &= write_result(
        report,
        "url_contract",
        len(urls.urlpatterns) == 44
        and len(url_names) == len(set(url_names))
        and callbacks_callable,
        (
            f"count={len(urls.urlpatterns)}; "
            f"unique={len(set(url_names))}; "
            f"callbacks_callable={callbacks_callable}"
        ),
    )

    typed_inbox_module = views.ChatTypedInboxView.__module__
    passed &= write_result(
        report,
        "typed_inbox_module",
        typed_inbox_module == "apps.chat.views.refactored.inbox_views",
        typed_inbox_module,
    )

    report.append(
        f"RESULT | {'PASS' if passed else 'FAIL'} | "
        f"views={len(EXPECTED_VIEW_NAMES)}; urls={len(urls.urlpatterns)}"
    )
    REPORT_PATH.write_text("\n".join(report) + "\n")
    print(REPORT_PATH)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
