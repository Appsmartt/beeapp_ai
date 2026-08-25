#!/usr/bin/env bash

set -u
set -o pipefail

API_BASE_URL="${BEEAPP_API_BASE_URL:-http://127.0.0.1:8000}"
RUN_ID="${BEEAPP_TEST_RUN_ID:-e2e-$(date -u +%Y%m%dT%H%M%SZ)-$$}"

OUTPUT_DIR="${BEEAPP_TEST_OUTPUT_DIR:-$PWD/beeapp_general_test_results}"
REPORT_FILE="$OUTPUT_DIR/general_backend_report_${RUN_ID}.txt"
FAILURES_FILE="$OUTPUT_DIR/general_backend_failures_${RUN_ID}.txt"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/beeapp-e2e-${RUN_ID}.XXXXXX")"

RUN_STORAGE_TESTS="${RUN_STORAGE_TESTS:-true}"
RUN_NOTES_TESTS="${RUN_NOTES_TESTS:-true}"
RUN_NOTIFICATIONS_TESTS="${RUN_NOTIFICATIONS_TESTS:-true}"
RUN_CALENDAR_TESTS="${RUN_CALENDAR_TESTS:-true}"
RUN_COMMERCIAL_TESTS="${RUN_COMMERCIAL_TESTS:-true}"
RUN_CHAT_TESTS="${RUN_CHAT_TESTS:-true}"
RUN_INTEGRATIONS_TESTS="${RUN_INTEGRATIONS_TESTS:-true}"
RUN_MAIL_TESTS="${RUN_MAIL_TESTS:-false}"
RUN_EXTERNAL_INTEGRATION_TESTS="${RUN_EXTERNAL_INTEGRATION_TESTS:-false}"
KEEP_REMOTE_TEST_DATA="${KEEP_REMOTE_TEST_DATA:-false}"

ACCESS_TOKEN_A=""
ACCESS_TOKEN_B=""
ACCESS_TOKEN_C=""
ACCESS_TOKEN_D=""

USER_A_ID=""
USER_B_ID=""
USER_C_ID=""
USER_D_ID=""

STORAGE_TEXT_FILE="$TMP_DIR/storage_${RUN_ID}.txt"
NOTE_TEXT_FILE="$TMP_DIR/note_${RUN_ID}.txt"
CHAT_TEXT_FILE="$TMP_DIR/chat_${RUN_ID}.txt"
MAIL_TEXT_FILE="$TMP_DIR/mail_${RUN_ID}.txt"
LOGO_PNG_FILE="$TMP_DIR/logo_${RUN_ID}.png"

declare -a REMOTE_FILE_IDS=()
declare -a STORAGE_FOLDER_IDS=()
declare -a STORAGE_TAG_IDS=()
declare -a NOTE_FOLDER_IDS=()
declare -a NOTE_TAG_IDS=()
declare -a NOTE_IDS=()
declare -a NOTE_SHARE_IDS=()
declare -a CALENDAR_IDS=()
declare -a CALENDAR_TAG_IDS=()
declare -a CALENDAR_EVENT_IDS=()
declare -a COMMERCIAL_PROFILE_IDS=()
declare -a CHAT_GROUP_IDS=()

STORAGE_FILE_ID=""
STORAGE_FOLDER_ID=""
STORAGE_TAG_ID=""
NOTE_ID=""
NOTE_ATTACHMENT_ID=""
NOTE_TAG_ID=""
NOTE_FOLDER_ID=""
NOTE_SHARE_ID=""
CALENDAR_ID=""
CALENDAR_TAG_ID=""
CALENDAR_EVENT_ID=""
CALENDAR_DUPLICATE_EVENT_ID=""
COMMERCIAL_PROFILE_ID=""
LOGO_FILE_ID=""

USER_A_IDENTITY_ID=""
USER_B_IDENTITY_ID=""
USER_C_IDENTITY_ID=""
USER_D_IDENTITY_ID=""
DIRECT_CONVERSATION_ID=""
DIRECT_MESSAGE_A_ID=""
DIRECT_MESSAGE_B_ID=""
NORMAL_GROUP_ID=""
NORMAL_GROUP_INVITE_ID=""
BROADCAST_GROUP_ID=""
BROADCAST_GROUP_INVITE_ID=""
CHAT_ATTACHMENT_MESSAGE_ID=""
CHAT_ATTACHMENT_FILE_ID=""

TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0
EXPECTED_FAILURES_OK=0

CURRENT_TEST_LABEL=""
HTTP_CODE=""
CURL_EXIT_CODE=0
RESPONSE_FILE=""
CURL_ERROR_FILE=""

mkdir -p "$OUTPUT_DIR"
: > "$REPORT_FILE"
: > "$FAILURES_FILE"


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
          .phone_dial_code,
          .normalized_phone,
          .url,
          .signed_url,
          .signedURL,
          .storage_path,
          .bucket_id,
          .provider_payload,
          .access_token_ciphertext,
          .refresh_token_ciphertext,
          .id_token_ciphertext
        )
      else
        .
      end
    )
  ' 2>/dev/null || cat
}


record_section() {
  {
    printf '\n============================================================\n'
    printf '%s\n' "$1"
    printf '============================================================\n'
  } >> "$REPORT_FILE"
}


record_response() {
  local label="$1"
  local http_code="$2"
  local body_file="$3"

  record_section "$label"
  printf 'HTTP_STATUS=%s\n' "$http_code" >> "$REPORT_FILE"

  if [ -s "$body_file" ]; then
    sanitize_json < "$body_file" >> "$REPORT_FILE"
  else
    printf '(Empty response)\n' >> "$REPORT_FILE"
  fi
}


begin_test() {
  CURRENT_TEST_LABEL="$1"
  TESTS_TOTAL=$((TESTS_TOTAL + 1))

  {
    printf '\n------------------------------------------------------------\n'
    printf 'TEST_START=%s\n' "$CURRENT_TEST_LABEL"
  } >> "$REPORT_FILE"
}


mark_pass() {
  local message="$1"

  TESTS_PASSED=$((TESTS_PASSED + 1))

  {
    printf 'TEST_RESULT=PASS\n'
    printf 'PASS: %s\n' "$message"
  } >> "$REPORT_FILE"

  printf '✅ PASS [%s] %s\n' \
    "$CURRENT_TEST_LABEL" \
    "$message" >&2
}


mark_skip() {
  local message="$1"

  TESTS_SKIPPED=$((TESTS_SKIPPED + 1))

  {
    printf 'TEST_RESULT=SKIPPED\n'
    printf 'SKIPPED: %s\n' "$message"
  } >> "$REPORT_FILE"

  printf '⏭️  SKIP [%s] %s\n' \
    "$CURRENT_TEST_LABEL" \
    "$message" >&2
}


guess_failure_cause() {
  local http_code="$1"
  local response_text="$2"
  local curl_error="$3"

  local combined
  combined="$(
    printf '%s %s' "$response_text" "$curl_error" \
      | tr '[:upper:]' '[:lower:]'
  )"

  if [[ "$combined" == *"connection refused"* ]]; then
    printf '%s' \
      "Django is not running or BEEAPP_API_BASE_URL has the wrong host/port."
    return
  fi

  if [[ "$combined" == *"timed out"* ]]; then
    printf '%s' \
      "Request timed out. Review Django logs, Supabase RPCs, triggers, network, or a blocked transaction."
    return
  fi

  if [[ "$http_code" == "401" ]]; then
    printf '%s' \
      "Authentication failed. Verify test credentials, login endpoint, access token extraction, or backend authentication."
    return
  fi

  if [[ "$http_code" == "403" ]]; then
    printf '%s' \
      "Authorization failed. Verify resource ownership, active participation, roles, permissions, RLS, and authenticated JWT propagation."
    return
  fi

  if [[ "$http_code" == "404" ]]; then
    printf '%s' \
      "The resource was not found, is inactive, deleted, inaccessible, or the generated ID was not extracted correctly."
    return
  fi

  if [[ "$http_code" == "413" ]]; then
    printf '%s' \
      "Upload was too large or the account has insufficient Storage quota."
    return
  fi

  if [[ "$http_code" == "429" ]]; then
    printf '%s' \
      "A Django rate throttle was reached. Wait for the configured rate-limit window before retrying."
    return
  fi

  if [[ "$http_code" == "500" ]]; then
    printf '%s' \
      "Unhandled backend error. Inspect the Django traceback and Supabase/PostgREST errors."
    return
  fi

  if [[ "$combined" == *"authentication_required"* ]]; then
    printf '%s' \
      "Supabase did not receive a valid user JWT. Review Authorization propagation and get_supabase_user_client()."
    return
  fi

  if [[ "$combined" == *"function"* ]] \
    && [[ "$combined" == *"does not exist"* ]]; then
    printf '%s' \
      "A required Supabase RPC is missing or its parameter signature differs from the deployed function."
    return
  fi

  if [[ "$combined" == *"column"* ]] \
    && [[ "$combined" == *"does not exist"* ]]; then
    printf '%s' \
      "The backend queried a database column absent from the deployed Supabase schema."
    return
  fi

  if [[ "$combined" == *"quota"* ]]; then
    printf '%s' \
      "Storage quota was exceeded or could not be reserved."
    return
  fi

  if [[ "$combined" == *"calendar"* ]] \
    && [[ "$combined" == *"not found"* ]]; then
    printf '%s' \
      "Calendar access, ownership, event IDs, tags, or attendee records need verification."
    return
  fi

  if [[ "$combined" == *"chat"* ]]; then
    printf '%s' \
      "Chat validation or authorization failed. Verify identity ownership, active membership, role, posting policy, attachments, RLS, and RPC rules."
    return
  fi

  if [[ "$http_code" == "400" ]]; then
    printf '%s' \
      "Payload validation or a domain rule failed. Inspect RESPONSE_BODY for serializer, service, provider, or SQL details."
    return
  fi

  printf '%s' \
    "Cause was not classified automatically. Inspect RESPONSE_BODY, Django traceback, and Supabase logs."
}


mark_failure() {
  local message="$1"
  local http_code="${2:-N/A}"
  local body_file="${3:-}"
  local curl_error_file="${4:-}"

  local response_text=""
  local curl_error_text=""
  local probable_cause=""

  TESTS_FAILED=$((TESTS_FAILED + 1))

  if [ -n "$body_file" ] && [ -f "$body_file" ]; then
    response_text="$(sanitize_json < "$body_file")"
  fi

  if [ -n "$curl_error_file" ] && [ -f "$curl_error_file" ]; then
    curl_error_text="$(cat "$curl_error_file")"
  fi

  probable_cause="$(
    guess_failure_cause \
      "$http_code" \
      "$response_text" \
      "$curl_error_text"
  )"

  {
    printf '\n============================================================\n'
    printf 'FAILED_TEST=%s\n' "$CURRENT_TEST_LABEL"
    printf 'MESSAGE=%s\n' "$message"
    printf 'HTTP_STATUS=%s\n' "$http_code"
    printf 'POSSIBLE_CAUSE=%s\n' "$probable_cause"
    printf '%s\n' '------------------------------------------------------------'

    if [ -n "$response_text" ]; then
      printf '%s\n' 'RESPONSE_BODY:'
      printf '%s\n' "$response_text"
    else
      printf '%s\n' 'RESPONSE_BODY=(Empty)'
    fi

    if [ -n "$curl_error_text" ]; then
      printf '%s\n' 'CURL_ERROR:'
      printf '%s\n' "$curl_error_text"
    fi

    printf '%s\n' 'RECOMMENDED_ACTION:'
    printf '%s\n' \
      '1. Read RESPONSE_BODY and POSSIBLE_CAUSE.'
    printf '%s\n' \
      '2. Inspect Django runserver traceback.'
    printf '%s\n' \
      '3. Verify Supabase RPCs, RLS, triggers, constraints, and authenticated JWT propagation.'
    printf '============================================================\n'
  } >> "$FAILURES_FILE"

  printf '\n❌ FAIL [%s] %s\n' \
    "$CURRENT_TEST_LABEL" \
    "$message" >&2
  printf 'HTTP_STATUS=%s\n' "$http_code" >&2
  printf 'POSSIBLE_CAUSE=%s\n' "$probable_cause" >&2
}


mark_expected_failure_ok() {
  local message="$1"

  TESTS_PASSED=$((TESTS_PASSED + 1))
  EXPECTED_FAILURES_OK=$((EXPECTED_FAILURES_OK + 1))

  {
    printf 'TEST_RESULT=PASS_EXPECTED_FAILURE\n'
    printf 'EXPECTED_FAILURE_OK: %s\n' "$message"
  } >> "$REPORT_FILE"

  printf '✅ PASS [%s] %s\n' \
    "$CURRENT_TEST_LABEL" \
    "$message" >&2
}


request() {
  local method="$1"
  local token="$2"
  local url="$3"
  local body="${4:-}"
  local content_type="${5:-}"

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

  if [ -n "$content_type" ]; then
    curl_args+=(--header "Content-Type: $content_type")
  fi

  if [ -n "$body" ]; then
    curl_args+=(--data "$body")
  fi

  curl_args+=("$url")

  HTTP_CODE="$(curl "${curl_args[@]}" 2>"$CURL_ERROR_FILE")"
  CURL_EXIT_CODE=$?
}


request_multipart() {
  local method="$1"
  local token="$2"
  local url="$3"
  shift 3

  RESPONSE_FILE="$(mktemp)"
  CURL_ERROR_FILE="$(mktemp)"

  local -a curl_args=(
    --silent
    --show-error
    --max-time 180
    --request "$method"
    --header "Authorization: Bearer $token"
    --header "Accept: application/json"
    --output "$RESPONSE_FILE"
    --write-out "%{http_code}"
  )

  while [ "$#" -gt 0 ]; do
    curl_args+=(--form "$1")
    shift
  done

  curl_args+=("$url")

  HTTP_CODE="$(curl "${curl_args[@]}" 2>"$CURL_ERROR_FILE")"
  CURL_EXIT_CODE=$?
}


cleanup_request_files() {
  rm -f \
    "${RESPONSE_FILE:-}" \
    "${CURL_ERROR_FILE:-}"

  RESPONSE_FILE=""
  CURL_ERROR_FILE=""
}


run_json_request() {
  local label="$1"
  local method="$2"
  local token="$3"
  local url="$4"
  local body="$5"
  local expected_code="$6"

  begin_test "$label"

  request \
    "$method" \
    "$token" \
    "$url" \
    "$body" \
    "application/json"

  record_response \
    "$label" \
    "$HTTP_CODE" \
    "$RESPONSE_FILE"

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    mark_failure \
      "curl request failed." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  elif [ "$HTTP_CODE" != "$expected_code" ]; then
    mark_failure \
      "Expected HTTP $expected_code, got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  else
    mark_pass "Returned expected HTTP $expected_code."
  fi

  cleanup_request_files
}


run_get() {
  local label="$1"
  local token="$2"
  local url="$3"
  local expected_code="${4:-200}"

  begin_test "$label"

  request "GET" "$token" "$url"

  record_response \
    "$label" \
    "$HTTP_CODE" \
    "$RESPONSE_FILE"

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    mark_failure \
      "curl request failed." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  elif [ "$HTTP_CODE" != "$expected_code" ]; then
    mark_failure \
      "Expected HTTP $expected_code, got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  else
    mark_pass "Returned expected HTTP $expected_code."
  fi

  cleanup_request_files
}


run_expected_failure() {
  local label="$1"
  local method="$2"
  local token="$3"
  local url="$4"
  local body="$5"
  local accepted_codes="${6:-400 403}"

  begin_test "$label"

  request \
    "$method" \
    "$token" \
    "$url" \
    "$body" \
    "application/json"

  record_response \
    "$label" \
    "$HTTP_CODE" \
    "$RESPONSE_FILE"

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    mark_failure \
      "curl request failed unexpectedly." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  elif [[ " $accepted_codes " == *" $HTTP_CODE "* ]]; then
    mark_expected_failure_ok \
      "Expected rejection returned HTTP $HTTP_CODE."

  else
    mark_failure \
      "Expected one of [$accepted_codes], got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"
  fi

  cleanup_request_files
}


extract_json_value() {
  local json="$1"
  local filter="$2"

  printf '%s' "$json" \
    | jq -r "$filter // empty" \
    | head -n 1
}


extract_profile_identity_id() {
  local json="$1"

  printf '%s' "$json" \
    | jq -r '
      .identities[]
      | select(.identity_type == "profile")
      | .id
    ' \
    | head -n 1
}


validate_uuid_value() {
  local label="$1"
  local value="$2"

  begin_test "$label"

  if [ -z "$value" ] || [ "$value" = "null" ]; then
    mark_failure "UUID was not extracted." "N/A"
    return 1
  fi

  if ! [[ "$value" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
    mark_failure "Extracted value is not a UUID: $value" "N/A"
    return 1
  fi

  mark_pass "UUID extracted successfully."
  return 0
}


assert_json_value() {
  local label="$1"
  local actual="$2"
  local expected="$3"

  begin_test "$label"

  if [ "$actual" = "$expected" ]; then
    mark_pass "Value matched expected value: $expected."
  else
    mark_failure \
      "Expected '$expected', got '${actual:-empty}'." \
      "N/A"
  fi
}


register_remote_file() {
  local file_id="$1"

  if [ -n "$file_id" ] && [ "$file_id" != "null" ]; then
    REMOTE_FILE_IDS+=("$file_id")
  fi
}


register_resource() {
  local array_name="$1"
  local resource_id="$2"

  if [ -n "$resource_id" ] && [ "$resource_id" != "null" ]; then
    eval "$array_name+=(\"\$resource_id\")"
  fi
}


login() {
  local user_label="$1"
  local email=""
  local password=""
  local login_body=""
  local login_file=""
  local login_error_file=""
  local login_http_code=""
  local login_exit_code=0
  local token=""

  read -r -p "BeeApp email for ${user_label}: " email >&2
  read -r -s -p "BeeApp password for ${user_label}: " password >&2
  printf '\n' >&2

  login_body="$(
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
      --data "$login_body" \
      --output "$login_file" \
      --write-out "%{http_code}" \
      "$API_BASE_URL/api/accounts/login/" \
      2>"$login_error_file"
  )"
  login_exit_code=$?

  begin_test "LOGIN_${user_label}"

  {
    printf '\n============================================================\n'
    printf 'LOGIN_%s\n' "$user_label"
    printf '============================================================\n'
    printf 'HTTP_STATUS=%s\n' "$login_http_code"

    if [ -s "$login_file" ]; then
      sanitize_json < "$login_file"
    else
      printf '(Empty response)\n'
    fi
  } >> "$REPORT_FILE"

  token="$(
    jq -r '.session.access_token // empty' \
      "$login_file" \
      2>/dev/null || true
  )"

  if [ "$login_exit_code" -ne 0 ] \
    || [ "$login_http_code" != "200" ] \
    || [ -z "$token" ]; then
    mark_failure \
      "Login did not return session.access_token." \
      "$login_http_code" \
      "$login_file" \
      "$login_error_file"

    rm -f "$login_file" "$login_error_file"
    exit 1
  fi

  mark_pass "Authentication succeeded and access token was extracted."

  rm -f "$login_file" "$login_error_file"

  printf '%s' "$token"
}


create_local_test_files() {
  printf 'BeeApp Storage E2E test file.\nRun ID: %s\n' \
    "$RUN_ID" > "$STORAGE_TEXT_FILE"

  printf 'BeeApp Notes E2E attachment.\nRun ID: %s\n' \
    "$RUN_ID" > "$NOTE_TEXT_FILE"

  printf 'BeeApp Chat E2E attachment.\nRun ID: %s\n' \
    "$RUN_ID" > "$CHAT_TEXT_FILE"

  printf 'BeeApp Mail E2E attachment.\nRun ID: %s\n' \
    "$RUN_ID" > "$MAIL_TEXT_FILE"

  base64 -d > "$LOGO_PNG_FILE" <<'PNG'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLkSAAAAABJRU5ErkJggg==
PNG
}


cleanup_remote_file() {
  local file_id="$1"

  [ -z "$file_id" ] && return 0
  [ "$file_id" = "null" ] && return 0

  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$file_id/trash/"

  if [ "$CURL_EXIT_CODE" -eq 0 ] \
    && { [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; }; then
    :
  fi

  cleanup_request_files

  request \
    "DELETE" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$file_id/"

  cleanup_request_files
}


cleanup_resources() {
  if [ "$KEEP_REMOTE_TEST_DATA" = "true" ]; then
    {
      printf '\nKEEP_REMOTE_TEST_DATA=true; remote cleanup skipped.\n'
    } >> "$REPORT_FILE"
    return
  fi

  record_section "CLEANUP"

  local id=""

  for id in "${CHAT_GROUP_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/chat/groups/$id/" \
      "$(jq -n --arg owner_identity_id "$USER_A_IDENTITY_ID" '{owner_identity_id:$owner_identity_id}')" \
      "application/json"
    cleanup_request_files
  done

  for id in "${CALENDAR_EVENT_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/calendar/events/$id/"
    cleanup_request_files
  done

  for id in "${CALENDAR_TAG_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/calendar/tags/$id/"
    cleanup_request_files
  done

  for id in "${CALENDAR_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/calendar/calendars/$id/"
    cleanup_request_files
  done

  for id in "${NOTE_SHARE_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "POST" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/notes/shares/$id/revoke/" \
      '{}' \
      "application/json"
    cleanup_request_files
  done

  for id in "${NOTE_IDS[@]:-}"; do
    [ -z "$id" ] && continue

    request \
      "POST" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/notes/$id/trash/" \
      '{}' \
      "application/json"
    cleanup_request_files

    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/notes/$id/"
    cleanup_request_files
  done

  for id in "${NOTE_TAG_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/notes/tags/$id/"
    cleanup_request_files
  done

  for id in "${NOTE_FOLDER_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/notes/folders/$id/"
    cleanup_request_files
  done

  for id in "${STORAGE_TAG_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/storage/tags/$id/"
    cleanup_request_files
  done

  for id in "${STORAGE_FOLDER_IDS[@]:-}"; do
    [ -z "$id" ] && continue
    request \
      "DELETE" \
      "$ACCESS_TOKEN_A" \
      "$API_BASE_URL/api/storage/folders/$id/"
    cleanup_request_files
  done

  for id in "${REMOTE_FILE_IDS[@]:-}"; do
    cleanup_remote_file "$id"
  done

  {
    printf 'Remote cleanup attempted for test resources.\n'
  } >> "$REPORT_FILE"
}


cleanup() {
  cleanup_resources || true
  rm -rf "$TMP_DIR"
  unset     ACCESS_TOKEN_A     ACCESS_TOKEN_B     ACCESS_TOKEN_C     ACCESS_TOKEN_D
}
trap cleanup EXIT INT TERM


require_command curl
require_command jq
require_command base64

create_local_test_files

record_section "BEEAPP_GENERAL_BACKEND_E2E_TEST"

{
  printf 'RUN_ID=%s\n' "$RUN_ID"
  printf 'API_BASE_URL=%s\n' "$API_BASE_URL"
  printf 'TMP_DIR=%s\n' "$TMP_DIR"
  printf 'RUN_STORAGE_TESTS=%s\n' "$RUN_STORAGE_TESTS"
  printf 'RUN_NOTES_TESTS=%s\n' "$RUN_NOTES_TESTS"
  printf 'RUN_NOTIFICATIONS_TESTS=%s\n' "$RUN_NOTIFICATIONS_TESTS"
  printf 'RUN_CALENDAR_TESTS=%s\n' "$RUN_CALENDAR_TESTS"
  printf 'RUN_COMMERCIAL_TESTS=%s\n' "$RUN_COMMERCIAL_TESTS"
  printf 'RUN_CHAT_TESTS=%s\n' "$RUN_CHAT_TESTS"
  printf 'RUN_INTEGRATIONS_TESTS=%s\n' "$RUN_INTEGRATIONS_TESTS"
  printf 'RUN_MAIL_TESTS=%s\n' "$RUN_MAIL_TESTS"
  printf 'KEEP_REMOTE_TEST_DATA=%s\n' "$KEEP_REMOTE_TEST_DATA"
  printf '%s\n' \
    'NOTE=This suite creates real remote data. Cleanup is attempted automatically unless KEEP_REMOTE_TEST_DATA=true.'
  printf '%s\n' \
    'NOTE=OAuth callbacks, provider sync, and email sending are disabled by default.'
} >> "$REPORT_FILE"

printf '\n============================================================\n'
printf 'BeeApp General Backend E2E Test\n'
printf 'API: %s\n' "$API_BASE_URL"
printf 'Run ID: %s\n' "$RUN_ID"
printf '============================================================\n'
printf '%s\n\n' \
  'Use four distinct BeeApp accounts:
- User A: owner of test resources.
- User B: primary collaborator, attendee, and chat participant.
- User C: second collaborator and additional test participant.
- User D: unauthorized user used for negative-access tests.'

ACCESS_TOKEN_A="$(login "USER_A_OWNER")"
ACCESS_TOKEN_B="$(login "USER_B_COLLABORATOR")"
ACCESS_TOKEN_C="$(login "USER_C_SECOND_COLLABORATOR")"
ACCESS_TOKEN_D="$(login "USER_D_UNAUTHORIZED")"

begin_test "01_HEALTH_CHECK"
request "GET" "" "$API_BASE_URL/api/health/"
record_response "01_HEALTH_CHECK" "$HTTP_CODE" "$RESPONSE_FILE"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure \
    "Health endpoint failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Health endpoint returned HTTP 200."
fi
cleanup_request_files

begin_test "02_GET_CURRENT_PROFILE_USER_A"
request "GET" "$ACCESS_TOKEN_A" "$API_BASE_URL/api/accounts/me/"
record_response \
  "02_GET_CURRENT_PROFILE_USER_A" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"
PROFILE_A_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure \
    "Could not retrieve User A profile." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "User A profile returned HTTP 200."
fi

USER_A_ID="$(extract_json_value "$PROFILE_A_RESULT" '.profile.id')"
cleanup_request_files

if ! validate_uuid_value "02A_USER_A_ID" "$USER_A_ID"; then
  exit 1
fi

begin_test "03_GET_CURRENT_PROFILE_USER_B"
request "GET" "$ACCESS_TOKEN_B" "$API_BASE_URL/api/accounts/me/"
record_response \
  "03_GET_CURRENT_PROFILE_USER_B" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"
PROFILE_B_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure \
    "Could not retrieve User B profile." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "User B profile returned HTTP 200."
fi

USER_B_ID="$(extract_json_value "$PROFILE_B_RESULT" '.profile.id')"
cleanup_request_files

if ! validate_uuid_value "03A_USER_B_ID" "$USER_B_ID"; then
  exit 1
fi

begin_test "04_GET_CURRENT_PROFILE_USER_C"
request "GET" "$ACCESS_TOKEN_C" "$API_BASE_URL/api/accounts/me/"
record_response   "04_GET_CURRENT_PROFILE_USER_C"   "$HTTP_CODE"   "$RESPONSE_FILE"
PROFILE_C_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure     "Could not retrieve User C profile."     "$HTTP_CODE"     "$RESPONSE_FILE"     "$CURL_ERROR_FILE"
else
  mark_pass "User C profile returned HTTP 200."
fi

USER_C_ID="$(extract_json_value "$PROFILE_C_RESULT" '.profile.id')"
cleanup_request_files

if ! validate_uuid_value "04A_USER_C_ID" "$USER_C_ID"; then
  exit 1
fi

begin_test "05_GET_CURRENT_PROFILE_USER_D"
request "GET" "$ACCESS_TOKEN_D" "$API_BASE_URL/api/accounts/me/"
record_response   "05_GET_CURRENT_PROFILE_USER_D"   "$HTTP_CODE"   "$RESPONSE_FILE"
PROFILE_D_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure     "Could not retrieve User D profile."     "$HTTP_CODE"     "$RESPONSE_FILE"     "$CURL_ERROR_FILE"
else
  mark_pass "User D profile returned HTTP 200."
fi

USER_D_ID="$(extract_json_value "$PROFILE_D_RESULT" '.profile.id')"
cleanup_request_files

if ! validate_uuid_value "05A_USER_D_ID" "$USER_D_ID"; then
  exit 1
fi


if [ "$RUN_STORAGE_TESTS" = "true" ]; then
  run_get \
    "10_STORAGE_SUMMARY_USER_A" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/summary/" \
    "200"

  begin_test "11_CREATE_STORAGE_FOLDER"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/folders/" \
    "$(jq -n --arg run_id "$RUN_ID" '{name:("E2E Storage Folder " + $run_id), parent_id:null}')" \
    "application/json"
  record_response "11_CREATE_STORAGE_FOLDER" "$HTTP_CODE" "$RESPONSE_FILE"
  STORAGE_FOLDER_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create storage folder." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Storage folder was created."
  fi

  STORAGE_FOLDER_ID="$(extract_json_value "$STORAGE_FOLDER_RESULT" '.folder.id')"
  cleanup_request_files

  if validate_uuid_value "11A_STORAGE_FOLDER_ID" "$STORAGE_FOLDER_ID"; then
    register_resource STORAGE_FOLDER_IDS "$STORAGE_FOLDER_ID"
  fi

  run_json_request \
    "12_RENAME_STORAGE_FOLDER" \
    "PATCH" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/folders/$STORAGE_FOLDER_ID/" \
    "$(jq -n --arg run_id "$RUN_ID" '{name:("E2E Storage Folder Renamed " + $run_id)}')" \
    "200"

  begin_test "13_UPLOAD_STORAGE_TEXT_FILE"
  request_multipart \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/uploads/" \
    "folder_id=$STORAGE_FOLDER_ID" \
    "file=@${STORAGE_TEXT_FILE};type=text/plain"
  record_response "13_UPLOAD_STORAGE_TEXT_FILE" "$HTTP_CODE" "$RESPONSE_FILE"
  STORAGE_UPLOAD_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not upload storage text file." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Storage text file was uploaded."
  fi

  STORAGE_FILE_ID="$(extract_json_value "$STORAGE_UPLOAD_RESULT" '.files[0].id')"
  cleanup_request_files

  if validate_uuid_value "13A_STORAGE_FILE_ID" "$STORAGE_FILE_ID"; then
    register_remote_file "$STORAGE_FILE_ID"
  fi

  run_get \
    "14_LIST_STORAGE_FILES_IN_FOLDER" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/?folder_id=$STORAGE_FOLDER_ID&status=ready&limit=50" \
    "200"

  run_json_request \
    "15_RENAME_STORAGE_FILE" \
    "PATCH" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$STORAGE_FILE_ID/" \
    "$(jq -n --arg run_id "$RUN_ID" '{display_name:("e2e-storage-renamed-" + $run_id + ".txt")}')" \
    "200"

  run_get \
    "16_GET_STORAGE_FILE_ACCESS_URL" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$STORAGE_FILE_ID/access/?download=true" \
    "200"

  begin_test "17_CREATE_STORAGE_TAG"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/tags/" \
    "$(jq -n --arg run_id "$RUN_ID" '{name:("E2E Storage Tag " + $run_id), icon:"tag", color:"#8B5CF6", sort_order:0}')" \
    "application/json"
  record_response "17_CREATE_STORAGE_TAG" "$HTTP_CODE" "$RESPONSE_FILE"
  STORAGE_TAG_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create storage tag." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Storage tag was created."
  fi

  STORAGE_TAG_ID="$(extract_json_value "$STORAGE_TAG_RESULT" '.tag.id')"
  cleanup_request_files

  if validate_uuid_value "17A_STORAGE_TAG_ID" "$STORAGE_TAG_ID"; then
    register_resource STORAGE_TAG_IDS "$STORAGE_TAG_ID"
  fi

  run_json_request \
    "18_ASSIGN_STORAGE_TAG_TO_FILE" \
    "PUT" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$STORAGE_FILE_ID/tags/" \
    "$(jq -n --arg tag_id "$STORAGE_TAG_ID" '{tag_ids:[$tag_id]}')" \
    "200"

  run_get \
    "19_LIST_STORAGE_FILE_TAGS" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$STORAGE_FILE_ID/tags/" \
    "200"

  run_json_request \
    "20_TRASH_STORAGE_FILE" \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$STORAGE_FILE_ID/trash/" \
    '{}' \
    "200"

  run_json_request \
    "21_RESTORE_STORAGE_FILE" \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/files/$STORAGE_FILE_ID/restore/" \
    '{}' \
    "200"
else
  begin_test "10_STORAGE_TESTS_DISABLED"
  mark_skip "RUN_STORAGE_TESTS is not true."
fi


if [ "$RUN_NOTES_TESTS" = "true" ]; then
  run_get \
    "30_LIST_NOTE_TEMPLATES" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/templates/" \
    "200"

  begin_test "31_CREATE_NOTE_FOLDER"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/folders/" \
    "$(jq -n --arg run_id "$RUN_ID" '{name:("E2E Note Folder " + $run_id), parent_id:null}')" \
    "application/json"
  record_response "31_CREATE_NOTE_FOLDER" "$HTTP_CODE" "$RESPONSE_FILE"
  NOTE_FOLDER_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create note folder." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Note folder was created."
  fi

  NOTE_FOLDER_ID="$(extract_json_value "$NOTE_FOLDER_RESULT" '.folder.id')"
  cleanup_request_files

  if validate_uuid_value "31A_NOTE_FOLDER_ID" "$NOTE_FOLDER_ID"; then
    register_resource NOTE_FOLDER_IDS "$NOTE_FOLDER_ID"
  fi

  begin_test "32_CREATE_NOTE_TAG"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/tags/" \
    "$(jq -n --arg run_id "$RUN_ID" '{name:("E2E Note Tag " + $run_id), icon:"tag", color:"#8B5CF6", sort_order:0}')" \
    "application/json"
  record_response "32_CREATE_NOTE_TAG" "$HTTP_CODE" "$RESPONSE_FILE"
  NOTE_TAG_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create note tag." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Note tag was created."
  fi

  NOTE_TAG_ID="$(extract_json_value "$NOTE_TAG_RESULT" '.tag.id')"
  cleanup_request_files

  if validate_uuid_value "32A_NOTE_TAG_ID" "$NOTE_TAG_ID"; then
    register_resource NOTE_TAG_IDS "$NOTE_TAG_ID"
  fi

  begin_test "33_CREATE_NOTE"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/" \
    "$(jq -n --arg title "E2E Note $RUN_ID" --arg folder_id "$NOTE_FOLDER_ID" '{title:$title, folder_id:$folder_id}')" \
    "application/json"
  record_response "33_CREATE_NOTE" "$HTTP_CODE" "$RESPONSE_FILE"
  NOTE_CREATE_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create note." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Note was created."
  fi

  NOTE_ID="$(extract_json_value "$NOTE_CREATE_RESULT" '.note.id')"
  cleanup_request_files

  if validate_uuid_value "33A_NOTE_ID" "$NOTE_ID"; then
    register_resource NOTE_IDS "$NOTE_ID"
  fi

  NOTE_CONTENT="$(
    jq -n --arg run_id "$RUN_ID" '{
      version: 1,
      blocks: [
        {
          id: ("e2e-text-" + $run_id),
          type: "text",
          content: "BeeApp end-to-end note content."
        },
        {
          id: ("e2e-heading-" + $run_id),
          type: "heading",
          content: "E2E heading"
        }
      ]
    }'
  )"

  run_json_request \
    "34_UPDATE_NOTE_CONTENT" \
    "PATCH" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/" \
    "$(jq -n --argjson content "$NOTE_CONTENT" --arg folder_id "$NOTE_FOLDER_ID" '{content:$content, color:"#8B5CF6", folder_id:$folder_id, is_favorite:true, is_pinned:true}')" \
    "200"

  run_json_request \
    "35_ASSIGN_NOTE_TAG" \
    "PUT" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/tags/" \
    "$(jq -n --arg tag_id "$NOTE_TAG_ID" '{tag_ids:[$tag_id]}')" \
    "200"

  run_get \
    "36_LIST_NOTE_TAGS_FOR_NOTE" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/tags/" \
    "200"

  begin_test "37_UPLOAD_AND_ATTACH_NOTE_FILE"
  request_multipart \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/attachments/upload/" \
    "attachment_type=attachment" \
    "file=@${NOTE_TEXT_FILE};type=text/plain"
  record_response "37_UPLOAD_AND_ATTACH_NOTE_FILE" "$HTTP_CODE" "$RESPONSE_FILE"
  NOTE_ATTACHMENT_UPLOAD_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not upload note attachment." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Note attachment was uploaded and linked."
  fi

  NOTE_ATTACHMENT_ID="$(extract_json_value "$NOTE_ATTACHMENT_UPLOAD_RESULT" '.attachments[0].id')"
  NOTE_ATTACHMENT_FILE_ID="$(extract_json_value "$NOTE_ATTACHMENT_UPLOAD_RESULT" '.attachments[0].file.id')"
  cleanup_request_files

  if validate_uuid_value "37A_NOTE_ATTACHMENT_ID" "$NOTE_ATTACHMENT_ID"; then
    :
  fi

  if validate_uuid_value "37B_NOTE_ATTACHMENT_FILE_ID" "$NOTE_ATTACHMENT_FILE_ID"; then
    register_remote_file "$NOTE_ATTACHMENT_FILE_ID"
  fi

  run_get \
    "38_LIST_NOTE_ATTACHMENTS" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/attachments/" \
    "200"

  run_get \
    "39_GET_NOTE_ATTACHMENT_ACCESS_URL" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/attachments/$NOTE_ATTACHMENT_ID/access/?download=true" \
    "200"

  begin_test "40_SHARE_NOTE_A_TO_B"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/shares/" \
    "$(jq -n --arg recipient_id "$USER_B_ID" '{recipient_id:$recipient_id, expires_at:null}')" \
    "application/json"
  record_response "40_SHARE_NOTE_A_TO_B" "$HTTP_CODE" "$RESPONSE_FILE"
  NOTE_SHARE_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not share note with User B." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Note share for User B was created."
  fi

  NOTE_SHARE_ID="$(extract_json_value "$NOTE_SHARE_RESULT" '.share.id')"
  cleanup_request_files

  if validate_uuid_value "40A_NOTE_SHARE_ID" "$NOTE_SHARE_ID"; then
    register_resource NOTE_SHARE_IDS "$NOTE_SHARE_ID"
  fi

  run_get \
    "41_LIST_RECEIVED_NOTE_SHARES_USER_B" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/notes/shares/received/?include_hidden=false&limit=50" \
    "200"

  run_get \
    "42_GET_SHARED_NOTE_AS_USER_B" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/notes/shared/$NOTE_ID/" \
    "200"

  run_get \
    "43_GET_SHARED_NOTE_ATTACHMENT_AS_USER_B" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/notes/$NOTE_ID/attachments/" \
    "200"

  run_json_request \
    "44_REVOKE_NOTE_SHARE" \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/shares/$NOTE_SHARE_ID/revoke/" \
    '{}' \
    "200"

  run_json_request \
    "45_TRASH_NOTE" \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/trash/" \
    '{}' \
    "200"

  run_json_request \
    "46_RESTORE_NOTE" \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notes/$NOTE_ID/restore/" \
    '{}' \
    "200"
else
  begin_test "30_NOTES_TESTS_DISABLED"
  mark_skip "RUN_NOTES_TESTS is not true."
fi


if [ "$RUN_NOTIFICATIONS_TESTS" = "true" ]; then
  run_get \
    "50_LIST_NOTIFICATIONS_USER_A" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notifications/?limit=50&offset=0" \
    "200"

  run_json_request \
    "51_MARK_ALL_STORAGE_NOTIFICATIONS_READ" \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/notifications/read-all/?module=storage" \
    '{}' \
    "200"
else
  begin_test "50_NOTIFICATIONS_TESTS_DISABLED"
  mark_skip "RUN_NOTIFICATIONS_TESTS is not true."
fi


if [ "$RUN_CALENDAR_TESTS" = "true" ]; then
  CALENDAR_RANGE_START="$(date -u -d '+1 day' '+%Y-%m-%dT09:00:00Z' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT09:00:00Z')"
  CALENDAR_RANGE_END="$(date -u -d '+2 day' '+%Y-%m-%dT18:00:00Z' 2>/dev/null || date -u -v+2d '+%Y-%m-%dT18:00:00Z')"
  EVENT_START="$(date -u -d '+1 day' '+%Y-%m-%dT10:00:00Z' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT10:00:00Z')"
  EVENT_END="$(date -u -d '+1 day' '+%Y-%m-%dT11:00:00Z' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT11:00:00Z')"
  DUPLICATE_START="$(date -u -d '+1 day' '+%Y-%m-%dT12:00:00Z' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT12:00:00Z')"
  DUPLICATE_END="$(date -u -d '+1 day' '+%Y-%m-%dT13:00:00Z' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT13:00:00Z')"

  run_get \
    "60_GET_CALENDAR_PREFERENCES" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/preferences/" \
    "200"

  begin_test "61_CREATE_CALENDAR"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/calendars/" \
    "$(jq -n --arg run_id "$RUN_ID" '{name:("E2E Calendar " + $run_id), description:"Calendar created by general_test.sh", color:"#6025D2", timezone:"America/Bogota"}')" \
    "application/json"
  record_response "61_CREATE_CALENDAR" "$HTTP_CODE" "$RESPONSE_FILE"
  CALENDAR_CREATE_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create calendar." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Calendar was created."
  fi

  CALENDAR_ID="$(extract_json_value "$CALENDAR_CREATE_RESULT" '.calendar.id')"
  cleanup_request_files

  if validate_uuid_value "61A_CALENDAR_ID" "$CALENDAR_ID"; then
    register_resource CALENDAR_IDS "$CALENDAR_ID"
  fi

  begin_test "62_CREATE_CALENDAR_TAG"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/tags/" \
    "$(jq -n --arg run_id "$RUN_ID" '{name:("E2E Calendar Tag " + $run_id), color:"#2563EB"}')" \
    "application/json"
  record_response "62_CREATE_CALENDAR_TAG" "$HTTP_CODE" "$RESPONSE_FILE"
  CALENDAR_TAG_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create calendar tag." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Calendar tag was created."
  fi

  CALENDAR_TAG_ID="$(extract_json_value "$CALENDAR_TAG_RESULT" '.tag.id')"
  cleanup_request_files

  if validate_uuid_value "62A_CALENDAR_TAG_ID" "$CALENDAR_TAG_ID"; then
    register_resource CALENDAR_TAG_IDS "$CALENDAR_TAG_ID"
  fi

  begin_test "63_CREATE_CALENDAR_EVENT_WITH_USER_B_ATTENDEE"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/events/" \
    "$(jq -n \
      --arg calendar_id "$CALENDAR_ID" \
      --arg tag_id "$CALENDAR_TAG_ID" \
      --arg attendee_id "$USER_B_ID" \
      --arg start "$EVENT_START" \
      --arg end "$EVENT_END" \
      --arg run_id "$RUN_ID" \
      '{
        calendar_id:$calendar_id,
        title:("E2E Calendar Event " + $run_id),
        description:"Calendar end-to-end event",
        event_kind:"virtual",
        color:"#6025D2",
        is_all_day:false,
        starts_at:$start,
        ends_at:$end,
        starts_on:null,
        ends_on:null,
        timezone:"America/Bogota",
        is_private:false,
        notifications_enabled:false,
        tag_ids:[$tag_id],
        attendee_ids:[$attendee_id],
        reminders:[],
        conferences:[{
          provider:"external",
          label:"E2E conference",
          join_url:"https://example.com/e2e-calendar",
          is_primary:true
        }]
      }')" \
    "application/json"
  record_response "63_CREATE_CALENDAR_EVENT_WITH_USER_B_ATTENDEE" "$HTTP_CODE" "$RESPONSE_FILE"
  CALENDAR_EVENT_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create calendar event." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Calendar event was created."
  fi

  CALENDAR_EVENT_ID="$(extract_json_value "$CALENDAR_EVENT_RESULT" '.event.id')"
  cleanup_request_files

  if validate_uuid_value "63A_CALENDAR_EVENT_ID" "$CALENDAR_EVENT_ID"; then
    register_resource CALENDAR_EVENT_IDS "$CALENDAR_EVENT_ID"
  fi

  run_get \
    "64_GET_CALENDAR_EVENT_DETAIL_OWNER" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/events/$CALENDAR_EVENT_ID/" \
    "200"

  run_get \
    "65_LIST_CALENDAR_EVENTS_OWNER" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/events/?range_start=$CALENDAR_RANGE_START&range_end=$CALENDAR_RANGE_END&limit=100" \
    "200"

  run_get \
    "66_CALENDAR_CONFLICTS_OWNER" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/conflicts/?is_all_day=false&starts_at=$EVENT_START&ends_at=$EVENT_END" \
    "200"

  run_json_request \
    "67_RSVP_ACCEPT_EVENT_AS_USER_B" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/calendar/events/$CALENDAR_EVENT_ID/rsvp/" \
    '{"response_status":"accepted"}' \
    "200"

  begin_test "68_DUPLICATE_CALENDAR_EVENT"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/events/$CALENDAR_EVENT_ID/duplicate/" \
    "$(jq -n --arg start "$DUPLICATE_START" --arg end "$DUPLICATE_END" '{starts_at:$start, ends_at:$end, include_attendees:false, include_reminders:false, include_recurrence:false}')" \
    "application/json"
  record_response "68_DUPLICATE_CALENDAR_EVENT" "$HTTP_CODE" "$RESPONSE_FILE"
  CALENDAR_DUPLICATE_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not duplicate calendar event." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Calendar event was duplicated."
  fi

  CALENDAR_DUPLICATE_EVENT_ID="$(extract_json_value "$CALENDAR_DUPLICATE_RESULT" '.event.id')"
  cleanup_request_files

  if validate_uuid_value "68A_CALENDAR_DUPLICATE_EVENT_ID" "$CALENDAR_DUPLICATE_EVENT_ID"; then
    register_resource CALENDAR_EVENT_IDS "$CALENDAR_DUPLICATE_EVENT_ID"
  fi

  run_json_request \
    "69_UPDATE_CALENDAR_EVENT" \
    "PATCH" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/events/$CALENDAR_EVENT_ID/" \
    "$(jq -n --arg run_id "$RUN_ID" '{title:("E2E Calendar Event Updated " + $run_id)}')" \
    "200"
else
  begin_test "60_CALENDAR_TESTS_DISABLED"
  mark_skip "RUN_CALENDAR_TESTS is not true."
fi


if [ "$RUN_COMMERCIAL_TESTS" = "true" ]; then
  begin_test "70_UPLOAD_COMMERCIAL_LOGO"
  request_multipart \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/storage/uploads/" \
    "file=@${LOGO_PNG_FILE};type=image/png"
  record_response "70_UPLOAD_COMMERCIAL_LOGO" "$HTTP_CODE" "$RESPONSE_FILE"
  LOGO_UPLOAD_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not upload commercial logo." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Commercial logo was uploaded."
  fi

  LOGO_FILE_ID="$(extract_json_value "$LOGO_UPLOAD_RESULT" '.files[0].id')"
  cleanup_request_files

  if validate_uuid_value "70A_LOGO_FILE_ID" "$LOGO_FILE_ID"; then
    register_remote_file "$LOGO_FILE_ID"
  fi

  run_get \
    "71_LIST_COMMERCIAL_ROOT_CATEGORIES" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/commercial/categories/?offer_type=services" \
    "200"

  begin_test "72_CREATE_COMMERCIAL_PROFILE_CUSTOM_ACTIVITY"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/commercial/profiles/" \
    "$(jq -n \
      --arg logo_file_id "$LOGO_FILE_ID" \
      --arg run_id "$RUN_ID" \
      '{
        offer_type:"services",
        category_id:null,
        custom_activity_text:"E2E testing services",
        display_name:("E2E Commercial Profile " + $run_id),
        description:"Commercial profile generated by end-to-end test.",
        country_code:"CO",
        city:"Bogota",
        address:null,
        neighborhood:null,
        location_reference:null,
        is_address_public:false,
        phone_dial_code:null,
        phone_number:null,
        is_phone_public:false,
        public_email:null,
        is_email_public:false,
        logo_file_id:$logo_file_id,
        is_public:false,
        is_available:true,
        modalities:["virtual"],
        hours:[]
      }')" \
    "application/json"
  record_response "72_CREATE_COMMERCIAL_PROFILE_CUSTOM_ACTIVITY" "$HTTP_CODE" "$RESPONSE_FILE"
  COMMERCIAL_PROFILE_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create commercial profile." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Commercial profile was created."
  fi

  COMMERCIAL_PROFILE_ID="$(extract_json_value "$COMMERCIAL_PROFILE_RESULT" '.profile.id')"
  cleanup_request_files

  if validate_uuid_value "72A_COMMERCIAL_PROFILE_ID" "$COMMERCIAL_PROFILE_ID"; then
    register_resource COMMERCIAL_PROFILE_IDS "$COMMERCIAL_PROFILE_ID"
  fi

  run_get \
    "73_GET_COMMERCIAL_PROFILE" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/commercial/profiles/$COMMERCIAL_PROFILE_ID/" \
    "200"
else
  begin_test "70_COMMERCIAL_TESTS_DISABLED"
  mark_skip "RUN_COMMERCIAL_TESTS is not true."
fi


if [ "$RUN_INTEGRATIONS_TESTS" = "true" ]; then
  run_get \
    "80_GET_INTEGRATION_CATALOG" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/integrations/catalog/" \
    "200"

  run_get \
    "81_LIST_INTEGRATION_CONNECTIONS" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/integrations/connections/" \
    "200"

  run_get \
    "82_LIST_CALENDAR_INTEGRATIONS" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/calendar/integrations/" \
    "200"

  run_get \
    "83_LIST_MAIL_INTEGRATIONS" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/mail/integrations/?include_inactive=true" \
    "200"
else
  begin_test "80_INTEGRATIONS_TESTS_DISABLED"
  mark_skip "RUN_INTEGRATIONS_TESTS is not true."
fi


if [ "$RUN_MAIL_TESTS" = "true" ]; then
  begin_test "90_MAIL_TESTS_REQUIRE_ACTIVE_INTEGRATION"
  mark_skip "Mail draft/send tests are intentionally disabled by default because they require an active OAuth integration and may create provider-side drafts or send mail."
else
  begin_test "90_MAIL_TESTS_DISABLED"
  mark_skip "Set RUN_MAIL_TESTS=true only in a dedicated test mailbox environment."
fi


if [ "$RUN_CHAT_TESTS" = "true" ]; then
  begin_test "100_BOOTSTRAP_CHAT_USER_A"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/bootstrap/" \
    '{}' \
    "application/json"
  record_response "100_BOOTSTRAP_CHAT_USER_A" "$HTTP_CODE" "$RESPONSE_FILE"
  BOOTSTRAP_A="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
    mark_failure "Chat bootstrap User A failed." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
    cleanup_request_files
    exit 1
  else
    mark_pass "Chat bootstrap User A succeeded."
  fi

  USER_A_IDENTITY_ID="$(extract_profile_identity_id "$BOOTSTRAP_A")"
  cleanup_request_files

  if ! validate_uuid_value "100A_USER_A_PROFILE_IDENTITY" "$USER_A_IDENTITY_ID"; then
    exit 1
  fi

  begin_test "101_BOOTSTRAP_CHAT_USER_B"
  request \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/bootstrap/" \
    '{}' \
    "application/json"
  record_response "101_BOOTSTRAP_CHAT_USER_B" "$HTTP_CODE" "$RESPONSE_FILE"
  BOOTSTRAP_B="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
    mark_failure "Chat bootstrap User B failed." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
    cleanup_request_files
    exit 1
  else
    mark_pass "Chat bootstrap User B succeeded."
  fi

  USER_B_IDENTITY_ID="$(extract_profile_identity_id "$BOOTSTRAP_B")"
  cleanup_request_files

  if ! validate_uuid_value "101A_USER_B_PROFILE_IDENTITY" "$USER_B_IDENTITY_ID"; then
    exit 1
  fi

  begin_test "102_BOOTSTRAP_CHAT_USER_C"
  request     "POST"     "$ACCESS_TOKEN_C"     "$API_BASE_URL/api/chat/bootstrap/"     '{}'     "application/json"
  record_response     "102_BOOTSTRAP_CHAT_USER_C"     "$HTTP_CODE"     "$RESPONSE_FILE"
  BOOTSTRAP_C="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
    mark_failure       "Chat bootstrap User C failed."       "$HTTP_CODE"       "$RESPONSE_FILE"       "$CURL_ERROR_FILE"
    cleanup_request_files
    exit 1
  else
    mark_pass "Chat bootstrap User C succeeded."
  fi

  USER_C_IDENTITY_ID="$(extract_profile_identity_id "$BOOTSTRAP_C")"
  cleanup_request_files

  if ! validate_uuid_value     "102A_USER_C_PROFILE_IDENTITY"     "$USER_C_IDENTITY_ID"; then
    exit 1
  fi

  begin_test "103_BOOTSTRAP_CHAT_USER_D"
  request     "POST"     "$ACCESS_TOKEN_D"     "$API_BASE_URL/api/chat/bootstrap/"     '{}'     "application/json"
  record_response     "103_BOOTSTRAP_CHAT_USER_D"     "$HTTP_CODE"     "$RESPONSE_FILE"
  BOOTSTRAP_D="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
    mark_failure       "Chat bootstrap User D failed."       "$HTTP_CODE"       "$RESPONSE_FILE"       "$CURL_ERROR_FILE"
    cleanup_request_files
    exit 1
  else
    mark_pass "Chat bootstrap User D succeeded."
  fi

  USER_D_IDENTITY_ID="$(extract_profile_identity_id "$BOOTSTRAP_D")"
  cleanup_request_files

  if ! validate_uuid_value     "103A_USER_D_PROFILE_IDENTITY"     "$USER_D_IDENTITY_ID"; then
    exit 1
  fi

  begin_test "102_CREATE_OR_GET_DIRECT_CONVERSATION"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/direct-conversations/" \
    "$(jq -n --arg sender "$USER_A_IDENTITY_ID" --arg recipient "$USER_B_IDENTITY_ID" '{sender_identity_id:$sender, recipient_identity_id:$recipient}')" \
    "application/json"
  record_response "102_CREATE_OR_GET_DIRECT_CONVERSATION" "$HTTP_CODE" "$RESPONSE_FILE"
  DIRECT_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] \
    || { [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; }; then
    mark_failure "Could not create/get direct conversation." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Direct conversation is available."
  fi

  DIRECT_CONVERSATION_ID="$(extract_json_value "$DIRECT_RESULT" '.conversation.id')"
  cleanup_request_files

  if ! validate_uuid_value "102A_DIRECT_CONVERSATION_ID" "$DIRECT_CONVERSATION_ID"; then
    exit 1
  fi

  begin_test "103_SEND_DIRECT_MESSAGE_A_TO_B"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/messages/" \
    "$(jq -n --arg sender "$USER_A_IDENTITY_ID" --arg run_id "$RUN_ID" '{sender_identity_id:$sender, message_type:"text", body:("Direct message A to B " + $run_id), metadata:{source:"general_test",run_id:$run_id}}')" \
    "application/json"
  record_response "103_SEND_DIRECT_MESSAGE_A_TO_B" "$HTTP_CODE" "$RESPONSE_FILE"
  DIRECT_MESSAGE_A_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not send direct message A to B." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Direct message A to B was created."
  fi

  DIRECT_MESSAGE_A_ID="$(extract_json_value "$DIRECT_MESSAGE_A_RESULT" '.message.id')"
  cleanup_request_files

  if ! validate_uuid_value "103A_DIRECT_MESSAGE_A_ID" "$DIRECT_MESSAGE_A_ID"; then
    exit 1
  fi

  run_json_request \
    "104_MARK_DIRECT_CONVERSATION_READ_USER_B" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/read/" \
    "$(jq -n --arg identity "$USER_B_IDENTITY_ID" --arg message "$DIRECT_MESSAGE_A_ID" '{identity_id:$identity,last_read_message_id:$message}')" \
    "200"

  run_get \
    "105_GET_DIRECT_MESSAGE_READ_STATUS_USER_A" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/read-status/" \
    "200"

  begin_test "106_SEND_DIRECT_MESSAGE_B_TO_A"
  request \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/messages/" \
    "$(jq -n --arg sender "$USER_B_IDENTITY_ID" --arg run_id "$RUN_ID" '{sender_identity_id:$sender, message_type:"text", body:("Direct message B to A " + $run_id), metadata:{source:"general_test",run_id:$run_id}}')" \
    "application/json"
  record_response "106_SEND_DIRECT_MESSAGE_B_TO_A" "$HTTP_CODE" "$RESPONSE_FILE"
  DIRECT_MESSAGE_B_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not send direct message B to A." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Direct message B to A was created."
  fi

  DIRECT_MESSAGE_B_ID="$(extract_json_value "$DIRECT_MESSAGE_B_RESULT" '.message.id')"
  cleanup_request_files

  if ! validate_uuid_value "106A_DIRECT_MESSAGE_B_ID" "$DIRECT_MESSAGE_B_ID"; then
    exit 1
  fi

  run_json_request \
    "107_CREATE_REACTION_B_ON_A_MESSAGE" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/reactions/" \
    "$(jq -n --arg identity "$USER_B_IDENTITY_ID" '{identity_id:$identity,emoji:"👍"}')" \
    "201"

  run_get \
    "108_LIST_REACTIONS_USER_A" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/reactions/" \
    "200"

  begin_test "109_DELETE_REACTION_B"
  request \
    "DELETE" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/reactions/%F0%9F%91%8D/?identity_id=$USER_B_IDENTITY_ID"
  record_response "109_DELETE_REACTION_B" "$HTTP_CODE" "$RESPONSE_FILE"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "204" ]; then
    mark_failure "Could not delete chat reaction." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Chat reaction was deleted."
  fi
  cleanup_request_files

  begin_test "110_CREATE_NORMAL_GROUP"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/groups/" \
    "$(jq -n --arg creator "$USER_A_IDENTITY_ID" --arg run_id "$RUN_ID" '{creator_identity_id:$creator,name:("E2E All Members Group " + $run_id),posting_policy:"all_members",description:"E2E chat group"}')" \
    "application/json"
  record_response "110_CREATE_NORMAL_GROUP" "$HTTP_CODE" "$RESPONSE_FILE"
  NORMAL_GROUP_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create normal group." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Normal group was created."
  fi

  NORMAL_GROUP_ID="$(extract_json_value "$NORMAL_GROUP_RESULT" '.conversation.id')"
  cleanup_request_files

  if validate_uuid_value "110A_NORMAL_GROUP_ID" "$NORMAL_GROUP_ID"; then
    register_resource CHAT_GROUP_IDS "$NORMAL_GROUP_ID"
  fi

  begin_test "111_INVITE_USER_B_TO_NORMAL_GROUP"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/groups/$NORMAL_GROUP_ID/invites/" \
    "$(jq -n --arg actor "$USER_A_IDENTITY_ID" --arg invited "$USER_B_IDENTITY_ID" '{actor_identity_id:$actor,invited_identity_id:$invited,expires_at:null}')" \
    "application/json"
  record_response "111_INVITE_USER_B_TO_NORMAL_GROUP" "$HTTP_CODE" "$RESPONSE_FILE"
  NORMAL_INVITE_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not invite User B to normal group." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "User B was invited to normal group."
  fi

  NORMAL_GROUP_INVITE_ID="$(extract_json_value "$NORMAL_INVITE_RESULT" '.invite.id')"
  cleanup_request_files

  if ! validate_uuid_value "111A_NORMAL_GROUP_INVITE_ID" "$NORMAL_GROUP_INVITE_ID"; then
    exit 1
  fi

  run_json_request \
    "112_ACCEPT_NORMAL_GROUP_INVITE_USER_B" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/group-invites/$NORMAL_GROUP_INVITE_ID/response/" \
    '{"accept":true}' \
    "200"

  run_json_request \
    "113_MEMBER_SENDS_IN_NORMAL_GROUP" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/conversations/$NORMAL_GROUP_ID/messages/" \
    "$(jq -n --arg sender "$USER_B_IDENTITY_ID" --arg run_id "$RUN_ID" '{sender_identity_id:$sender,message_type:"text",body:("Member message " + $run_id),metadata:{source:"general_test"}}')" \
    "201"

  begin_test "114_CREATE_BROADCAST_GROUP"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/groups/" \
    "$(jq -n --arg creator "$USER_A_IDENTITY_ID" --arg run_id "$RUN_ID" '{creator_identity_id:$creator,name:("E2E Broadcast Group " + $run_id),posting_policy:"admins_only",description:"E2E broadcast group"}')" \
    "application/json"
  record_response "114_CREATE_BROADCAST_GROUP" "$HTTP_CODE" "$RESPONSE_FILE"
  BROADCAST_GROUP_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not create broadcast group." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Broadcast group was created."
  fi

  BROADCAST_GROUP_ID="$(extract_json_value "$BROADCAST_GROUP_RESULT" '.conversation.id')"
  cleanup_request_files

  if validate_uuid_value "114A_BROADCAST_GROUP_ID" "$BROADCAST_GROUP_ID"; then
    register_resource CHAT_GROUP_IDS "$BROADCAST_GROUP_ID"
  fi

  begin_test "115_INVITE_USER_B_TO_BROADCAST_GROUP"
  request \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/groups/$BROADCAST_GROUP_ID/invites/" \
    "$(jq -n --arg actor "$USER_A_IDENTITY_ID" --arg invited "$USER_B_IDENTITY_ID" '{actor_identity_id:$actor,invited_identity_id:$invited,expires_at:null}')" \
    "application/json"
  record_response "115_INVITE_USER_B_TO_BROADCAST_GROUP" "$HTTP_CODE" "$RESPONSE_FILE"
  BROADCAST_INVITE_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Could not invite User B to broadcast group." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "User B was invited to broadcast group."
  fi

  BROADCAST_GROUP_INVITE_ID="$(extract_json_value "$BROADCAST_INVITE_RESULT" '.invite.id')"
  cleanup_request_files

  if ! validate_uuid_value "115A_BROADCAST_GROUP_INVITE_ID" "$BROADCAST_GROUP_INVITE_ID"; then
    exit 1
  fi

  run_json_request \
    "116_ACCEPT_BROADCAST_GROUP_INVITE_USER_B" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/group-invites/$BROADCAST_GROUP_INVITE_ID/response/" \
    '{"accept":true}' \
    "200"

  BROADCAST_MEMBER_PAYLOAD="$(
    jq -n --arg sender "$USER_B_IDENTITY_ID" --arg run_id "$RUN_ID" \
      '{sender_identity_id:$sender,message_type:"text",body:("Blocked member message " + $run_id),metadata:{source:"general_test"}}'
  )"

  run_expected_failure \
    "117_MEMBER_CANNOT_SEND_IN_BROADCAST_GROUP" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/conversations/$BROADCAST_GROUP_ID/messages/" \
    "$BROADCAST_MEMBER_PAYLOAD" \
    "400 403"

  run_json_request \
    "118_OWNER_PROMOTES_B_TO_ADMIN" \
    "PATCH" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/groups/$BROADCAST_GROUP_ID/participants/$USER_B_IDENTITY_ID/role/" \
    "$(jq -n --arg actor "$USER_A_IDENTITY_ID" '{actor_identity_id:$actor,role:"admin"}')" \
    "200"

  run_json_request \
    "119_ADMIN_SENDS_IN_BROADCAST_GROUP" \
    "POST" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/conversations/$BROADCAST_GROUP_ID/messages/" \
    "$(jq -n --arg sender "$USER_B_IDENTITY_ID" --arg run_id "$RUN_ID" '{sender_identity_id:$sender,message_type:"text",body:("Admin broadcast message " + $run_id),metadata:{source:"general_test"}}')" \
    "201"

  begin_test "120_UPLOAD_CHAT_ATTACHMENT_A_TO_B"
  request_multipart \
    "POST" \
    "$ACCESS_TOKEN_A" \
    "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/attachments/" \
    "sender_identity_id=$USER_A_IDENTITY_ID" \
    "message_type=document" \
    "body=Temporary E2E chat attachment $RUN_ID" \
    "metadata={\"source\":\"general_test\",\"run_id\":\"$RUN_ID\"}" \
    "file=@${CHAT_TEXT_FILE};type=text/plain"
  record_response "120_UPLOAD_CHAT_ATTACHMENT_A_TO_B" "$HTTP_CODE" "$RESPONSE_FILE"
  CHAT_ATTACHMENT_RESULT="$(cat "$RESPONSE_FILE")"

  if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
    mark_failure "Chat attachment upload failed." "$HTTP_CODE" "$RESPONSE_FILE" "$CURL_ERROR_FILE"
  else
    mark_pass "Chat attachment was uploaded and message created."
  fi

  CHAT_ATTACHMENT_MESSAGE_ID="$(extract_json_value "$CHAT_ATTACHMENT_RESULT" '.message.id')"
  CHAT_ATTACHMENT_FILE_ID="$(extract_json_value "$CHAT_ATTACHMENT_RESULT" '.file.id // .message.attachment_file_id')"
  cleanup_request_files

  if validate_uuid_value "120A_CHAT_ATTACHMENT_MESSAGE_ID" "$CHAT_ATTACHMENT_MESSAGE_ID"; then
    :
  fi

  if validate_uuid_value "120B_CHAT_ATTACHMENT_FILE_ID" "$CHAT_ATTACHMENT_FILE_ID"; then
    register_remote_file "$CHAT_ATTACHMENT_FILE_ID"
  fi

  run_get \
    "121_GET_CHAT_ATTACHMENT_METADATA_AS_USER_B" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/messages/$CHAT_ATTACHMENT_MESSAGE_ID/attachment/?identity_id=$USER_B_IDENTITY_ID" \
    "200"

  run_get \
    "122_GET_CHAT_ATTACHMENT_ACCESS_URL_AS_USER_B" \
    "$ACCESS_TOKEN_B" \
    "$API_BASE_URL/api/chat/messages/$CHAT_ATTACHMENT_MESSAGE_ID/attachment/access/?identity_id=$USER_B_IDENTITY_ID&download=true" \
    "200"
else
  begin_test "100_CHAT_TESTS_DISABLED"
  mark_skip "RUN_CHAT_TESTS is not true."
fi


record_section "PUSH_WORKER_MANUAL_CHECK"

{
  printf '%s\n' \
    'Optional manual validation after this suite:'
  printf '%s\n' \
    'python manage.py process_chat_push_notifications --limit 50'
  printf '%s\n' \
    'The suite does not execute the push worker because it can send real Expo notifications.'
} >> "$REPORT_FILE"

record_section "FINAL_SUMMARY"

{
  printf 'RUN_ID=%s\n' "$RUN_ID"
  printf 'TESTS_TOTAL=%s\n' "$TESTS_TOTAL"
  printf 'TESTS_PASSED=%s\n' "$TESTS_PASSED"
  printf 'TESTS_FAILED=%s\n' "$TESTS_FAILED"
  printf 'TESTS_SKIPPED=%s\n' "$TESTS_SKIPPED"
  printf 'EXPECTED_FAILURES_OK=%s\n' "$EXPECTED_FAILURES_OK"
  printf 'USER_A_ID=%s\n' "$USER_A_ID"
  printf 'USER_B_ID=%s\n' "$USER_B_ID"
  printf 'USER_C_ID=%s\n' "$USER_C_ID"
  printf 'USER_D_ID=%s\n' "$USER_D_ID"
  printf 'USER_A_IDENTITY_ID=%s\n' "$USER_A_IDENTITY_ID"
  printf 'USER_B_IDENTITY_ID=%s\n' "$USER_B_IDENTITY_ID"
  printf 'USER_C_IDENTITY_ID=%s\n' "$USER_C_IDENTITY_ID"
  printf 'USER_D_IDENTITY_ID=%s\n' "$USER_D_IDENTITY_ID"
  printf 'REPORT_FILE=%s\n' "$REPORT_FILE"
  printf 'FAILURES_FILE=%s\n' "$FAILURES_FILE"
} >> "$REPORT_FILE"

printf '\n============================================================\n'
printf 'FINAL SUMMARY — BeeApp General Backend E2E Test\n'
printf '============================================================\n'
printf 'Total tests:              %s\n' "$TESTS_TOTAL"
printf 'Passed tests:             %s\n' "$TESTS_PASSED"
printf 'Failed tests:             %s\n' "$TESTS_FAILED"
printf 'Skipped tests:            %s\n' "$TESTS_SKIPPED"
printf 'Expected failures passed: %s\n' "$EXPECTED_FAILURES_OK"
printf '\nFull report:\n  %s\n' "$REPORT_FILE"
printf 'Failures report:\n  %s\n' "$FAILURES_FILE"
printf '============================================================\n'

if [ "$TESTS_FAILED" -eq 0 ]; then
  printf '✅ ALL ENABLED GENERAL BACKEND E2E TESTS PASSED.\n'
else
  printf '❌ SOME GENERAL BACKEND E2E TESTS FAILED.\n'
  printf 'Open the failures report for exact details and likely causes.\n'
fi

exit "$TESTS_FAILED"