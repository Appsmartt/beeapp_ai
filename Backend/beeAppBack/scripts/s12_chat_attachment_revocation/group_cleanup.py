import time
from urllib.parse import quote

from .auth_helpers import json_request
from .chat_attachment_helpers import assert_status


def _delete_group(owner_token, path, body):
    for attempt in range(6):
        status, _ = json_request(
            "DELETE",
            path,
            owner_token,
            body,
        )
        if status != 429 or attempt == 5:
            return status
        time.sleep((attempt + 1) * 2)
    return status


def deactivate_group(
    owner_token,
    conversation_id,
    owner_identity_id,
):
    base_path = (
        "/api/chat/groups/"
        + quote(conversation_id, safe="")
    )
    body = {"owner_identity_id": owner_identity_id}

    sole_owner_status = _delete_group(
        owner_token,
        base_path + "/sole-owner/",
        body,
    )
    if sole_owner_status in (204, 400, 404):
        return

    general_status = _delete_group(
        owner_token,
        base_path + "/",
        body,
    )
    assert_status(
        general_status,
        (204, 400, 404),
        "GROUP_CLEANUP_FAILED_AFTER_"
        + str(sole_owner_status),
    )
