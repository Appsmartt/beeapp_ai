#!/usr/bin/env bash

set -u
set -o pipefail

API_BASE_URL="${BEEAPP_API_BASE_URL:-http://127.0.0.1:8000}"
MICROSOFT_INTEGRATION_ID="${MAIL_INTEGRATION_ID:-85262509-942c-40b4-b02d-c1cd431d3466}"
TEST_RECIPIENT_EMAIL="${TEST_RECIPIENT_EMAIL:-andres.santa-fe@hotmail.com}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_DIR="${BEEAPP_TEST_OUTPUT_DIR:-$PWD/beeapp_mail_test_results}"
REPORT_FILE="$OUTPUT_DIR/mail_backend_report_${RUN_ID}.txt"
TEST_FILE_PATH="$OUTPUT_DIR/beeapp_attachment_${RUN_ID}.txt"

ACCESS_TOKEN=""
STORAGE_FILE_ID=""
DRAFT_WITH_ATTACHMENT_ID=""
DRAFT_WITHOUT_ATTACHMENT_ID=""
TESTS_FAILED=0

mkdir -p "$OUTPUT_DIR"
: > "$REPORT_FILE"

cleanup() {
  rm -f "$TEST_FILE_PATH"
  unset BEEAPP_PASSWORD ACCESS_TOKEN LOGIN_RESPONSE UPLOAD_RESPONSE
}
trap cleanup EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: falta el comando requerido: $1" | tee -a "$REPORT_FILE"
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
          .provider_web_link,
          .providerweblink,
          .web_link,
          .weblink
        )
      else . end
    )
  ' 2>/dev/null || cat
}

record_section() {
  printf '\n============================================================\n' | tee -a "$REPORT_FILE"
  printf '%s\n' "$1" | tee -a "$REPORT_FILE"
  printf '============================================================\n' | tee -a "$REPORT_FILE"
}

record_response() {
  local label="$1"
  local http_code="$2"
  local body_file="$3"

  record_section "$label"
  printf 'HTTP_STATUS=%s\n' "$http_code" | tee -a "$REPORT_FILE"
  if [ -s "$body_file" ]; then
    sanitize_json < "$body_file" | tee -a "$REPORT_FILE"
  else
    printf '(Respuesta vacía)\n' | tee -a "$REPORT_FILE"
  fi
}

request() {
  local method="$1"
  local url="$2"
  local body="$3"
  local content_type="$4"
  shift 4

  local body_file
  local curl_error_file
  body_file="$(mktemp)"
  curl_error_file="$(mktemp)"

  local -a curl_args=(
    --silent
    --show-error
    --max-time 45
    --request "$method"
    --header "Authorization: Bearer $ACCESS_TOKEN"
    --header "Accept: application/json"
    --output "$body_file"
    --write-out "%{http_code}"
  )

  if [ -n "$content_type" ]; then
    curl_args+=(--header "Content-Type: $content_type")
  fi

  if [ -n "$body" ]; then
    curl_args+=(--data "$body")
  fi

  curl_args+=("$@" "$url")

  HTTP_CODE="$(curl "${curl_args[@]}" 2>"$curl_error_file")"
  CURL_EXIT_CODE=$?
  RESPONSE_FILE="$body_file"
  CURL_ERROR_FILE="$curl_error_file"
}

login() {
  local email password login_body login_file login_err login_code

  read -r -p "Correo BeeApp: " email
  read -r -s -p "Contraseña BeeApp: " password
  printf '\n'

  login_body="$(jq -n --arg email "$email" --arg password "$password" '{email: $email, password: $password}')"
  login_file="$(mktemp)"
  login_err="$(mktemp)"

  login_code="$(
    curl --silent --show-error \
      --max-time 30 \
      --request POST \
      --header "Content-Type: application/json" \
      --header "Accept: application/json" \
      --data "$login_body" \
      --output "$login_file" \
      --write-out "%{http_code}" \
      "$API_BASE_URL/api/accounts/login/" \
      2>"$login_err"
  )"
  local login_exit=$?

  record_section "01_LOGIN"
  printf 'HTTP_STATUS=%s\n' "$login_code" | tee -a "$REPORT_FILE"
  if [ -s "$login_file" ]; then
    sanitize_json < "$login_file" | tee -a "$REPORT_FILE"
  fi
  if [ "$login_exit" -ne 0 ]; then
    printf 'CURL_ERROR: %s\n' "$(cat "$login_err")" | tee -a "$REPORT_FILE"
  fi

  ACCESS_TOKEN="$(jq -r '.session.access_token // empty' "$login_file" 2>/dev/null || true)"
  rm -f "$login_file" "$login_err"

  if [ -z "$ACCESS_TOKEN" ]; then
    echo "ERROR: no se obtuvo session.access_token. Revisa $REPORT_FILE" | tee -a "$REPORT_FILE"
    exit 1
  fi

  echo "OK: sesión iniciada." | tee -a "$REPORT_FILE"
}

run_get() {
  local label="$1"
  local url="$2"

  request "GET" "$url" "" ""
  record_response "$label" "$HTTP_CODE" "$RESPONSE_FILE"
  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    printf 'CURL_ERROR: %s\n' "$(cat "$CURL_ERROR_FILE")" | tee -a "$REPORT_FILE"
    TESTS_FAILED=1
  fi
  rm -f "$RESPONSE_FILE" "$CURL_ERROR_FILE"
}

run_json_request() {
  local label="$1"
  local method="$2"
  local url="$3"
  local body="$4"

  request "$method" "$url" "$body" "application/json"
  record_response "$label" "$HTTP_CODE" "$RESPONSE_FILE"
  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    printf 'CURL_ERROR: %s\n' "$(cat "$CURL_ERROR_FILE")" | tee -a "$REPORT_FILE"
    TESTS_FAILED=1
  fi
  rm -f "$RESPONSE_FILE" "$CURL_ERROR_FILE"
}

require_command curl
require_command jq

record_section "BEEAPP_MAIL_BACKEND_SMOKE_TEST"
printf 'RUN_ID=%s\n' "$RUN_ID" | tee -a "$REPORT_FILE"
printf 'API_BASE_URL=%s\n' "$API_BASE_URL" | tee -a "$REPORT_FILE"
printf 'MICROSOFT_INTEGRATION_ID=%s\n' "$MICROSOFT_INTEGRATION_ID" | tee -a "$REPORT_FILE"
printf 'TEST_RECIPIENT_EMAIL=%s\n' "$TEST_RECIPIENT_EMAIL" | tee -a "$REPORT_FILE"
printf 'NOTE=Los tokens y enlaces de proveedores se eliminan del reporte.\n' | tee -a "$REPORT_FILE"

login

run_get \
  "02_MAIL_INTEGRATIONS" \
  "$API_BASE_URL/api/mail/integrations/"

run_get \
  "03_STORAGE_FILES_BEFORE_UPLOAD" \
  "$API_BASE_URL/api/storage/files/?limit=20"

printf '%s\n' \
  'Archivo temporal para una prueba automatizada de BeeApp Mail.' \
  "Run ID: $RUN_ID" \
  'Este archivo se usa solo para validar adjuntos en borradores.' \
  > "$TEST_FILE_PATH"

UPLOAD_BODY_FILE="$(mktemp)"
UPLOAD_ERROR_FILE="$(mktemp)"
UPLOAD_HTTP_CODE="$(
  curl --silent --show-error \
    --max-time 60 \
    --request POST \
    --header "Authorization: Bearer $ACCESS_TOKEN" \
    --header "Accept: application/json" \
    --form "file=@${TEST_FILE_PATH};type=text/plain" \
    --output "$UPLOAD_BODY_FILE" \
    --write-out "%{http_code}" \
    "$API_BASE_URL/api/storage/uploads/" \
    2>"$UPLOAD_ERROR_FILE"
)"
UPLOAD_EXIT_CODE=$?
record_response "04_STORAGE_UPLOAD_TEST_FILE" "$UPLOAD_HTTP_CODE" "$UPLOAD_BODY_FILE"
if [ "$UPLOAD_EXIT_CODE" -ne 0 ]; then
  printf 'CURL_ERROR: %s\n' "$(cat "$UPLOAD_ERROR_FILE")" | tee -a "$REPORT_FILE"
  TESTS_FAILED=1
fi
STORAGE_FILE_ID="$(jq -r '.files[0].id // .file.id // .id // empty' "$UPLOAD_BODY_FILE" 2>/dev/null || true)"
rm -f "$UPLOAD_BODY_FILE" "$UPLOAD_ERROR_FILE"

printf 'STORAGE_FILE_ID=%s\n' "${STORAGE_FILE_ID:-NOT_EXTRACTED}" | tee -a "$REPORT_FILE"

run_get \
  "05_STORAGE_FILES_AFTER_UPLOAD" \
  "$API_BASE_URL/api/storage/files/?limit=20"

run_get \
  "06_MAIL_MESSAGES_ALL" \
  "$API_BASE_URL/api/mail/messages/?integration_id=$MICROSOFT_INTEGRATION_ID&limit=20"

run_get \
  "07_MAIL_MESSAGES_DRAFTS" \
  "$API_BASE_URL/api/mail/messages/?integration_id=$MICROSOFT_INTEGRATION_ID&folder=drafts&limit=20"

run_get \
  "08_MAIL_MESSAGES_INBOX" \
  "$API_BASE_URL/api/mail/messages/?integration_id=$MICROSOFT_INTEGRATION_ID&folder=inbox&limit=20"

if [ -n "$STORAGE_FILE_ID" ]; then
  DRAFT_WITH_ATTACHMENT_PAYLOAD="$(
    jq -n \
      --arg integration_id "$MICROSOFT_INTEGRATION_ID" \
      --arg recipient "$TEST_RECIPIENT_EMAIL" \
      --arg file_id "$STORAGE_FILE_ID" \
      --arg run_id "$RUN_ID" \
      '{
        integration_id: $integration_id,
        to: [{email: $recipient}],
        subject: ("BeeApp smoke test con adjunto " + $run_id),
        body: "Borrador automatizado de prueba. No enviar.",
        body_content_type: "text",
        file_ids: [$file_id]
      }'
  )"

  request \
    "POST" \
    "$API_BASE_URL/api/mail/drafts/" \
    "$DRAFT_WITH_ATTACHMENT_PAYLOAD" \
    "application/json"
  record_response "09_CREATE_DRAFT_WITH_ATTACHMENT" "$HTTP_CODE" "$RESPONSE_FILE"
  DRAFT_WITH_ATTACHMENT_ID="$(jq -r '.message.id // .id // empty' "$RESPONSE_FILE" 2>/dev/null || true)"
  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    printf 'CURL_ERROR: %s\n' "$(cat "$CURL_ERROR_FILE")" | tee -a "$REPORT_FILE"
    TESTS_FAILED=1
  fi
  rm -f "$RESPONSE_FILE" "$CURL_ERROR_FILE"

  printf 'DRAFT_WITH_ATTACHMENT_ID=%s\n' "${DRAFT_WITH_ATTACHMENT_ID:-NOT_EXTRACTED}" | tee -a "$REPORT_FILE"

  if [ -n "$DRAFT_WITH_ATTACHMENT_ID" ]; then
    run_get \
      "10_GET_DRAFT_WITH_ATTACHMENT" \
      "$API_BASE_URL/api/mail/messages/$DRAFT_WITH_ATTACHMENT_ID/"

    EDIT_DRAFT_PAYLOAD="$(
      jq -n \
        --arg recipient "$TEST_RECIPIENT_EMAIL" \
        --arg file_id "$STORAGE_FILE_ID" \
        --arg run_id "$RUN_ID" \
        '{
          to: [{email: $recipient}],
          subject: ("BeeApp smoke test editado " + $run_id),
          body: "Borrador editado por el smoke test. No enviar.",
          body_content_type: "text",
          file_ids: [$file_id]
        }'
    )"

    run_json_request \
      "11_EDIT_DRAFT_WITH_ATTACHMENT" \
      "PATCH" \
      "$API_BASE_URL/api/mail/messages/$DRAFT_WITH_ATTACHMENT_ID/draft/" \
      "$EDIT_DRAFT_PAYLOAD"

    run_get \
      "12_GET_EDITED_DRAFT" \
      "$API_BASE_URL/api/mail/messages/$DRAFT_WITH_ATTACHMENT_ID/"
  fi
else
  record_section "09_CREATE_DRAFT_WITH_ATTACHMENT"
  printf 'SKIPPED: no se pudo extraer STORAGE_FILE_ID.\n' | tee -a "$REPORT_FILE"
  TESTS_FAILED=1
fi

DRAFT_WITHOUT_ATTACHMENT_PAYLOAD="$(
  jq -n \
    --arg integration_id "$MICROSOFT_INTEGRATION_ID" \
    --arg recipient "$TEST_RECIPIENT_EMAIL" \
    --arg run_id "$RUN_ID" \
    '{
      integration_id: $integration_id,
      to: [{email: $recipient}],
      subject: ("BeeApp smoke test sin adjunto " + $run_id),
      body: "Borrador automatizado sin archivos. No enviar.",
      body_content_type: "text",
      file_ids: []
    }'
)"

request \
  "POST" \
  "$API_BASE_URL/api/mail/drafts/" \
  "$DRAFT_WITHOUT_ATTACHMENT_PAYLOAD" \
  "application/json"
record_response "13_CREATE_DRAFT_WITHOUT_ATTACHMENT" "$HTTP_CODE" "$RESPONSE_FILE"
DRAFT_WITHOUT_ATTACHMENT_ID="$(jq -r '.message.id // .id // empty' "$RESPONSE_FILE" 2>/dev/null || true)"
if [ "$CURL_EXIT_CODE" -ne 0 ]; then
  printf 'CURL_ERROR: %s\n' "$(cat "$CURL_ERROR_FILE")" | tee -a "$REPORT_FILE"
  TESTS_FAILED=1
fi
rm -f "$RESPONSE_FILE" "$CURL_ERROR_FILE"
printf 'DRAFT_WITHOUT_ATTACHMENT_ID=%s\n' "${DRAFT_WITHOUT_ATTACHMENT_ID:-NOT_EXTRACTED}" | tee -a "$REPORT_FILE"

if [ -n "$DRAFT_WITHOUT_ATTACHMENT_ID" ]; then
  run_get \
    "14_GET_DRAFT_WITHOUT_ATTACHMENT" \
    "$API_BASE_URL/api/mail/messages/$DRAFT_WITHOUT_ATTACHMENT_ID/"
fi

SYNC_PAYLOAD="$(
  jq -n \
    --arg integration_id "$MICROSOFT_INTEGRATION_ID" \
    '{integration_ids: [$integration_id], force_full_sync: false}'
)"

SYNC_BODY_FILE="$(mktemp)"
SYNC_ERROR_FILE="$(mktemp)"
SYNC_HTTP_CODE="$(
  curl --silent --show-error \
    --max-time 45 \
    --request POST \
    --header "Authorization: Bearer $ACCESS_TOKEN" \
    --header "Content-Type: application/json" \
    --header "Accept: application/json" \
    --data "$SYNC_PAYLOAD" \
    --output "$SYNC_BODY_FILE" \
    --write-out "%{http_code}" \
    "$API_BASE_URL/api/mail/sync/" \
    2>"$SYNC_ERROR_FILE"
)"
SYNC_EXIT_CODE=$?
record_response "15_MAIL_SYNC_DIAGNOSTIC_MAX_20_SECONDS" "$SYNC_HTTP_CODE" "$SYNC_BODY_FILE"
printf 'CURL_EXIT_CODE=%s\n' "$SYNC_EXIT_CODE" | tee -a "$REPORT_FILE"
if [ -s "$SYNC_ERROR_FILE" ]; then
  printf 'CURL_ERROR: %s\n' "$(cat "$SYNC_ERROR_FILE")" | tee -a "$REPORT_FILE"
fi
if [ "$SYNC_EXIT_CODE" -ne 0 ]; then
  TESTS_FAILED=1
fi
rm -f "$SYNC_BODY_FILE" "$SYNC_ERROR_FILE"

if [ -n "$DRAFT_WITH_ATTACHMENT_ID" ]; then
  request \
    "DELETE" \
    "$API_BASE_URL/api/mail/messages/$DRAFT_WITH_ATTACHMENT_ID/draft/" \
    "" \
    ""
  record_response "16_DELETE_DRAFT_WITH_ATTACHMENT" "$HTTP_CODE" "$RESPONSE_FILE"
  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    printf 'CURL_ERROR: %s\n' "$(cat "$CURL_ERROR_FILE")" | tee -a "$REPORT_FILE"
    TESTS_FAILED=1
  fi
  rm -f "$RESPONSE_FILE" "$CURL_ERROR_FILE"

  run_get \
    "17_VERIFY_DELETED_DRAFT_EXPECT_404" \
    "$API_BASE_URL/api/mail/messages/$DRAFT_WITH_ATTACHMENT_ID/"
fi

if [ -n "$DRAFT_WITHOUT_ATTACHMENT_ID" ]; then
  request \
    "DELETE" \
    "$API_BASE_URL/api/mail/messages/$DRAFT_WITHOUT_ATTACHMENT_ID/draft/" \
    "" \
    ""
  record_response "18_DELETE_DRAFT_WITHOUT_ATTACHMENT" "$HTTP_CODE" "$RESPONSE_FILE"
  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    printf 'CURL_ERROR: %s\n' "$(cat "$CURL_ERROR_FILE")" | tee -a "$REPORT_FILE"
    TESTS_FAILED=1
  fi
  rm -f "$RESPONSE_FILE" "$CURL_ERROR_FILE"
fi

record_section "FINAL_SUMMARY"
printf 'REPORT_FILE=%s\n' "$REPORT_FILE" | tee -a "$REPORT_FILE"
printf 'STORAGE_FILE_ID=%s\n' "${STORAGE_FILE_ID:-NOT_EXTRACTED}" | tee -a "$REPORT_FILE"
printf 'DRAFT_WITH_ATTACHMENT_ID=%s\n' "${DRAFT_WITH_ATTACHMENT_ID:-NOT_EXTRACTED}" | tee -a "$REPORT_FILE"
printf 'DRAFT_WITHOUT_ATTACHMENT_ID=%s\n' "${DRAFT_WITHOUT_ATTACHMENT_ID:-NOT_EXTRACTED}" | tee -a "$REPORT_FILE"
printf 'TESTS_FAILED=%s\n' "$TESTS_FAILED" | tee -a "$REPORT_FILE"
printf 'NOTE=Los borradores de prueba se intentan eliminar al final. El archivo Storage de prueba se conserva para inspección manual.\n' | tee -a "$REPORT_FILE"

echo
echo "Prueba terminada. Reporte creado en: $REPORT_FILE"
echo "Comparte el archivo de reporte, no tokens ni respuestas de login sin sanitizar."

exit "$TESTS_FAILED"
