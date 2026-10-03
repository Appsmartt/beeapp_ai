from __future__ import annotations


def provider_message() -> dict:
    return {
        "provider_message_id": "provider-message-1",
        "provider_thread_id": "thread-1",
        "provider_conversation_id": "conversation-1",
        "provider_change_key": "change-1",
        "provider_etag": "etag-1",
        "provider_web_link": "https://example.invalid/message/1",
        "provider_created_at": "2026-01-01T00:00:00+00:00",
        "provider_updated_at": "2026-01-01T00:00:00+00:00",
        "direction": "inbound",
        "status": "received",
        "folder": "inbox",
        "is_read": False,
        "is_starred": False,
        "is_archived": False,
        "is_spam": False,
        "is_trashed": False,
        "subject": "Test message",
        "body_text": "Test body",
        "body_html": "<p>Test body</p>",
        "body_preview": "Test body",
        "snippet": "Test body",
        "message_id_header": "<message-1@example.invalid>",
        "in_reply_to_header": None,
        "references_header": None,
        "sent_at": "2026-01-01T00:00:00+00:00",
        "received_at": "2026-01-01T00:00:00+00:00",
        "has_attachments": True,
        "attachment_count": 1,
        "metadata": {"source": "test"},
        "recipients": {
            "from": [
                {
                    "email": "sender@example.invalid",
                    "display_name": "Sender",
                }
            ],
            "to": [
                {
                    "email": "recipient@example.invalid",
                    "display_name": "Recipient",
                }
            ],
        },
        "attachments": [
            {
                "provider_attachment_id": "attachment-1",
                "filename": "file.txt",
                "mime_type": "text/plain",
                "size_bytes": 10,
                "is_inline": False,
                "metadata": {},
            }
        ],
    }
