#!/usr/bin/env bash

set -u
set -o pipefail

API_BASE_URL="${BEEAPP_API_BASE_URL:-http://127.0.0.1:8000}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_DIR="${BEEAPP_TEST_OUTPUT_DIR:-$PWD/beeapp_chat_test_results}"
REPORT_FILE="$OUTPUT_DIR/chat_backend_report_${RUN_ID}.txt"
FAILURES_FILE="$OUTPUT_DIR/chat_backend_failures_${RUN_ID}.txt"
TEST_FILE_PATH="$OUTPUT_DIR/chat_attachment_${RUN_ID}.txt"

ACCESS_TOKEN_A=""
ACCESS_TOKEN_B=""

USER_A_IDENTITY_ID=""
USER_A_COMMERCIAL_IDENTITY_ID=""
USER_B_IDENTITY_ID=""

DIRECT_CONVERSATION_ID=""
DIRECT_MESSAGE_A_ID=""
DIRECT_MESSAGE_B_ID=""
REACTION_ID=""

GROUP_CONVERSATION_ID=""
GROUP_MESSAGE_A_ID=""
GROUP_INVITE_ID=""

CHAT_ATTACHMENT_MESSAGE_ID=""
CHAT_ATTACHMENT_FILE_ID=""

TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
EXPECTED_FAILURES_OK=0

CURRENT_TEST_LABEL=""

HTTP_CODE=""
CURL_EXIT_CODE=0
RESPONSE_FILE=""
CURL_ERROR_FILE=""

mkdir -p "$OUTPUT_DIR"
: > "$REPORT_FILE"
: > "$FAILURES_FILE"


cleanup() {
  rm -f "$TEST_FILE_PATH"

  unset \
    ACCESS_TOKEN_A \
    ACCESS_TOKEN_B \
    USER_A_PASSWORD \
    USER_B_PASSWORD
}
trap cleanup EXIT


require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: falta el comando requerido: $1" \
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
          .url,
          .signed_url,
          .signedURL,
          .storage_path,
          .bucket_id
        )
      else
        .
      end
    )
  ' 2>/dev/null || cat
}


record_section() {
  printf '\n============================================================\n' \
    >> "$REPORT_FILE"

  printf '%s\n' "$1" >> "$REPORT_FILE"

  printf '============================================================\n' \
    >> "$REPORT_FILE"
}


record_response() {
  local label="$1"
  local http_code="$2"
  local body_file="$3"

  record_section "$label"

  printf 'HTTP_STATUS=%s\n' "$http_code" \
    >> "$REPORT_FILE"

  if [ -s "$body_file" ]; then
    sanitize_json < "$body_file" \
      >> "$REPORT_FILE"
  else
    printf '(Respuesta vacía)\n' \
      >> "$REPORT_FILE"
  fi
}


begin_test() {
  local label="$1"

  CURRENT_TEST_LABEL="$label"
  TESTS_TOTAL=$((TESTS_TOTAL + 1))

  printf '\n------------------------------------------------------------\n' \
    >> "$REPORT_FILE"

  printf 'TEST_START=%s\n' "$label" \
    >> "$REPORT_FILE"
}


mark_pass() {
  local message="$1"

  TESTS_PASSED=$((TESTS_PASSED + 1))

  printf 'TEST_RESULT=PASS\n' \
    >> "$REPORT_FILE"

  printf 'PASS: %s\n' "$message" \
    >> "$REPORT_FILE"

  printf '✅ PASS [%s] %s\n' \
    "$CURRENT_TEST_LABEL" \
    "$message" >&2
}


guess_failure_cause() {
  local http_code="$1"
  local response_text="$2"
  local curl_error="$3"

  local response_lower

  response_lower="$(
    printf '%s %s' "$response_text" "$curl_error" \
      | tr '[:upper:]' '[:lower:]'
  )"

  if [[ "$response_lower" == *"connection refused"* ]]; then
    printf '%s' \
      "Django no está corriendo o API_BASE_URL apunta a host/puerto incorrecto."
    return
  fi

  if [[ "$response_lower" == *"timed out"* ]]; then
    printf '%s' \
      "La petición agotó tiempo. Revisa runserver, red, RPC o trigger bloqueado."
    return
  fi

  if [[ "$http_code" == "401" ]]; then
    printf '%s' \
      "Autenticación rechazada. Revisa correo/contraseña, token Supabase o backend de autenticación."
    return
  fi

  if [[ "$http_code" == "403" ]]; then
    printf '%s' \
      "Permiso denegado. Revisa ownership de chat_identity, participación activa o creador de grupo."
    return
  fi

  if [[ "$http_code" == "404" ]]; then
    printf '%s' \
      "Recurso no encontrado. Revisa UUID, ruta, conversación, mensaje o identidad."
    return
  fi

  if [[ "$http_code" == "429" ]]; then
    printf '%s' \
      "Rate limit activado. Espera un minuto o revisa throttles de Chat."
    return
  fi

  if [[ "$http_code" == "500" ]]; then
    printf '%s' \
      "Error interno. Revisa traceback de Django y RPCs/triggers de Supabase."
    return
  fi

  if [[ "$response_lower" == *"authentication_required"* ]]; then
    printf '%s' \
      "La RPC llegó a Supabase sin un JWT válido. Revisa access_token y get_supabase_user_client()."
    return
  fi

  if [[ "$response_lower" == *"syncstorageclient"* ]] \
    && [[ "$response_lower" == *"set_auth"* ]]; then
    printf '%s' \
      "El cliente Supabase intenta usar storage.set_auth(), método no disponible en esta versión."
    return
  fi

  if [[ "$response_lower" == *"structure of query does not match function result type"* ]]; then
    printf '%s' \
      "Una función SQL RETURNS TABLE devuelve tipos incompatibles; convierte varchar a text usando ::text."
    return
  fi

  if [[ "$response_lower" == *"returned type character varying does not match expected type text"* ]]; then
    printf '%s' \
      "Una función SQL RETURNS TABLE devuelve varchar donde declaró text; usa ::text en la columna devuelta."
    return
  fi

  if [[ "$response_lower" == *"relation"* ]] \
    && [[ "$response_lower" == *"does not exist"* ]]; then
    printf '%s' \
      "Falta una tabla, vista, función, trigger o migración SQL de Chat en Supabase."
    return
  fi

  if [[ "$response_lower" == *"function"* ]] \
    && [[ "$response_lower" == *"does not exist"* ]]; then
    printf '%s' \
      "Falta una función RPC de Chat o el nombre en backend no coincide con Supabase."
    return
  fi

  if [[ "$response_lower" == *"column"* ]] \
    && [[ "$response_lower" == *"does not exist"* ]]; then
    printf '%s' \
      "El backend consulta una columna que no existe o cuyo nombre no coincide con la BD."
    return
  fi

  if [[ "$response_lower" == *"must be a valid uuid"* ]]; then
    printf '%s' \
      "No se extrajo un UUID válido. Revisa el paso anterior de bootstrap o creación de recurso."
    return
  fi

  if [[ "$response_lower" == *"chat_group_only_posting_identity_can_send"* ]]; then
    printf '%s' \
      "La restricción de grupo funciona: solo la identidad creadora puede publicar."
    return
  fi

  if [[ "$response_lower" == *"chat_sender_not_active_participant"* ]]; then
    printf '%s' \
      "La identidad remitente no participa activamente o no pertenece al usuario autenticado."
    return
  fi

  if [[ "$response_lower" == *"chat_attachment"* ]]; then
    printf '%s' \
      "Problema de adjunto: revisa files.status=ready, owner_id, kind, Storage y triggers de chat."
    return
  fi

  if [[ "$response_lower" == *"storage_quota_exceeded"* ]]; then
    printf '%s' \
      "La cuota de Storage del usuario no tiene suficiente espacio."
    return
  fi

  if [[ "$http_code" == "400" ]]; then
    printf '%s' \
      "Payload inválido o regla de negocio rechazada. Revisa RESPONSE_BODY."
    return
  fi

  printf '%s' \
    "Causa no detectada automáticamente. Revisa RESPONSE_BODY y traceback de Django."
}


mark_failure() {
  local message="$1"
  local http_code="${2:-N/A}"
  local body_file="${3:-}"
  local curl_error_file="${4:-}"

  local body_content=""
  local curl_error_content=""
  local probable_cause

  TESTS_FAILED=$((TESTS_FAILED + 1))

  if [ -n "$body_file" ] && [ -f "$body_file" ]; then
    body_content="$(sanitize_json < "$body_file")"
  fi

  if [ -n "$curl_error_file" ] && [ -f "$curl_error_file" ]; then
    curl_error_content="$(cat "$curl_error_file")"
  fi

  probable_cause="$(
    guess_failure_cause \
      "$http_code" \
      "$body_content" \
      "$curl_error_content"
  )"

  printf 'TEST_RESULT=FAIL\n' \
    >> "$REPORT_FILE"

  printf 'FAIL: %s\n' "$message" \
    >> "$REPORT_FILE"

  {
    printf '\n============================================================\n'
    printf 'FAILED_TEST=%s\n' "$CURRENT_TEST_LABEL"
    printf 'MESSAGE=%s\n' "$message"
    printf 'HTTP_STATUS=%s\n' "$http_code"
    printf 'POSSIBLE_CAUSE=%s\n' "$probable_cause"
    printf '%s\n' '------------------------------------------------------------'

    if [ -n "$body_content" ]; then
      printf '%s\n' 'RESPONSE_BODY:'
      printf '%s\n' "$body_content"
    else
      printf '%s\n' 'RESPONSE_BODY=(Vacía)'
    fi

    if [ -n "$curl_error_content" ]; then
      printf '%s\n' 'CURL_ERROR:'
      printf '%s\n' "$curl_error_content"
    fi

    printf '%s\n' 'RECOMMENDED_ACTION:'
    printf '%s\n' \
      '1. Revisa el campo RESPONSE_BODY.'
    printf '%s\n' \
      '2. Revisa el traceback de python manage.py runserver.'
    printf '%s\n' \
      '3. Confirma RPCs, tablas, triggers y RLS de Chat en Supabase.'
    printf '============================================================\n'
  } >> "$FAILURES_FILE"

  printf '\n============================================================\n' >&2
  printf '❌ FAIL [%s] %s\n' \
    "$CURRENT_TEST_LABEL" \
    "$message" >&2
  printf 'HTTP_STATUS=%s\n' "$http_code" >&2
  printf 'POSSIBLE_CAUSE=%s\n' "$probable_cause" >&2
  printf '%s\n' '------------------------------------------------------------' >&2

  if [ -n "$body_content" ]; then
    printf '%s\n' 'RESPONSE_BODY:' >&2
    printf '%s\n' "$body_content" >&2
  else
    printf '%s\n' 'RESPONSE_BODY=(Vacía)' >&2
  fi

  if [ -n "$curl_error_content" ]; then
    printf '%s\n' 'CURL_ERROR:' >&2
    printf '%s\n' "$curl_error_content" >&2
  fi

  printf '%s\n' '------------------------------------------------------------' >&2
  printf 'REPORT_FILE=%s\n' "$REPORT_FILE" >&2
  printf 'FAILURES_FILE=%s\n' "$FAILURES_FILE" >&2
  printf '============================================================\n' >&2
}


mark_expected_failure_ok() {
  local message="$1"

  TESTS_PASSED=$((TESTS_PASSED + 1))
  EXPECTED_FAILURES_OK=$((EXPECTED_FAILURES_OK + 1))

  printf 'TEST_RESULT=PASS_EXPECTED_FAILURE\n' \
    >> "$REPORT_FILE"

  printf 'EXPECTED_FAILURE_OK: %s\n' "$message" \
    >> "$REPORT_FILE"

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

  local body_file
  local curl_error_file

  body_file="$(mktemp)"
  curl_error_file="$(mktemp)"

  local -a curl_args=(
    --silent
    --show-error
    --max-time 60
    --request "$method"
    --header "Authorization: Bearer $token"
    --header "Accept: application/json"
    --output "$body_file"
    --write-out "%{http_code}"
  )

  if [ -n "$content_type" ]; then
    curl_args+=(
      --header "Content-Type: $content_type"
    )
  fi

  if [ -n "$body" ]; then
    curl_args+=(--data "$body")
  fi

  curl_args+=("$url")

  HTTP_CODE="$(curl "${curl_args[@]}" 2>"$curl_error_file")"
  CURL_EXIT_CODE=$?
  RESPONSE_FILE="$body_file"
  CURL_ERROR_FILE="$curl_error_file"
}


request_multipart() {
  local method="$1"
  local token="$2"
  local url="$3"
  shift 3

  local body_file
  local curl_error_file

  body_file="$(mktemp)"
  curl_error_file="$(mktemp)"

  local -a curl_args=(
    --silent
    --show-error
    --max-time 120
    --request "$method"
    --header "Authorization: Bearer $token"
    --header "Accept: application/json"
    --output "$body_file"
    --write-out "%{http_code}"
  )

  while [ "$#" -gt 0 ]; do
    curl_args+=(--form "$1")
    shift
  done

  curl_args+=("$url")

  HTTP_CODE="$(curl "${curl_args[@]}" 2>"$curl_error_file")"
  CURL_EXIT_CODE=$?
  RESPONSE_FILE="$body_file"
  CURL_ERROR_FILE="$curl_error_file"
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
  local body="${5:-}"
  local expected_code="${6:-200}"

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
      "$label: curl failed." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  elif [ "$HTTP_CODE" != "$expected_code" ]; then
    mark_failure \
      "$label: expected HTTP $expected_code, got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  else
    mark_pass \
      "Returned expected HTTP $expected_code."
  fi

  cleanup_request_files
}


run_get() {
  local label="$1"
  local token="$2"
  local url="$3"
  local expected_code="${4:-200}"

  begin_test "$label"

  request \
    "GET" \
    "$token" \
    "$url" \
    "" \
    ""

  record_response \
    "$label" \
    "$HTTP_CODE" \
    "$RESPONSE_FILE"

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    mark_failure \
      "$label: curl failed." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  elif [ "$HTTP_CODE" != "$expected_code" ]; then
    mark_failure \
      "$label: expected HTTP $expected_code, got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  else
    mark_pass \
      "Returned expected HTTP $expected_code."
  fi

  cleanup_request_files
}


run_expected_failure() {
  local label="$1"
  local method="$2"
  local token="$3"
  local url="$4"
  local body="$5"

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
      "$label: curl failed unexpectedly." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"

  elif [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ]; then
    mark_expected_failure_ok \
      "$label returned expected HTTP $HTTP_CODE."

  else
    mark_failure \
      "$label: expected HTTP 400 or 403, got HTTP $HTTP_CODE." \
      "$HTTP_CODE" \
      "$RESPONSE_FILE" \
      "$CURL_ERROR_FILE"
  fi

  cleanup_request_files
}


login() {
  local user_label="$1"
  local email
  local password
  local login_body
  local login_file
  local login_err
  local login_code
  local login_exit
  local token
  local sanitized_login_response

  read -r -p "Correo BeeApp para ${user_label}: " email >&2
  read -r -s -p "Contraseña BeeApp para ${user_label}: " password >&2
  printf '\n' >&2

  login_body="$(
    jq -n \
      --arg email "$email" \
      --arg password "$password" \
      '{
        email: $email,
        password: $password
      }'
  )"

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
  login_exit=$?

  sanitized_login_response="$(
    if [ -s "$login_file" ]; then
      sanitize_json < "$login_file"
    else
      printf '(Respuesta vacía)'
    fi
  )"

  begin_test "LOGIN_${user_label}"

  {
    printf '\n============================================================\n'
    printf 'LOGIN_%s\n' "$user_label"
    printf '============================================================\n'
    printf 'HTTP_STATUS=%s\n' "$login_code"
    printf '%s\n' "$sanitized_login_response"
  } >> "$REPORT_FILE"

  token="$(
    jq -r '.session.access_token // empty' \
      "$login_file" \
      2>/dev/null || true
  )"

  if [ "$login_exit" -ne 0 ]; then
    mark_failure \
      "Login ${user_label}: curl failed." \
      "$login_code" \
      "$login_file" \
      "$login_err"

    rm -f "$login_file" "$login_err"
    exit 1
  fi

  if [ "$login_code" != "200" ] || [ -z "$token" ]; then
    mark_failure \
      "Login ${user_label}: no se obtuvo session.access_token." \
      "$login_code" \
      "$login_file" \
      "$login_err"

    rm -f "$login_file" "$login_err"
    exit 1
  fi

  mark_pass \
    "Authentication successful and access token extracted."

  rm -f "$login_file" "$login_err"

  printf '%s' "$token"
}


extract_profile_identity_id() {
  local json="$1"

  echo "$json" \
    | jq -r '
      .identities[]
      | select(.identity_type == "profile")
      | .id
    ' \
    | head -n 1
}


extract_first_commercial_identity_id() {
  local json="$1"

  echo "$json" \
    | jq -r '
      .identities[]
      | select(.identity_type == "commercial_profile")
      | .id
    ' \
    | head -n 1
}


validate_uuid_value() {
  local label="$1"
  local value="$2"

  begin_test "$label"

  if [ -z "$value" ] || [ "$value" = "null" ]; then
    mark_failure \
      "$label: UUID was not extracted." \
      "N/A" \
      "" \
      ""

    return 1
  fi

  mark_pass "$label extracted successfully."
  return 0
}


require_command curl
require_command jq


record_section "BEEAPP_CHAT_BACKEND_SMOKE_TEST"

printf 'RUN_ID=%s\n' "$RUN_ID" \
  >> "$REPORT_FILE"

printf 'API_BASE_URL=%s\n' "$API_BASE_URL" \
  >> "$REPORT_FILE"

printf '%s\n' \
  'NOTE=Tokens, passwords, correos, sesiones y URLs firmadas se eliminan del reporte.' \
  >> "$REPORT_FILE"

printf '%s\n' \
  'NOTE=Se requieren dos cuentas BeeApp distintas.' \
  >> "$REPORT_FILE"


echo
echo "============================================================"
echo "BeeApp Chat Backend Smoke Test"
echo "API: $API_BASE_URL"
echo "============================================================"
echo
echo "Usa dos cuentas BeeApp DIFERENTES."
echo "Cuenta A crea el directo y el grupo."
echo "Cuenta B recibe mensajes, acepta la invitación y prueba restricciones."
echo


ACCESS_TOKEN_A="$(login "USUARIO_A")"
printf '\n' >&2

ACCESS_TOKEN_B="$(login "USUARIO_B")"
printf '\n' >&2


echo
echo "[01] Verificando health endpoint..."

begin_test "01_HEALTH_CHECK"

HEALTH_BODY_FILE="$(mktemp)"
HEALTH_ERROR_FILE="$(mktemp)"

HEALTH_HTTP_CODE="$(
  curl --silent --show-error \
    --max-time 20 \
    --output "$HEALTH_BODY_FILE" \
    --write-out "%{http_code}" \
    "$API_BASE_URL/api/health/" \
    2>"$HEALTH_ERROR_FILE"
)"
HEALTH_EXIT_CODE=$?

record_response \
  "01_HEALTH_CHECK" \
  "$HEALTH_HTTP_CODE" \
  "$HEALTH_BODY_FILE"

if [ "$HEALTH_EXIT_CODE" -ne 0 ] || [ "$HEALTH_HTTP_CODE" != "200" ]; then
  mark_failure \
    "Health endpoint failed." \
    "$HEALTH_HTTP_CODE" \
    "$HEALTH_BODY_FILE" \
    "$HEALTH_ERROR_FILE"
else
  mark_pass "Health endpoint returned HTTP 200."
fi

rm -f "$HEALTH_BODY_FILE" "$HEALTH_ERROR_FILE"


echo
echo "[02] Bootstrap Usuario A..."

begin_test "02_CHAT_BOOTSTRAP_USER_A"

request \
  "POST" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/bootstrap/" \
  '{}' \
  "application/json"

record_response \
  "02_CHAT_BOOTSTRAP_USER_A" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

BOOTSTRAP_A="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure \
    "Bootstrap Usuario A failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"

  cleanup_request_files
  exit 1
else
  mark_pass "Bootstrap Usuario A returned HTTP 200."
fi

USER_A_IDENTITY_ID="$(extract_profile_identity_id "$BOOTSTRAP_A")"
USER_A_COMMERCIAL_IDENTITY_ID="$(
  extract_first_commercial_identity_id "$BOOTSTRAP_A"
)"

cleanup_request_files

if ! validate_uuid_value \
  "02A_USER_A_PROFILE_IDENTITY" \
  "$USER_A_IDENTITY_ID"; then
  echo "ERROR: no se puede continuar sin identidad privada de Usuario A." >&2
  exit 1
fi


echo
echo "[03] Bootstrap Usuario B..."

begin_test "03_CHAT_BOOTSTRAP_USER_B"

request \
  "POST" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/bootstrap/" \
  '{}' \
  "application/json"

record_response \
  "03_CHAT_BOOTSTRAP_USER_B" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

BOOTSTRAP_B="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure \
    "Bootstrap Usuario B failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"

  cleanup_request_files
  exit 1
else
  mark_pass "Bootstrap Usuario B returned HTTP 200."
fi

USER_B_IDENTITY_ID="$(extract_profile_identity_id "$BOOTSTRAP_B")"

cleanup_request_files

if ! validate_uuid_value \
  "03A_USER_B_PROFILE_IDENTITY" \
  "$USER_B_IDENTITY_ID"; then
  echo "ERROR: no se puede continuar sin identidad privada de Usuario B." >&2
  exit 1
fi


record_section "CHAT_IDENTITIES_EXTRACTED"

printf 'USER_A_PROFILE_IDENTITY=%s\n' \
  "$USER_A_IDENTITY_ID" \
  >> "$REPORT_FILE"

printf 'USER_A_COMMERCIAL_IDENTITY=%s\n' \
  "${USER_A_COMMERCIAL_IDENTITY_ID:-NOT_FOUND}" \
  >> "$REPORT_FILE"

printf 'USER_B_PROFILE_IDENTITY=%s\n' \
  "$USER_B_IDENTITY_ID" \
  >> "$REPORT_FILE"


echo
echo "[04] Listando identidades de Usuario A..."

run_get \
  "04_CHAT_IDENTITIES_USER_A" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/identities/?active_only=true" \
  "200"


echo
echo "[05] Listando identidades de Usuario B..."

run_get \
  "05_CHAT_IDENTITIES_USER_B" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/identities/?active_only=true" \
  "200"


echo
echo "[06] Consultando inbox inicial de Usuario A..."

run_get \
  "06_CHAT_INBOX_USER_A_INITIAL" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/inbox/?identity_id=$USER_A_IDENTITY_ID&limit=50" \
  "200"


echo
echo "[07] Creando u obteniendo chat directo A -> B..."

begin_test "07_CREATE_OR_GET_DIRECT_CONVERSATION_A_TO_B"

DIRECT_PAYLOAD="$(
  jq -n \
    --arg sender_identity_id "$USER_A_IDENTITY_ID" \
    --arg recipient_identity_id "$USER_B_IDENTITY_ID" \
    '{
      sender_identity_id: $sender_identity_id,
      recipient_identity_id: $recipient_identity_id
    }'
)"

request \
  "POST" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/direct-conversations/" \
  "$DIRECT_PAYLOAD" \
  "application/json"

record_response \
  "07_CREATE_OR_GET_DIRECT_CONVERSATION_A_TO_B" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

DIRECT_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ]; then
  mark_failure \
    "Create direct conversation: curl failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"

elif [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Create direct conversation: expected HTTP 200 or 201, got HTTP $HTTP_CODE." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"

else
  mark_pass \
    "Direct conversation returned HTTP $HTTP_CODE."
fi

DIRECT_CONVERSATION_ID="$(
  echo "$DIRECT_RESULT" \
    | jq -r '.conversation.id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "07A_DIRECT_CONVERSATION_ID" \
  "$DIRECT_CONVERSATION_ID"; then
  echo "ERROR: no se puede continuar sin conversación directa." >&2
  exit 1
fi


echo
echo "[08] Consultando detalle del chat directo como Usuario A..."

run_get \
  "08_DIRECT_CONVERSATION_DETAIL_USER_A" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/" \
  "200"


echo
echo "[09] Enviando mensaje de texto A -> B..."

begin_test "09_SEND_TEXT_MESSAGE_A_TO_B"

TEXT_MESSAGE_A_PAYLOAD="$(
  jq -n \
    --arg sender_identity_id "$USER_A_IDENTITY_ID" \
    --arg run_id "$RUN_ID" \
    '{
      sender_identity_id: $sender_identity_id,
      message_type: "text",
      body: ("Hola desde BeeApp Chat smoke test " + $run_id),
      metadata: {
        source: "chat_backend_smoke_test",
        run_id: $run_id
      }
    }'
)"

request \
  "POST" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/messages/" \
  "$TEXT_MESSAGE_A_PAYLOAD" \
  "application/json"

record_response \
  "09_SEND_TEXT_MESSAGE_A_TO_B" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

MESSAGE_A_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Send text message A -> B failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Text message A -> B created."
fi

DIRECT_MESSAGE_A_ID="$(
  echo "$MESSAGE_A_RESULT" \
    | jq -r '.message.id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "09A_DIRECT_MESSAGE_A_ID" \
  "$DIRECT_MESSAGE_A_ID"; then
  echo "ERROR: no se puede continuar sin mensaje directo A." >&2
  exit 1
fi


echo
echo "[10] Verificando inbox y no leídos de Usuario B..."

begin_test "10_CHAT_INBOX_USER_B_AFTER_A_MESSAGE"

request \
  "GET" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/inbox/?identity_id=$USER_B_IDENTITY_ID&limit=50" \
  "" \
  ""

record_response \
  "10_CHAT_INBOX_USER_B_AFTER_A_MESSAGE" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

INBOX_B_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
  mark_failure \
    "Inbox B after message failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Inbox User B returned HTTP 200."
fi

B_UNREAD_COUNT="$(
  echo "$INBOX_B_RESULT" \
    | jq -r \
      --arg conversation_id "$DIRECT_CONVERSATION_ID" '
        .conversations[]
        | select(.conversation_id == $conversation_id)
        | .unread_count
      ' \
    | head -n 1
)"

cleanup_request_files

begin_test "10A_VERIFY_USER_B_UNREAD_COUNT"

if [ -z "$B_UNREAD_COUNT" ] || [ "$B_UNREAD_COUNT" = "null" ]; then
  mark_failure \
    "Direct conversation was not found in User B inbox." \
    "N/A" \
    "" \
    ""

elif [ "$B_UNREAD_COUNT" -lt 1 ] 2>/dev/null; then
  mark_failure \
    "Expected unread_count >= 1 for User B, got $B_UNREAD_COUNT." \
    "N/A" \
    "" \
    ""

else
  mark_pass "User B unread_count=$B_UNREAD_COUNT."
fi


echo
echo "[11] Listando mensajes como Usuario B..."

run_get \
  "11_LIST_DIRECT_MESSAGES_USER_B" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/messages/?limit=50" \
  "200"


echo
echo "[12] Marcando chat directo como leído para Usuario B..."

READ_PAYLOAD="$(
  jq -n \
    --arg identity_id "$USER_B_IDENTITY_ID" \
    --arg message_id "$DIRECT_MESSAGE_A_ID" \
    '{
      identity_id: $identity_id,
      last_read_message_id: $message_id
    }'
)"

run_json_request \
  "12_MARK_DIRECT_CONVERSATION_READ_USER_B" \
  "POST" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/read/" \
  "$READ_PAYLOAD" \
  "200"


echo
echo "[13] Consultando visto del mensaje de A..."

run_get \
  "13_GET_DIRECT_MESSAGE_READ_STATUS_USER_A" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/read-status/" \
  "200"


echo
echo "[14] Enviando respuesta de texto B -> A..."

begin_test "14_SEND_TEXT_MESSAGE_B_TO_A"

TEXT_MESSAGE_B_PAYLOAD="$(
  jq -n \
    --arg sender_identity_id "$USER_B_IDENTITY_ID" \
    --arg run_id "$RUN_ID" \
    '{
      sender_identity_id: $sender_identity_id,
      message_type: "text",
      body: ("Respuesta desde Usuario B " + $run_id),
      metadata: {
        source: "chat_backend_smoke_test",
        run_id: $run_id
      }
    }'
)"

request \
  "POST" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/messages/" \
  "$TEXT_MESSAGE_B_PAYLOAD" \
  "application/json"

record_response \
  "14_SEND_TEXT_MESSAGE_B_TO_A" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

MESSAGE_B_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Send text message B -> A failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Text message B -> A created."
fi

DIRECT_MESSAGE_B_ID="$(
  echo "$MESSAGE_B_RESULT" \
    | jq -r '.message.id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "14A_DIRECT_MESSAGE_B_ID" \
  "$DIRECT_MESSAGE_B_ID"; then
  echo "ERROR: no se puede continuar sin mensaje directo B." >&2
  exit 1
fi


echo
echo "[15] Agregando reacción de B al mensaje de A..."

begin_test "15_CREATE_REACTION_B_ON_A_MESSAGE"

REACTION_PAYLOAD="$(
  jq -n \
    --arg identity_id "$USER_B_IDENTITY_ID" \
    '{
      identity_id: $identity_id,
      emoji: "👍"
    }'
)"

request \
  "POST" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/reactions/" \
  "$REACTION_PAYLOAD" \
  "application/json"

record_response \
  "15_CREATE_REACTION_B_ON_A_MESSAGE" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

REACTION_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Create reaction failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Reaction created."
fi

REACTION_ID="$(
  echo "$REACTION_RESULT" \
    | jq -r '.reaction.id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "15A_REACTION_ID" \
  "$REACTION_ID"; then
  echo "ERROR: no se puede continuar sin reacción creada." >&2
  exit 1
fi


echo
echo "[16] Listando reacciones como Usuario A..."

run_get \
  "16_LIST_REACTIONS_USER_A" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/reactions/" \
  "200"


echo
echo "[17] Eliminando reacción de B..."

begin_test "17_DELETE_REACTION_B"

REACTION_DELETE_BODY="$(
  jq -n \
    --arg identity_id "$USER_B_IDENTITY_ID" \
    '{
      identity_id: $identity_id
    }'
)"

request \
  "DELETE" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/messages/$DIRECT_MESSAGE_A_ID/reactions/%F0%9F%91%8D/?identity_id=$USER_B_IDENTITY_ID" \
  "" \
  ""

record_response \
  "17_DELETE_REACTION_B" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "204" ]; then
  mark_failure \
    "Delete reaction failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Reaction deleted."
fi

cleanup_request_files


echo
echo "[18] Creando grupo desde Usuario A..."

begin_test "18_CREATE_GROUP_USER_A"

GROUP_PAYLOAD="$(
  jq -n \
    --arg creator_identity_id "$USER_A_IDENTITY_ID" \
    --arg run_id "$RUN_ID" \
    '{
      creator_identity_id: $creator_identity_id,
      name: ("Grupo Smoke Test " + $run_id),
      description: "Grupo privado temporal creado para validar BeeApp Chat."
    }'
)"

request \
  "POST" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/groups/" \
  "$GROUP_PAYLOAD" \
  "application/json"

record_response \
  "18_CREATE_GROUP_USER_A" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

GROUP_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Create group failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Group created."
fi

GROUP_CONVERSATION_ID="$(
  echo "$GROUP_RESULT" \
    | jq -r '.conversation.id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "18A_GROUP_CONVERSATION_ID" \
  "$GROUP_CONVERSATION_ID"; then
  echo "ERROR: no se puede continuar sin grupo." >&2
  exit 1
fi


echo
echo "[19] Enviando mensaje del creador al grupo..."

begin_test "19_SEND_GROUP_MESSAGE_FROM_CREATOR"

GROUP_MESSAGE_PAYLOAD="$(
  jq -n \
    --arg sender_identity_id "$USER_A_IDENTITY_ID" \
    --arg run_id "$RUN_ID" \
    '{
      sender_identity_id: $sender_identity_id,
      message_type: "text",
      body: ("Mensaje del creador del grupo " + $run_id),
      metadata: {
        source: "chat_backend_smoke_test",
        run_id: $run_id
      }
    }'
)"

request \
  "POST" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/conversations/$GROUP_CONVERSATION_ID/messages/" \
  "$GROUP_MESSAGE_PAYLOAD" \
  "application/json"

record_response \
  "19_SEND_GROUP_MESSAGE_FROM_CREATOR" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

GROUP_MESSAGE_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Creator group message failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Group creator message created."
fi

GROUP_MESSAGE_A_ID="$(
  echo "$GROUP_MESSAGE_RESULT" \
    | jq -r '.message.id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "19A_GROUP_MESSAGE_ID" \
  "$GROUP_MESSAGE_A_ID"; then
  echo "ERROR: no se puede continuar sin mensaje de grupo." >&2
  exit 1
fi


echo
echo "[20] Invitando Usuario B al grupo..."

begin_test "20_INVITE_USER_B_TO_GROUP"

GROUP_INVITE_PAYLOAD="$(
  jq -n \
    --arg invited_identity_id "$USER_B_IDENTITY_ID" \
    '{
      invited_identity_id: $invited_identity_id,
      expires_at: null
    }'
)"

request \
  "POST" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/groups/$GROUP_CONVERSATION_ID/invites/" \
  "$GROUP_INVITE_PAYLOAD" \
  "application/json"

record_response \
  "20_INVITE_USER_B_TO_GROUP" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

GROUP_INVITE_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Group invite failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Group invitation created."
fi

GROUP_INVITE_ID="$(
  echo "$GROUP_INVITE_RESULT" \
    | jq -r '.invite.id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "20A_GROUP_INVITE_ID" \
  "$GROUP_INVITE_ID"; then
  echo "ERROR: no se puede continuar sin invitación de grupo." >&2
  exit 1
fi


echo
echo "[21] Listando invitaciones pendientes de Usuario B..."

run_get \
  "21_LIST_PENDING_GROUP_INVITES_USER_B" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/group-invites/?identity_id=$USER_B_IDENTITY_ID&status=pending&limit=50" \
  "200"


echo
echo "[22] Aceptando invitación como Usuario B..."

GROUP_INVITE_RESPONSE_PAYLOAD='{"accept":true}'

run_json_request \
  "22_ACCEPT_GROUP_INVITE_USER_B" \
  "POST" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/group-invites/$GROUP_INVITE_ID/response/" \
  "$GROUP_INVITE_RESPONSE_PAYLOAD" \
  "200"


echo
echo "[23] Probando restricción: B NO puede escribir en el grupo..."

GROUP_REJECTED_MESSAGE_PAYLOAD="$(
  jq -n \
    --arg sender_identity_id "$USER_B_IDENTITY_ID" \
    --arg run_id "$RUN_ID" \
    '{
      sender_identity_id: $sender_identity_id,
      message_type: "text",
      body: ("Este mensaje debe ser rechazado " + $run_id)
    }'
)"

run_expected_failure \
  "23_GROUP_MEMBER_WRITE_MUST_FAIL" \
  "POST" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/conversations/$GROUP_CONVERSATION_ID/messages/" \
  "$GROUP_REJECTED_MESSAGE_PAYLOAD"


echo
echo "[24] Consultando lectores del mensaje del grupo..."

run_get \
  "24_GET_GROUP_MESSAGE_READERS_USER_A" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/messages/$GROUP_MESSAGE_A_ID/readers/" \
  "200"


echo
echo "[25] Probando subida de adjunto de texto en chat directo..."

printf '%s\n' \
  'Archivo temporal para BeeApp Chat Smoke Test.' \
  "Run ID: $RUN_ID" \
  'Este archivo se usa solo para validar adjuntos de chat.' \
  > "$TEST_FILE_PATH"

begin_test "25_UPLOAD_CHAT_ATTACHMENT_A_TO_B"

request_multipart \
  "POST" \
  "$ACCESS_TOKEN_A" \
  "$API_BASE_URL/api/chat/conversations/$DIRECT_CONVERSATION_ID/attachments/" \
  "sender_identity_id=$USER_A_IDENTITY_ID" \
  "message_type=document" \
  "body=Adjunto temporal del smoke test $RUN_ID" \
  "metadata={\"source\":\"chat_backend_smoke_test\",\"run_id\":\"$RUN_ID\"}" \
  "file=@${TEST_FILE_PATH};type=text/plain"

record_response \
  "25_UPLOAD_CHAT_ATTACHMENT_A_TO_B" \
  "$HTTP_CODE" \
  "$RESPONSE_FILE"

CHAT_ATTACHMENT_RESULT="$(cat "$RESPONSE_FILE")"

if [ "$CURL_EXIT_CODE" -ne 0 ] || [ "$HTTP_CODE" != "201" ]; then
  mark_failure \
    "Chat attachment upload failed." \
    "$HTTP_CODE" \
    "$RESPONSE_FILE" \
    "$CURL_ERROR_FILE"
else
  mark_pass "Chat attachment uploaded and message created."
fi

CHAT_ATTACHMENT_MESSAGE_ID="$(
  echo "$CHAT_ATTACHMENT_RESULT" \
    | jq -r '.message.id // empty'
)"

CHAT_ATTACHMENT_FILE_ID="$(
  echo "$CHAT_ATTACHMENT_RESULT" \
    | jq -r '.file.id // .message.attachment_file_id // empty'
)"

cleanup_request_files

if ! validate_uuid_value \
  "25A_CHAT_ATTACHMENT_MESSAGE_ID" \
  "$CHAT_ATTACHMENT_MESSAGE_ID"; then
  echo "ERROR: no se puede continuar sin mensaje de adjunto." >&2
  exit 1
fi

if ! validate_uuid_value \
  "25B_CHAT_ATTACHMENT_FILE_ID" \
  "$CHAT_ATTACHMENT_FILE_ID"; then
  echo "ERROR: no se puede continuar sin archivo adjunto." >&2
  exit 1
fi


echo
echo "[26] Consultando metadata y URL firmada como Usuario B..."

run_get \
  "26A_GET_CHAT_ATTACHMENT_METADATA_AS_USER_B" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/messages/$CHAT_ATTACHMENT_MESSAGE_ID/attachment/?identity_id=$USER_B_IDENTITY_ID" \
  "200"

run_get \
  "26B_GET_CHAT_ATTACHMENT_SIGNED_URL_AS_USER_B" \
  "$ACCESS_TOKEN_B" \
  "$API_BASE_URL/api/chat/messages/$CHAT_ATTACHMENT_MESSAGE_ID/attachment/access/?identity_id=$USER_B_IDENTITY_ID&download=true" \
  "200"


record_section "27_PUSH_WORKER_MANUAL_COMMAND"

printf '%s\n' \
  'Ejecuta manualmente, en otra terminal, después de este script:' \
  >> "$REPORT_FILE"

printf '%s\n' \
  'python manage.py process_chat_push_notifications --limit 50' \
  >> "$REPORT_FILE"

printf '%s\n' \
  'No se ejecuta desde este .sh porque depende de venv y puede enviar push real.' \
  >> "$REPORT_FILE"


record_section "FINAL_SUMMARY"

printf 'REPORT_FILE=%s\n' "$REPORT_FILE" \
  >> "$REPORT_FILE"

printf 'FAILURES_FILE=%s\n' "$FAILURES_FILE" \
  >> "$REPORT_FILE"

printf 'TESTS_TOTAL=%s\n' "$TESTS_TOTAL" \
  >> "$REPORT_FILE"

printf 'TESTS_PASSED=%s\n' "$TESTS_PASSED" \
  >> "$REPORT_FILE"

printf 'TESTS_FAILED=%s\n' "$TESTS_FAILED" \
  >> "$REPORT_FILE"

printf 'EXPECTED_FAILURES_OK=%s\n' \
  "$EXPECTED_FAILURES_OK" \
  >> "$REPORT_FILE"

printf 'USER_A_PROFILE_IDENTITY=%s\n' \
  "$USER_A_IDENTITY_ID" \
  >> "$REPORT_FILE"

printf 'USER_A_COMMERCIAL_IDENTITY=%s\n' \
  "${USER_A_COMMERCIAL_IDENTITY_ID:-NOT_FOUND}" \
  >> "$REPORT_FILE"

printf 'USER_B_PROFILE_IDENTITY=%s\n' \
  "$USER_B_IDENTITY_ID" \
  >> "$REPORT_FILE"

printf 'DIRECT_CONVERSATION_ID=%s\n' \
  "$DIRECT_CONVERSATION_ID" \
  >> "$REPORT_FILE"

printf 'DIRECT_MESSAGE_A_ID=%s\n' \
  "$DIRECT_MESSAGE_A_ID" \
  >> "$REPORT_FILE"

printf 'DIRECT_MESSAGE_B_ID=%s\n' \
  "$DIRECT_MESSAGE_B_ID" \
  >> "$REPORT_FILE"

printf 'GROUP_CONVERSATION_ID=%s\n' \
  "$GROUP_CONVERSATION_ID" \
  >> "$REPORT_FILE"

printf 'GROUP_INVITE_ID=%s\n' \
  "$GROUP_INVITE_ID" \
  >> "$REPORT_FILE"

printf 'CHAT_ATTACHMENT_MESSAGE_ID=%s\n' \
  "$CHAT_ATTACHMENT_MESSAGE_ID" \
  >> "$REPORT_FILE"

printf 'CHAT_ATTACHMENT_FILE_ID=%s\n' \
  "$CHAT_ATTACHMENT_FILE_ID" \
  >> "$REPORT_FILE"

printf '%s\n' \
  'NOTE=El script crea datos reales: chats, mensajes, grupo, invitación y archivo temporal. No los elimina para conservar evidencia.' \
  >> "$REPORT_FILE"


echo
echo "============================================================"
echo "RESUMEN FINAL — BeeApp Chat Smoke Test"
echo "============================================================"
echo "Total de pruebas ejecutadas: $TESTS_TOTAL"
echo "Pruebas aprobadas:          $TESTS_PASSED"
echo "Pruebas fallidas:           $TESTS_FAILED"
echo "Fallos esperados validados: $EXPECTED_FAILURES_OK"
echo
echo "Reporte completo:"
echo "  $REPORT_FILE"
echo
echo "Reporte de fallos:"
echo "  $FAILURES_FILE"
echo "============================================================"
echo

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo "✅ TODAS LAS PRUEBAS REALES PASARON."
  echo "✅ La restricción de escritura del miembro de grupo fue validada."
else
  echo "❌ HAY PRUEBAS FALLIDAS."
  echo "❌ Abre este archivo para revisar cada error:"
  echo "   $FAILURES_FILE"
fi

echo
echo "Después puedes probar el worker push:"
echo
echo "cd ~/Git/beeapp_ai/Backend/beeAppBack"
echo "python manage.py process_chat_push_notifications --limit 50"
echo

exit "$TESTS_FAILED"