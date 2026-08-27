#!/usr/bin/env bash

set -u
set -o pipefail

API_BASE_URL="${BEEAPP_API_BASE_URL:-http://127.0.0.1:8000}"
RUN_ID="${BEEAPP_TEST_RUN_ID:-call-chat-$(date -u +%Y%m%dT%H%M%SZ)-$$}"

OUTPUT_DIR="${BEEAPP_TEST_OUTPUT_DIR:-$PWD/beeapp_call_chat_test_results}"
REPORT_FILE="$OUTPUT_DIR/call_chat_report_${RUN_ID}.txt"
FAILURES_FILE="$OUTPUT_DIR/call_chat_failures_${RUN_ID}.txt"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/beeapp-call-chat-${RUN_ID}.XXXXXX")"

RUN_EXPIRATION_TEST="${RUN_EXPIRATION_TEST:-false}"
EXPIRATION_WAIT_SECONDS="${EXPIRATION_WAIT_SECONDS:-50}"
KEEP_REMOTE_TEST_DATA="${KEEP_REMOTE_TEST_DATA:-true}"

ACCESS_TOKEN_A=""
ACCESS_TOKEN_B=""
USER_A_ID=""
USER_B_ID=""
IDENTITY_A_ID=""
IDENTITY_B_ID=""
DIRECT_CONVERSATION_ID=""

TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

CURRENT_TEST_LABEL=""
HTTP_CODE=""
CURL_EXIT_CODE=0
RESPONSE_FILE=""
CURL_ERROR_FILE=""

mkdir -p "$OUTPUT_DIR"
: > "$REPORT_FILE"
: > "$FAILURES_FILE"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'ERROR: required command is missing: %s\n' "$1" \
      | tee -a "$REPORT_FILE" \
      | tee -a "$FAILURES_FILE"
    exit 1
  fi
}

sanitize_json() {
  jq '
    walk(
      if type == "object" then
        del(
          .access_token,
          .refresh_token,
          .token,
          .authorization,
          .Authorization,
          .session,
          .password,
          .email,
          .phone,
          .phone_number,
          .url,
          .signed_url,
          .signedURL,
          .storage_path,
          .bucket_id,
          .provider_payload,
          .access_token_ciphertext,
          .refresh_token_ciphertext,
          .id_token_ciphertext,
          .agora.token
        )
      else
        .
      end
    )
  ' 2>/dev/null || cat
}

begin_test() {
  CURRENT_TEST_LABEL="$1"
  TESTS_TOTAL=$((TESTS_TOTAL + 1))

  {
    printf '\n------------------------------------------------------------\n'
    printf 'TEST_START=%s\n' "$CURRENT_TEST_LABEL"
  } >> "$REPORT_FILE"
}

record_response() {
  local label="$1"
  local http_code="$2"
  local body_file="$3"

  {
    printf '\n============================================================\n'
    printf '%s\n' "$label"
    printf 'HTTP_STATUS=%s\n' "$http_code"
    if [ -s "$body_file" ]; then
      sanitize_json < "$body_file"
    else
      printf '(Empty response)\n'
    fi
    printf '\n============================================================\n'
  } >> "$REPORT_FILE"
}

mark_pass() {
  local message="$1"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  printf 'TEST_RESULT=PASS\nPASS: %s\n' "$message" >> "$REPORT_FILE"
  printf '✅ PASS [%s] %s\n' "$CURRENT_TEST_LABEL" "$message" >&2
}

mark_skip() {
  local message="$1"
  TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
  printf 'TEST_RESULT=SKIP\nSKIP: %s\n' "$message" >> "$REPORT_FILE"
  printf '⏭️  SKIP [%s] %s\n' "$CURRENT_TEST_LABEL" "$message" >&2
}

mark_failure() {
  local message="$1"
  local http_code="${2:-N/A}"
  local body_file="${3:-}"
  local curl_error_file="${4:-}"

  TESTS_FAILED=$((TESTS_FAILED + 1))

  {
    printf '\n============================================================\n'
    printf 'FAILED_TEST=%s\n' "$CURRENT_TEST_LABEL"
    printf 'MESSAGE=%s\n' "$message"
    printf 'HTTP_STATUS=%s\n' "$http_code"

    if [ -n "$body_file" ] && [ -s "$body_file" ]; then
      printf '%s\n' 'RESPONSE_BODY:'
      sanitize_json < "$body_file"
    fi

    if [ -n "$curl_error_file" ] && [ -s "$curl_error_file" ]; then
      printf '%s\n' 'CURL_ERROR:'
      cat "$curl_error_file"
    fi

    printf '============================================================\n'
  } >> "$FAILURES_FILE"

  printf '❌ FAIL [%s] %s (HTTP %s)\n' \
    "$CURRENT_TEST_LABEL" \
    "$message" \
    "$http_code" >&2
}

cleanup_request_files() {
  rm -f "${RESPONSE_FILE:-}" "${CURL_ERROR_FILE:-}"
  RESPONSE_FILE=""
  CURL_ERROR_FILE=""
}

request() {
  local method="$1"
  local token="$2"
  local url="$3"
  local body="${4:-}"

  RESPONSE_FILE="$(mktemp)"
  CURL_ERROR_FILE="$(mktemp)"

  local -a curl_args=(
    --silent
    --show-error
    --max-time 90
    --request "$method"
    --header "Authorization: Bearer $token"
    --header "Accept: application/json"
    --output "$RESPONSE_FILE"
    --write-out "%{http_code}"
  )

  if [ -n "$body" ]; then
    curl_args+=(
      --header "Content-Type: application/json"
      --data "$body"
    )
  fi

  curl_args+=("$url")

  HTTP_CODE="$(curl "${curl_args[@]}" 2>"$CURL_ERROR_FILE")"
  CURL_EXIT_CODE=$?
}

expect_http() {
  local label="$1"
  local expected_code="$2"

  begin_test "$label"
  record_response "$label" "$HTTP_CODE" "$RESPONSE_FILE"

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    mark_failure \
      "curl request failed." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"
    return 1
  fi

  if [ "$HTTP_CODE" != "$expected_code" ]; then
    mark_failure \
      "Expected HTTP $expected_code, got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"
    return 1
  fi

  mark_pass "Returned expected HTTP $expected_code."
  return 0
}

expect_http_one_of() {
  local label="$1"
  shift
  local expected_codes=("$@")

  begin_test "$label"
  record_response "$label" "$HTTP_CODE" "$RESPONSE_FILE"

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    mark_failure \
      "curl request failed." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"
    return 1
  fi

  local code
  for code in "${expected_codes[@]}"; do
    if [ "$HTTP_CODE" = "$code" ]; then
      mark_pass "Returned accepted HTTP $HTTP_CODE."
      return 0
    fi
  done

  mark_failure \
    "Expected one of [${expected_codes[*]}], got HTTP $HTTP_CODE." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
  return 1
}

response_json() {
  cat "$RESPONSE_FILE"
}

login_user() {
  local user_label="$1"
  local email=""
  local password=""
  local body=""
  local login_file=""
  local login_error_file=""
  local login_http_code=""
  local login_exit_code=0
  local token=""
  local user_id=""

  read -r -p "BeeApp email for ${user_label}: " email >&2
  read -r -s -p "BeeApp password for ${user_label}: " password >&2
  printf '\n' >&2

  body="$(
    jq -n \
      --arg email "$email" \
      --arg password "$password" \
      '{email: $email, password: $password}'
  )"

  login_file="$(mktemp)"
  login_error_file="$(mktemp)"

  login_http_code="$(
    curl --silent --show-error \
      --max-time 45 \
      --request POST \
      --header "Content-Type: application/json" \
      --header "Accept: application/json" \
      --data "$body" \
      --output "$login_file" \
      --write-out "%{http_code}" \
      "$API_BASE_URL/api/accounts/login/" \
      2>"$login_error_file"
  )"
  login_exit_code=$?

  begin_test "LOGIN_${user_label}"
  record_response "LOGIN_${user_label}" "$login_http_code" "$login_file"

  token="$(jq -r '.session.access_token // empty' "$login_file" 2>/dev/null)"
  user_id="$(jq -r '.user.id // .session.user.id // empty' "$login_file" 2>/dev/null)"

  if [ "$login_exit_code" -ne 0 ] \
    || [ "$login_http_code" != "200" ] \
    || [ -z "$token" ]; then
    mark_failure \
      "Login did not return session.access_token." \
      "$login_http_code" \
      "$login_file" \
      "$login_error_file"
    rm -f "$login_file" "$login_error_file"
    return 1
  fi

  mark_pass "Login returned session.access_token."
  rm -f "$login_file" "$login_error_file"

  printf '%s\n%s\n' "$token" "$user_id"
}

bootstrap_user() {
  local label="$1"
  local token="$2"

  request \
    "POST" \
    "$token" \
    "$API_BASE_URL/api/chat/bootstrap/" \
    "{}"

  expect_http "CHAT_BOOTSTRAP_${label}" "200"
  cleanup_request_files
}

get_profile_identity() {
  local label="$1"
  local token="$2"
  local response=""
  local identity_id=""

  request \
    "GET" \
    "$token" \
    "$API_BASE_URL/api/chat/identities/?active_only=true"

  expect_http "GET_IDENTITIES_${label}" "200" || {
    cleanup_request_files
    return 1
  }

  response="$(response_json)"

  identity_id="$(
    printf '%s' "$response" \
      | jq -r '
          .identities[]
          | select(.identity_type == "profile")
          | .id
        ' \
      | head -n 1
  )"

  cleanup_request_files

  begin_test "EXTRACT_PROFILE_IDENTITY_${label}"

  if [ -z "$identity_id" ] || [ "$identity_id" = "null" ]; then
    mark_failure "Could not extract profile chat identity." "N/A"
    return 1
  fi

  mark_pass "Profile identity extracted."
  printf '%s\n' "$identity_id"
}

create_direct_conversation() {
  local body=""
  local response=""
  local conversation_id=""

  body="$(
    jq -n \
      --arg sender_identity_id "$IDENTITY_A_ID" \
      --arg recipient_identity_id "$IDENTITY_B_ID" \
      '{
        sender_identity_id: $sender_identity_id,
        recipient_identity_id: $recipient_identity_id
      }'
  )"

  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/direct-conversations/" \
    "$body"

  expect_http_one_of \
    "CREATE_OR_GET_DIRECT_CONVERSATION" \
    "200" \
    "201" || {
      cleanup_request_files
      return 1
    }

  response="$(response_json)"
  conversation_id="$(
    printf '%s' "$response" \
      | jq -r '.conversation.id // .id // empty' \
      | head -n 1
  )"

  cleanup_request_files

  begin_test "EXTRACT_DIRECT_CONVERSATION_ID"

  if [ -z "$conversation_id" ] || [ "$conversation_id" = "null" ]; then
    mark_failure \
      "Direct-conversation response did not contain conversation.id." \
      "N/A"
    return 1
  fi

  mark_pass "Direct conversation ID extracted."
  DIRECT_CONVERSATION_ID="$conversation_id"
}

start_call() {
  local scenario="$1"
  local response=""
  local call_id=""

  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calls/conversations/$DIRECT_CONVERSATION_ID/start/" \
    "$(
      jq -n \
        --arg actor_identity_id "$IDENTITY_A_ID" \
        '{actor_identity_id: $actor_identity_id, call_type: "voice"}'
    )"

  expect_http "START_CALL_${scenario}" "201" || {
    cleanup_request_files
    return 1
  }

  response="$(response_json)"
  call_id="$(
    printf '%s' "$response" \
      | jq -r '.call.id // empty' \
      | head -n 1
  )"

  cleanup_request_files

  begin_test "EXTRACT_CALL_ID_${scenario}"

  if [ -z "$call_id" ] || [ "$call_id" = "null" ]; then
    mark_failure "Start response did not contain call.id." "N/A"
    return 1
  fi

  mark_pass "Call ID extracted."
  printf '%s\n' "$call_id"
}

call_detail() {
  local scenario="$1"
  local call_id="$2"
  local token="$3"
  local identity_id="$4"

  request \
    "GET" \
    "$token" \
    "$API_BASE_URL/api/calls/$call_id/?actor_identity_id=$identity_id"

  expect_http "CALL_DETAIL_${scenario}" "200"
  cleanup_request_files
}

assert_call_status() {
  local scenario="$1"
  local call_id="$2"
  local token="$3"
  local identity_id="$4"
  local expected_status="$5"
  local response=""
  local actual_status=""

  request \
    "GET" \
    "$token" \
    "$API_BASE_URL/api/calls/$call_id/?actor_identity_id=$identity_id"

  expect_http "GET_STATUS_${scenario}" "200" || {
    cleanup_request_files
    return 1
  }

  response="$(response_json)"
  actual_status="$(
    printf '%s' "$response" \
      | jq -r '.call.status // empty' \
      | head -n 1
  )"

  cleanup_request_files

  begin_test "ASSERT_STATUS_${scenario}"

  if [ "$actual_status" != "$expected_status" ]; then
    mark_failure \
      "Expected status '$expected_status', got '${actual_status:-empty}'." \
      "N/A"
    return 1
  fi

  mark_pass "Call status is '$expected_status'."
}

active_call() {
  local scenario="$1"
  local token="$2"
  local identity_id="$3"
  local expected_status="${4:-}"

  local response=""
  local actual_status=""

  request \
    "GET" \
    "$token" \
    "$API_BASE_URL/api/calls/conversations/$DIRECT_CONVERSATION_ID/active/?actor_identity_id=$identity_id"

  expect_http "ACTIVE_CALL_${scenario}" "200" || {
    cleanup_request_files
    return 1
  }

  response="$(response_json)"
  actual_status="$(
    printf '%s' "$response" \
      | jq -r '.call.status // empty' \
      | head -n 1
  )"

  cleanup_request_files

  if [ -n "$expected_status" ]; then
    begin_test "ASSERT_ACTIVE_CALL_${scenario}"

    if [ "$actual_status" != "$expected_status" ]; then
      mark_failure \
        "Expected active-call status '$expected_status', got '${actual_status:-empty}'." \
        "N/A"
      return 1
    fi

    mark_pass "Active-call status is '$expected_status'."
  fi
}

history() {
  request \
    "GET" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calls/conversations/$DIRECT_CONVERSATION_ID/history/?actor_identity_id=$IDENTITY_A_ID&limit=50"

  expect_http "CALL_HISTORY" "200"
  cleanup_request_files
}

refresh_token() {
  local scenario="$1"
  local call_id="$2"

  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calls/$call_id/refresh-token/" \
    "$(
      jq -n \
        --arg actor_identity_id "$IDENTITY_A_ID" \
        '{actor_identity_id: $actor_identity_id}'
    )"

  expect_http "REFRESH_TOKEN_${scenario}" "200"
  cleanup_request_files
}

join_call() {
  local scenario="$1"
  local call_id="$2"
  local token="$3"
  local identity_id="$4"

  request \
    "POST" \
    "$token" \
    "$API_BASE_URL/api/calls/$call_id/join/" \
    "$(
      jq -n \
        --arg actor_identity_id "$identity_id" \
        '{actor_identity_id: $actor_identity_id}'
    )"

  expect_http "JOIN_CALL_${scenario}" "200"
  cleanup_request_files
}

confirm_joined() {
  local scenario="$1"
  local call_id="$2"
  local token="$3"
  local identity_id="$4"

  request \
    "POST" \
    "$token" \
    "$API_BASE_URL/api/calls/$call_id/confirm-joined/" \
    "$(
      jq -n \
        --arg actor_identity_id "$identity_id" \
        '{actor_identity_id: $actor_identity_id}'
    )"

  expect_http "CONFIRM_JOINED_${scenario}" "200"
  cleanup_request_files
}

decline_call() {
  local call_id="$1"

  request \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/calls/$call_id/decline/" \
    "$(
      jq -n \
        --arg actor_identity_id "$IDENTITY_B_ID" \
        '{actor_identity_id: $actor_identity_id}'
    )"

  expect_http "DECLINE_DIRECT_CALL" "200"
  cleanup_request_files
}

cancel_join_attempt() {
  local call_id="$1"

  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calls/$call_id/cancel-join-attempt/" \
    "$(
      jq -n \
        --arg actor_identity_id "$IDENTITY_A_ID" \
        --arg failure_reason "Automated test before Agora confirmation" \
        '{
          actor_identity_id: $actor_identity_id,
          failure_reason: $failure_reason
        }'
    )"

  expect_http "CANCEL_JOIN_ATTEMPT" "200"
  cleanup_request_files
}

leave_call() {
  local scenario="$1"
  local call_id="$2"
  local token="$3"
  local identity_id="$4"

  request \
    "POST" \
    "$token" \
    "$API_BASE_URL/api/calls/$call_id/leave/" \
    "$(
      jq -n \
        --arg actor_identity_id "$identity_id" \
        '{actor_identity_id: $actor_identity_id}'
    )"

  expect_http "LEAVE_CALL_${scenario}" "200"
  cleanup_request_files
}

end_call() {
  local scenario="$1"
  local call_id="$2"
  local token="$3"
  local identity_id="$4"

  request \
    "POST" \
    "$token" \
    "$API_BASE_URL/api/calls/$call_id/end/" \
    "$(
      jq -n \
        --arg actor_identity_id "$identity_id" \
        '{actor_identity_id: $actor_identity_id}'
    )"

  expect_http "END_CALL_${scenario}" "200"
  cleanup_request_files
}

assert_call_system_message() {
  local scenario="$1"
  local call_id="$2"
  local expected_event="$3"
  local expected_body="$4"
  local expected_suppress="$5"

  local response=""
  local matching_count=""

  request \
    "GET" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/messages/?limit=100"

  expect_http "GET_MESSAGES_${scenario}" "200" || {
    cleanup_request_files
    return 1
  }

  response="$(response_json)"
  cleanup_request_files

  begin_test "ASSERT_SYSTEM_MESSAGE_${scenario}"

  matching_count="$(
    printf '%s' "$response" \
      | jq -r \
        --arg call_id "$call_id" \
        --arg event "$expected_event" \
        --arg body "$expected_body" \
        --argjson suppress "$expected_suppress" '
          [
            .messages[]?
            | select(.message_type == "system")
            | select(.reference_type == "call_session")
            | select(.reference_id == $call_id)
            | select(.body == $body)
            | select(.metadata.call_id == $call_id)
            | select(.metadata.call_event == $event)
            | select(.metadata.suppress_notification == $suppress)
          ]
          | length
        ' 2>/dev/null
  )"

  if [ "$matching_count" = "1" ]; then
    mark_pass \
      "Found exactly one system message with event '$expected_event'."
  else
    mark_failure \
      "Expected exactly one matching system message; found '${matching_count:-empty}'." \
      "N/A"
  fi
}

run_expiration_test() {
  local call_id=""
  local command_output=""
  local exit_code=0

  if [ "$RUN_EXPIRATION_TEST" != "true" ]; then
    begin_test "EXPIRE_RINGING_DIRECT_CALLS"
    mark_skip \
      "Set RUN_EXPIRATION_TEST=true to wait and run expire_call_sessions."
    return
  fi

  call_id="$(start_call "MISSED")" || return

  begin_test "WAIT_FOR_RINGING_EXPIRATION"
  printf 'Waiting %s seconds for ringing timeout...\n' \
    "$EXPIRATION_WAIT_SECONDS" >&2
  sleep "$EXPIRATION_WAIT_SECONDS"
  mark_pass "Waited for the ringing timeout."

  begin_test "RUN_EXPIRE_CALL_SESSIONS_COMMAND"
  command_output="$(
    python manage.py expire_call_sessions --limit 100 2>&1
  )"
  exit_code=$?

  {
    printf '\nEXPIRE_COMMAND_OUTPUT:\n%s\n' \
      "$command_output"
  } >> "$REPORT_FILE"

  if [ "$exit_code" -ne 0 ]; then
    mark_failure \
      "expire_call_sessions command failed: $command_output" \
      "N/A"
    return
  fi

  mark_pass "expire_call_sessions command completed."

  assert_call_status \
    "MISSED_AFTER_EXPIRATION" \
    "$call_id" \
    "$ACCESS_TOKEN_A" \
    "$IDENTITY_A_ID" \
    "ended"

  assert_call_system_message \
    "MISSED" \
    "$call_id" \
    "missed" \
    "Llamada perdida" \
    "false"
}

test_unauthorized_identity() {
  local call_id="$1"

  request \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/calls/$call_id/refresh-token/" \
    "$(
      jq -n \
        --arg actor_identity_id "$IDENTITY_A_ID" \
        '{actor_identity_id: $actor_identity_id}'
    )"

  begin_test "UNAUTHORIZED_IDENTITY_CANNOT_REFRESH"

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    record_response \
      "UNAUTHORIZED_IDENTITY_CANNOT_REFRESH" \
      "$HTTP_CODE" \
      "$RESPONSE_FILE"
    mark_failure \
      "curl request failed." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"
  elif [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "400" ]; then
    record_response \
      "UNAUTHORIZED_IDENTITY_CANNOT_REFRESH" \
      "$HTTP_CODE" \
      "$RESPONSE_FILE"
    mark_pass "Unauthorized identity was rejected with HTTP $HTTP_CODE."
  else
    record_response \
      "UNAUTHORIZED_IDENTITY_CANNOT_REFRESH" \
      "$HTTP_CODE" \
      "$RESPONSE_FILE"
    mark_failure \
      "Expected HTTP 400 or 403, got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"
  fi

  cleanup_request_files
}

print_summary() {
  {
    printf '\n============================================================\n'
    printf 'CALL_CHAT_TEST_SUMMARY\n'
    printf '============================================================\n'
    printf 'TOTAL=%s\n' "$TESTS_TOTAL"
    printf 'PASSED=%s\n' "$TESTS_PASSED"
    printf 'FAILED=%s\n' "$TESTS_FAILED"
    printf 'SKIPPED=%s\n' "$TESTS_SKIPPED"
    printf 'REPORT_FILE=%s\n' "$REPORT_FILE"
    printf 'FAILURES_FILE=%s\n' "$FAILURES_FILE"
  } | tee -a "$REPORT_FILE"

  printf '\nReport: %s\n' "$REPORT_FILE" >&2
  printf 'Failures: %s\n' "$FAILURES_FILE" >&2
}

require_command curl
require_command jq
require_command python
require_command mktemp

printf '%s\n' '============================================================'
printf '%s\n' 'BeeApp Calls + Chat E2E integration test'
printf '%s\n' "API base URL: $API_BASE_URL"
printf '%s\n' "Expiration test: $RUN_EXPIRATION_TEST"
printf '%s\n' 'This script creates real call sessions and system messages.'
printf '%s\n' '============================================================'

mapfile -t LOGIN_A < <(login_user "USER_A")
if [ "${#LOGIN_A[@]}" -lt 2 ]; then
  print_summary
  exit 1
fi
ACCESS_TOKEN_A="${LOGIN_A[0]}"
USER_A_ID="${LOGIN_A[1]}"

mapfile -t LOGIN_B < <(login_user "USER_B")
if [ "${#LOGIN_B[@]}" -lt 2 ]; then
  print_summary
  exit 1
fi
ACCESS_TOKEN_B="${LOGIN_B[0]}"
USER_B_ID="${LOGIN_B[1]}"

begin_test "DISTINCT_TEST_USERS"
if [ -n "$USER_A_ID" ] \
  && [ -n "$USER_B_ID" ] \
  && [ "$USER_A_ID" != "$USER_B_ID" ]; then
  mark_pass "Two distinct authenticated users are being used."
else
  mark_failure \
    "Use two different test users." \
    "N/A"
  print_summary
  exit 1
fi

bootstrap_user "USER_A" "$ACCESS_TOKEN_A"
bootstrap_user "USER_B" "$ACCESS_TOKEN_B"

IDENTITY_A_ID="$(get_profile_identity "USER_A" "$ACCESS_TOKEN_A")"
IDENTITY_B_ID="$(get_profile_identity "USER_B" "$ACCESS_TOKEN_B")"

if [ -z "$IDENTITY_A_ID" ] || [ -z "$IDENTITY_B_ID" ]; then
  begin_test "IDENTITIES_READY"
  mark_failure "Could not obtain both profile identities." "N/A"
  print_summary
  exit 1
fi

create_direct_conversation || {
  print_summary
  exit 1
}

# Scenario 1: direct call decline -> visible, non-silent system message.
CALL_DECLINED_ID="$(start_call "DECLINED")" || {
  print_summary
  exit 1
}
call_detail \
  "DECLINED_BEFORE_ACTION" \
  "$CALL_DECLINED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID"
assert_call_status \
  "DECLINED_RINGING" \
  "$CALL_DECLINED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "ringing"
active_call \
  "DECLINED_RINGING" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "ringing"
refresh_token "DECLINED" "$CALL_DECLINED_ID"
test_unauthorized_identity "$CALL_DECLINED_ID"
decline_call "$CALL_DECLINED_ID"
assert_call_status \
  "DECLINED_ENDED" \
  "$CALL_DECLINED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "ended"
assert_call_system_message \
  "DECLINED" \
  "$CALL_DECLINED_ID" \
  "declined" \
  "Llamada rechazada" \
  "false"

# Scenario 2: cancellation before response -> silent system message.
CALL_CANCELLED_ID="$(start_call "CANCELLED")" || {
  print_summary
  exit 1
}
end_call \
  "CANCELLED_WHILE_RINGING" \
  "$CALL_CANCELLED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID"
assert_call_status \
  "CANCELLED" \
  "$CALL_CANCELLED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "cancelled"
assert_call_system_message \
  "CANCELLED" \
  "$CALL_CANCELLED_ID" \
  "cancelled" \
  "Llamada cancelada" \
  "true"

# Scenario 3: initiator join failure while ringing.
# cancel-join-attempt leaves the direct call ringing in the deployed RPC.
# Explicitly end it so the test can continue with subsequent scenarios.
CALL_JOIN_FAILURE_ID="$(start_call "JOIN_FAILURE")" || {
  print_summary
  exit 1
}
cancel_join_attempt "$CALL_JOIN_FAILURE_ID"

assert_call_status \
  "JOIN_FAILURE_STILL_RINGING" \
  "$CALL_JOIN_FAILURE_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "ringing"

end_call \
  "JOIN_FAILURE_CANCELLED" \
  "$CALL_JOIN_FAILURE_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID"

assert_call_status \
  "JOIN_FAILURE_CANCELLED" \
  "$CALL_JOIN_FAILURE_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "cancelled"

assert_call_system_message \
  "JOIN_FAILURE_CANCELLED" \
  "$CALL_JOIN_FAILURE_ID" \
  "cancelled" \
  "Llamada cancelada" \
  "true"

# Scenario 4: active call then leave -> ended, silent message.
CALL_LEFT_ID="$(start_call "LEAVE")" || {
  print_summary
  exit 1
}
confirm_joined \
  "LEAVE_INITIATOR" \
  "$CALL_LEFT_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID"
join_call \
  "LEAVE_RECIPIENT" \
  "$CALL_LEFT_ID" \
  "$ACCESS_TOKEN_B" \
  "$IDENTITY_B_ID"
confirm_joined \
  "LEAVE_RECIPIENT" \
  "$CALL_LEFT_ID" \
  "$ACCESS_TOKEN_B" \
  "$IDENTITY_B_ID"
assert_call_status \
  "LEAVE_ACTIVE" \
  "$CALL_LEFT_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "active"
active_call \
  "LEAVE_ACTIVE" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "active"
leave_call \
  "DIRECT_CALL" \
  "$CALL_LEFT_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID"
assert_call_status \
  "LEAVE_ENDED" \
  "$CALL_LEFT_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "ended"
assert_call_system_message \
  "LEAVE_ENDED" \
  "$CALL_LEFT_ID" \
  "ended" \
  "Llamada finalizada" \
  "true"

# Scenario 5: active call then explicit end -> ended, silent message.
CALL_ENDED_ID="$(start_call "END")" || {
  print_summary
  exit 1
}
confirm_joined \
  "END_INITIATOR" \
  "$CALL_ENDED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID"
join_call \
  "END_RECIPIENT" \
  "$CALL_ENDED_ID" \
  "$ACCESS_TOKEN_B" \
  "$IDENTITY_B_ID"
confirm_joined \
  "END_RECIPIENT" \
  "$CALL_ENDED_ID" \
  "$ACCESS_TOKEN_B" \
  "$IDENTITY_B_ID"
end_call \
  "ACTIVE_DIRECT_CALL" \
  "$CALL_ENDED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID"
assert_call_status \
  "END_ENDED" \
  "$CALL_ENDED_ID" \
  "$ACCESS_TOKEN_A" \
  "$IDENTITY_A_ID" \
  "ended"
assert_call_system_message \
  "END_ENDED" \
  "$CALL_ENDED_ID" \
  "ended" \
  "Llamada finalizada" \
  "true"

history

run_expiration_test

print_summary

unset ACCESS_TOKEN_A
unset ACCESS_TOKEN_B

if [ "$TESTS_FAILED" -gt 0 ]; then
  exit 1
fi
