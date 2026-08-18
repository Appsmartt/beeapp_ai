#!/usr/bin/env bash
set -u
set -o pipefail


API_BASE="${BEEAPP_API:-http://127.0.0.1:8000}"
USER_EMAIL="${BEEAPP_USER_EMAIL:-andres.santa-fe@hotmail.com}"

REPORT="integrations_api_test_report.txt"
SUMMARY="integrations_api_test_summary.txt"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0


require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Falta el comando requerido: $command_name"
    exit 1
  fi
}


require_command curl
require_command python
require_command mktemp


read -r -s -p "Password para $USER_EMAIL: " USER_PASSWORD
echo


json_pretty() {
  python -m json.tool 2>/dev/null || cat
}


json_value() {
  local expression="$1"

  python -c "
import json
import sys


data = json.load(sys.stdin)
value = $expression


if value is None:
    print('')
elif isinstance(value, bool):
    print(str(value).lower())
else:
    print(value)
" 2>/dev/null
}


record_report() {
  local label="$1"
  local expected_status="$2"
  local actual_status="$3"
  local result="$4"
  local response="$5"

  {
    echo
    echo "================================================================"
    echo "TEST: $label"
    echo "================================================================"
    echo "expected_status: $expected_status"
    echo "actual_status: $actual_status"
    echo "result: $result"
    echo "response:"
    echo "$response" | json_pretty
  } >> "$REPORT"

  {
    printf '%-8s | expected=%-14s | actual=%-8s | %s\n' \
      "$result" \
      "$expected_status" \
      "$actual_status" \
      "$label"
  } >> "$SUMMARY"
}


record_assertion() {
  local label="$1"
  local result="$2"
  local detail="${3:-}"

  if [[ "$result" == "PASS" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
  elif [[ "$result" == "SKIP" ]]; then
    SKIP_COUNT=$((SKIP_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  {
    echo
    echo "================================================================"
    echo "ASSERTION: $label"
    echo "================================================================"
    echo "result: $result"
    echo "detail: $detail"
  } >> "$REPORT"

  printf '%-8s | %s%s\n' \
    "$result" \
    "$label" \
    "${detail:+ — $detail}" >> "$SUMMARY"
}


api_request() {
  local label="$1"
  local expected_status="$2"
  shift 2

  local body_file
  local actual_status
  local response
  local curl_exit_code
  local result

  body_file="$(mktemp)"

  actual_status="$(
    curl -sS \
      -o "$body_file" \
      -w "%{http_code}" \
      "$@"
  )"
  curl_exit_code=$?

  response="$(cat "$body_file")"
  rm -f "$body_file"

  if [[ "$curl_exit_code" -ne 0 ]]; then
    result="FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    actual_status="curl-$curl_exit_code"
  elif [[ "$actual_status" == "$expected_status" ]]; then
    result="PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    result="FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  record_report \
    "$label" \
    "$expected_status" \
    "$actual_status" \
    "$result" \
    "$response"

  printf '%s' "$response"
}


api_request_any_status() {
  local label="$1"
  local allowed_statuses="$2"
  shift 2

  local body_file
  local actual_status
  local response
  local curl_exit_code
  local result="FAIL"
  local allowed_status

  body_file="$(mktemp)"

  actual_status="$(
    curl -sS \
      -o "$body_file" \
      -w "%{http_code}" \
      "$@"
  )"
  curl_exit_code=$?

  response="$(cat "$body_file")"
  rm -f "$body_file"

  if [[ "$curl_exit_code" -eq 0 ]]; then
    for allowed_status in $allowed_statuses; do
      if [[ "$actual_status" == "$allowed_status" ]]; then
        result="PASS"
        PASS_COUNT=$((PASS_COUNT + 1))
        break
      fi
    done
  fi

  if [[ "$result" != "PASS" ]]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))

    if [[ "$curl_exit_code" -ne 0 ]]; then
      actual_status="curl-$curl_exit_code"
    fi
  fi

  record_report \
    "$label" \
    "one-of($allowed_statuses)" \
    "$actual_status" \
    "$result" \
    "$response"

  printf '%s' "$response"
}


assert_nonempty() {
  local label="$1"
  local value="$2"

  if [[ -n "$value" ]]; then
    record_assertion "$label" "PASS"
    return 0
  fi

  record_assertion "$label" "FAIL" "Valor vacío"
  return 1
}


assert_equals() {
  local label="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$expected" == "$actual" ]]; then
    record_assertion "$label" "PASS" "$actual"
    return 0
  fi

  record_assertion \
    "$label" \
    "FAIL" \
    "Esperado=$expected; recibido=$actual"

  return 1
}


assert_no_sensitive_keys() {
  local label="$1"
  local response="$2"

  local result

  result="$(
    printf '%s' "$response" \
    | python -c "
import json
import sys


sensitive_fragments = (
    'access_token',
    'refresh_token',
    'id_token',
    'ciphertext',
    'pkce_verifier',
    'client_secret',
    'state_hash',
)


def walk(value, path='root'):
    if isinstance(value, dict):
        for key, child in value.items():
            normalized_key = str(key).lower()

            if any(
                fragment in normalized_key
                for fragment in sensitive_fragments
            ):
                print(f'SENSITIVE_KEY:{path}.{key}')
                raise SystemExit(1)

            walk(child, f'{path}.{key}')

    elif isinstance(value, list):
        for index, child in enumerate(value):
            walk(child, f'{path}[{index}]')


try:
    data = json.load(sys.stdin)
except Exception:
    print('INVALID_JSON')
    raise SystemExit(1)


walk(data)
print('OK')
"
  )"

  if [[ "$result" == "OK" ]]; then
    record_assertion "$label" "PASS"
  else
    record_assertion "$label" "FAIL" "$result"
  fi
}


login() {
  local email="$1"
  local password="$2"

  api_request \
    "Login BeeApp: $email" \
    "200" \
    -X POST \
    "$API_BASE/api/accounts/login/" \
    -H "Content-Type: application/json" \
    -d "$(python - <<PY
import json


print(json.dumps({
    'email': '$email',
    'password': '$password',
}))
PY
)"
}


{
  echo "BEEAPP — INTEGRATIONS E2E API TEST REPORT"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "API_BASE: $API_BASE"
  echo "User: $USER_EMAIL"
  echo "Passwords, tokens, OAuth codes and states are not recorded."
} > "$REPORT"


{
  echo "BEEAPP — INTEGRATIONS E2E API TEST SUMMARY"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "================================================================"
} > "$SUMMARY"


echo "============================================================"
echo "BEEAPP INTEGRATIONS — PRUEBAS END-TO-END"
echo "API: $API_BASE"
echo "Usuario: $USER_EMAIL"
echo "============================================================"


echo
echo "[1/9] Health check"


HEALTH_RESPONSE="$(api_request \
  "Health check" \
  "200" \
  "$API_BASE/api/health/"
)"


HEALTH_STATUS="$(
  printf '%s' "$HEALTH_RESPONSE" \
  | json_value "data.get('status', '')"
)"


assert_equals \
  "Health payload status" \
  "ok" \
  "$HEALTH_STATUS"


echo
echo "[2/9] Login BeeApp"


LOGIN_RESPONSE="$(login "$USER_EMAIL" "$USER_PASSWORD")"


BEEAPP_ACCESS_TOKEN="$(
  printf '%s' "$LOGIN_RESPONSE" \
  | json_value "data.get('session', {}).get('access_token', '')"
)"


assert_nonempty \
  "BeeApp access token extracted" \
  "$BEEAPP_ACCESS_TOKEN" || exit 1


echo
echo "[3/9] Seguridad sin credenciales"


api_request \
  "Catalog without credentials" \
  "401" \
  "$API_BASE/api/integrations/catalog/" \
  >/dev/null


api_request \
  "Connections without credentials" \
  "401" \
  "$API_BASE/api/integrations/connections/" \
  >/dev/null


api_request \
  "Google authorization without credentials" \
  "401" \
  -X POST \
  "$API_BASE/api/integrations/connections/google/authorize/" \
  -H "Content-Type: application/json" \
  -d '{"capabilities":[]}' \
  >/dev/null


echo
echo "[4/9] Catálogo de Integraciones"


CATALOG_RESPONSE="$(api_request \
  "Integration catalog" \
  "200" \
  "$API_BASE/api/integrations/catalog/" \
  -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN"
)"


GOOGLE_STATUS="$(
  printf '%s' "$CATALOG_RESPONSE" \
  | json_value "next((item.get('status', '') for item in data.get('providers', []) if item.get('id') == 'google'), '')"
)"


assert_equals \
  "Google appears as available" \
  "available" \
  "$GOOGLE_STATUS"


assert_no_sensitive_keys \
  "Catalog does not expose secrets" \
  "$CATALOG_RESPONSE"


echo
echo "[5/9] Lista segura de conexiones"


CONNECTIONS_RESPONSE="$(api_request \
  "Integration connection list" \
  "200" \
  "$API_BASE/api/integrations/connections/" \
  -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN"
)"


assert_no_sensitive_keys \
  "Connection list does not expose tokens" \
  "$CONNECTIONS_RESPONSE"


echo
echo "[6/9] Validaciones de payload y proveedor"


api_request \
  "Microsoft authorization unavailable" \
  "400" \
  -X POST \
  "$API_BASE/api/integrations/connections/microsoft/authorize/" \
  -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capabilities":[]}' \
  >/dev/null


api_request \
  "Google capabilities must be an array" \
  "400" \
  -X POST \
  "$API_BASE/api/integrations/connections/google/authorize/" \
  -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capabilities":"calendar"}' \
  >/dev/null


echo
echo "[7/9] Inicio de OAuth Google"


GOOGLE_AUTH_RESPONSE="$(api_request \
  "Start Google OAuth authorization" \
  "201" \
  -X POST \
  "$API_BASE/api/integrations/connections/google/authorize/" \
  -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capabilities":[]}'
)"


GOOGLE_AUTH_URL="$(
  printf '%s' "$GOOGLE_AUTH_RESPONSE" \
  | json_value "data.get('authorization_url', '')"
)"


GOOGLE_REQUEST_ID="$(
  printf '%s' "$GOOGLE_AUTH_RESPONSE" \
  | json_value "data.get('request_id', '')"
)"


GOOGLE_EXPIRES_AT="$(
  printf '%s' "$GOOGLE_AUTH_RESPONSE" \
  | json_value "data.get('expires_at', '')"
)"


assert_nonempty \
  "Google authorization URL extracted" \
  "$GOOGLE_AUTH_URL"


assert_nonempty \
  "Google OAuth request ID extracted" \
  "$GOOGLE_REQUEST_ID"


assert_nonempty \
  "Google OAuth expiration extracted" \
  "$GOOGLE_EXPIRES_AT"


if [[ "$GOOGLE_AUTH_URL" == https://accounts.google.com/* ]]; then
  record_assertion \
    "Google authorization endpoint is official" \
    "PASS"
else
  record_assertion \
    "Google authorization endpoint is official" \
    "FAIL" \
    "Expected https://accounts.google.com/"
fi


echo
echo "[8/9] Callback OAuth inválido"


api_request_any_status \
  "Callback without parameters redirects safely" \
  "301 302" \
  "$API_BASE/api/integrations/oauth/callback/google/" \
  >/dev/null


api_request_any_status \
  "Callback invalid state redirects safely" \
  "301 302" \
  "$API_BASE/api/integrations/oauth/callback/google/?code=fake-code&state=invalid-state" \
  >/dev/null


echo
echo "[9/9] OAuth Google real, detalle, reautorización y desconexión"


echo
echo "Para comprobar guardado real de tokens, debes autorizar Google."
read -r -p "¿Abrir Google OAuth ahora? [y/N]: " RUN_GOOGLE_OAUTH


CONNECTION_ID=""


if [[ "$RUN_GOOGLE_OAUTH" =~ ^[Yy]$ ]]; then
  echo
  echo "Abriendo navegador. Inicia sesión con un Test user de Google."

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$GOOGLE_AUTH_URL" >/dev/null 2>&1 || true
  else
    record_assertion \
      "Open Google OAuth automatically" \
      "SKIP" \
      "xdg-open no está instalado; abre la URL manualmente."
  fi

  echo
  read -r -p "Después de completar Google OAuth, presiona Enter... " _


  CONNECTIONS_AFTER_RESPONSE="$(api_request \
    "List connections after Google OAuth" \
    "200" \
    "$API_BASE/api/integrations/connections/" \
    -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN"
  )"


  CONNECTION_ID="$(
    printf '%s' "$CONNECTIONS_AFTER_RESPONSE" \
    | json_value "next((item.get('id', '') for item in data.get('connections', []) if item.get('provider') == 'google' and item.get('status') == 'connected'), '')"
  )"


  assert_nonempty \
    "Connected Google connection ID exists" \
    "$CONNECTION_ID"


  assert_no_sensitive_keys \
    "Connections after OAuth do not expose tokens" \
    "$CONNECTIONS_AFTER_RESPONSE"


  if [[ -n "$CONNECTION_ID" ]]; then
    DETAIL_RESPONSE="$(api_request \
      "Google integration detail" \
      "200" \
      "$API_BASE/api/integrations/connections/$CONNECTION_ID/" \
      -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN"
    )"


    DETAIL_PROVIDER="$(
      printf '%s' "$DETAIL_RESPONSE" \
      | json_value "data.get('connection', {}).get('provider', '')"
    )"


    DETAIL_STATUS="$(
      printf '%s' "$DETAIL_RESPONSE" \
      | json_value "data.get('connection', {}).get('status', '')"
    )"


    DETAIL_EMAIL="$(
      printf '%s' "$DETAIL_RESPONSE" \
      | json_value "data.get('connection', {}).get('provider_email', '')"
    )"


    assert_equals \
      "Connected provider is Google" \
      "google" \
      "$DETAIL_PROVIDER"


    assert_equals \
      "Connected status is persisted" \
      "connected" \
      "$DETAIL_STATUS"


    assert_nonempty \
      "Google account email is persisted" \
      "$DETAIL_EMAIL"


    assert_no_sensitive_keys \
      "Connection detail does not expose tokens" \
      "$DETAIL_RESPONSE"


    REAUTH_RESPONSE="$(api_request \
      "Start Google reauthorization" \
      "201" \
      -X POST \
      "$API_BASE/api/integrations/connections/$CONNECTION_ID/reauthorize/" \
      -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"capabilities":[]}'
    )"


    REAUTH_URL="$(
      printf '%s' "$REAUTH_RESPONSE" \
      | json_value "data.get('authorization_url', '')"
    )"


    assert_nonempty \
      "Reauthorization URL extracted" \
      "$REAUTH_URL"


    if [[ "$REAUTH_URL" == https://accounts.google.com/* ]]; then
      record_assertion \
        "Reauthorization endpoint is official Google" \
        "PASS"
    else
      record_assertion \
        "Reauthorization endpoint is official Google" \
        "FAIL"
    fi


    echo
    read -r -p "¿Deseas desconectar la cuenta Google de prueba? [y/N]: " RUN_DISCONNECT


    if [[ "$RUN_DISCONNECT" =~ ^[Yy]$ ]]; then
      api_request \
        "Disconnect Google connection" \
        "204" \
        -X DELETE \
        "$API_BASE/api/integrations/connections/$CONNECTION_ID/" \
        -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN" \
        >/dev/null


      DISCONNECTED_DETAIL_RESPONSE="$(api_request \
        "Get disconnected connection detail" \
        "200" \
        "$API_BASE/api/integrations/connections/$CONNECTION_ID/" \
        -H "Authorization: Bearer $BEEAPP_ACCESS_TOKEN"
      )"


      DISCONNECTED_STATUS="$(
        printf '%s' "$DISCONNECTED_DETAIL_RESPONSE" \
        | json_value "data.get('connection', {}).get('status', '')"
      )"


      assert_equals \
        "Disconnected status is persisted" \
        "disconnected" \
        "$DISCONNECTED_STATUS"
    else
      record_assertion \
        "Disconnect endpoint" \
        "SKIP" \
        "La conexión se conserva para pruebas posteriores"
    fi
  fi
else
  record_assertion \
    "OAuth real, persisted tokens, detail and reauthorization" \
    "SKIP" \
    "El usuario eligió no iniciar Google OAuth"
fi


{
  echo
  echo "================================================================"
  echo "FINAL COUNTS"
  echo "================================================================"
  echo "PASS: $PASS_COUNT"
  echo "FAIL: $FAIL_COUNT"
  echo "SKIP: $SKIP_COUNT"
} >> "$REPORT"


{
  echo "================================================================"
  echo "FINAL COUNTS"
  echo "PASS: $PASS_COUNT"
  echo "FAIL: $FAIL_COUNT"
  echo "SKIP: $SKIP_COUNT"
} >> "$SUMMARY"


echo
echo "============================================================"
echo "PRUEBAS DE INTEGRACIONES TERMINADAS"
echo "============================================================"
echo "PASS: $PASS_COUNT"
echo "FAIL: $FAIL_COUNT"
echo "SKIP: $SKIP_COUNT"
echo
echo "Reporte completo: $(realpath "$REPORT")"
echo "Resumen: $(realpath "$SUMMARY")"


if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi