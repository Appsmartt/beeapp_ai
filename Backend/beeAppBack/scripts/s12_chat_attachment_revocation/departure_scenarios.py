import time

from .chat_attachment_helpers import assert_chat_attachment_access, assert_chat_share, assert_file_rest_access, assert_storage_access, create_group, get_share_rows, invite_and_accept, leave_group, remove_member, upload_chat_attachment


def append_result(results, scenario, assertion):
    results.append(
        "PASS | " + scenario + " | " + assertion
    )


def run_departure_cycle(
    departure_kind,
    cycle_number,
    supabase_url,
    public_key,
    owner_token,
    owner_user_id,
    owner_identity_id,
    member_token,
    member_user_id,
    member_identity_id,
    results,
    created_groups,
):
    scenario = departure_kind + "_cycle_" + str(cycle_number)

    conversation_id = create_group(
        owner_token,
        owner_identity_id,
        scenario,
    )
    created_groups.append(conversation_id)

    invite_and_accept(
        owner_token,
        member_token,
        conversation_id,
        owner_identity_id,
        member_identity_id,
    )

    message_id, file_id = upload_chat_attachment(
        owner_token,
        conversation_id,
        owner_identity_id,
        scenario,
    )

    rows = get_share_rows(
        supabase_url,
        public_key,
        member_token,
        file_id,
        member_user_id,
    )
    assert_chat_share(
        rows,
        conversation_id,
        message_id,
        expected_revoked=False,
    )
    append_result(results, scenario, "active chat share exists")

    assert_chat_attachment_access(
        member_token,
        message_id,
        member_identity_id,
        expected_access=True,
    )
    assert_storage_access(
        member_token,
        file_id,
        expected_access=True,
    )
    assert_file_rest_access(
        supabase_url,
        public_key,
        member_token,
        file_id,
        expected_access=True,
    )
    append_result(
        results,
        scenario,
        "active participant passes chat storage and RLS access",
    )

    if departure_kind == "leave":
        leave_group(
            member_token,
            conversation_id,
            member_identity_id,
        )
    else:
        remove_member(
            owner_token,
            conversation_id,
            owner_identity_id,
            member_identity_id,
        )

    time.sleep(1)

    rows = get_share_rows(
        supabase_url,
        public_key,
        member_token,
        file_id,
        member_user_id,
    )
    assert_chat_share(
        rows,
        conversation_id,
        message_id,
        expected_revoked=True,
    )
    append_result(
        results,
        scenario,
        "chat attachment share is revoked",
    )

    assert_chat_attachment_access(
        member_token,
        message_id,
        member_identity_id,
        expected_access=False,
    )
    assert_storage_access(
        member_token,
        file_id,
        expected_access=False,
    )
    assert_file_rest_access(
        supabase_url,
        public_key,
        member_token,
        file_id,
        expected_access=False,
    )
    append_result(
        results,
        scenario,
        "departed participant is denied by chat storage and RLS",
    )

    owner_rows = get_share_rows(
        supabase_url,
        public_key,
        owner_token,
        file_id,
        owner_user_id,
    )
    if owner_rows:
        raise RuntimeError("OWNER_UNEXPECTEDLY_HAS_FILE_SHARE")

    assert_storage_access(
        owner_token,
        file_id,
        expected_access=True,
    )
    append_result(
        results,
        scenario,
        "owner retains access without recipient share",
    )
