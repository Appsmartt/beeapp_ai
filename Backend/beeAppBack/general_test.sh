#!/usr/bin/env bash
# BeeApp — Suite E2E combinada: Agenda + Integraciones
# Ejecuta primero las pruebas de Agenda y después las de Integraciones.
# Requiere: bash, curl, python3 (o python), mktemp y realpath.
# Uso:
#   chmod +x beeapp_e2e_combinado.sh
#   ./beeapp_e2e_combinado.sh
# Variables opcionales:
#   BEEAPP_API=http://127.0.0.1:8000
#   BEEAPP_USER_A_EMAIL=usuario-a@ejemplo.com
#   BEEAPP_USER_B_EMAIL=usuario-b@ejemplo.com
#   BEEAPP_USER_EMAIL=usuario-integraciones@ejemplo.com

set -u
set -o pipefail

API_BASE="${BEEAPP_API:-http://127.0.0.1:8000}"
USER_A_EMAIL="${BEEAPP_USER_A_EMAIL:-andres.santa-fe@hotmail.com}"
USER_B_EMAIL="${BEEAPP_USER_B_EMAIL:-andresFelipeMendozaSilva@hotmail.com}"
INTEGRATIONS_USER_EMAIL="${BEEAPP_USER_EMAIL:-$USER_A_EMAIL}"

REPORT="beeapp_e2e_combined_report.txt"
SUMMARY="beeapp_e2e_combined_summary.txt"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TEST_PREFIX="E2E BeeApp $(date '+%Y%m%d%H%M%S')"
RANGE_START="2026-08-01T00:00:00-05:00"
RANGE_END="2026-09-10T00:00:00-05:00"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Falta el comando requerido: $command_name" >&2
    exit 1
  fi
}

require_command curl
require_command mktemp
require_command realpath

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "ERROR: Falta Python 3 (python3 o python)." >&2
  exit 1
fi

json_pretty() {
  "$PYTHON_BIN" -m json.tool 2>/dev/null || cat
}

json_value() {
  local expression="$1"
  "$PYTHON_BIN" -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    value = $expression
except Exception:
    print('')
    raise SystemExit(0)
if value is None:
    print('')
elif isinstance(value, bool):
    print(str(value).lower())
else:
    print(value)
" 2>/dev/null
}

urlencode() {
  "$PYTHON_BIN" -c "
import sys
import urllib.parse
print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))
"
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
    printf '%s' "$response" | json_pretty
  } >> "$REPORT"

  printf '%-8s | expected=%-16s | actual=%-8s | %s\n' \
    "$result" "$expected_status" "$actual_status" "$label" >> "$SUMMARY"
}

record_assertion() {
  local label="$1"
  local result="$2"
  local detail="${3:-}"

  case "$result" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)) ;;
    SKIP) SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
    *) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
  esac

  {
    echo
    echo "================================================================"
    echo "ASSERTION: $label"
    echo "================================================================"
    echo "result: $result"
    echo "detail: $detail"
  } >> "$REPORT"

  printf '%-8s | %s%s\n' "$result" "$label" "${detail:+ — $detail}" >> "$SUMMARY"
}

api_request() {
  local label="$1"
  local expected_status="$2"
  shift 2

  local body_file actual_status response curl_exit_code result
  body_file="$(mktemp)"

  actual_status="$(curl -sS -o "$body_file" -w '%{http_code}' "$@")"
  curl_exit_code=$?
  response="$(cat "$body_file")"
  rm -f "$body_file"

  if [[ "$curl_exit_code" -ne 0 ]]; then
    result="FAIL"
    actual_status="curl-$curl_exit_code"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  elif [[ "$actual_status" == "$expected_status" ]]; then
    result="PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    result="FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  record_report "$label" "$expected_status" "$actual_status" "$result" "$response"
  printf '%s' "$response"
}

api_request_any_status() {
  local label="$1"
  local allowed_statuses="$2"
  shift 2

  local body_file actual_status response curl_exit_code result allowed_status
  result="FAIL"
  body_file="$(mktemp)"

  actual_status="$(curl -sS -o "$body_file" -w '%{http_code}' "$@")"
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

  record_report "$label" "one-of($allowed_statuses)" "$actual_status" "$result" "$response"
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
  record_assertion "$label" "FAIL" "Esperado=$expected; recibido=$actual"
  return 1
}

assert_no_sensitive_keys() {
  local label="$1"
  local response="$2"
  local result

  result="$(printf '%s' "$response" | "$PYTHON_BIN" -c "
import json
import sys
sensitive_fragments = (
    'access_token', 'refresh_token', 'id_token', 'ciphertext',
    'pkce_verifier', 'client_secret', 'state_hash',
)
def walk(value, path='root'):
    if isinstance(value, dict):
        for key, child in value.items():
            normalized_key = str(key).lower()
            if any(fragment in normalized_key for fragment in sensitive_fragments):
                print(f'SENSITIVE_KEY:{path}.{key}')
                raise SystemExit(1)
            walk(child, f'{path}.{key}')
    elif isinstance(value, list):
        for index, child in enumerate(value):
            walk(child, f'{path}[{index}]')
try:
    walk(json.load(sys.stdin))
except json.JSONDecodeError:
    print('INVALID_JSON')
    raise SystemExit(1)
print('OK')
")"

  if [[ "$result" == "OK" ]]; then
    record_assertion "$label" "PASS"
  else
    record_assertion "$label" "FAIL" "$result"
  fi
}

login() {
  local email="$1"
  local password="$2"
  local payload
  payload="$(EMAIL="$email" PASSWORD="$password" "$PYTHON_BIN" -c "
import json
import os
print(json.dumps({'email': os.environ['EMAIL'], 'password': os.environ['PASSWORD']}))
")"

  api_request "Login: $email" "200" \
    -X POST "$API_BASE/api/accounts/login/" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

cleanup_event() {
  local token="$1" event_id="$2" label="$3"
  [[ -z "$event_id" ]] && return
  api_request_any_status "Cleanup event: $label" "204 404" \
    -X DELETE "$API_BASE/api/calendar/events/$event_id/" \
    -H "Authorization: Bearer $token" >/dev/null
}

cleanup_calendar() {
  local token="$1" calendar_id="$2" label="$3"
  [[ -z "$calendar_id" ]] && return
  api_request_any_status "Cleanup calendar: $label" "204 404" \
    -X DELETE "$API_BASE/api/calendar/calendars/$calendar_id/" \
    -H "Authorization: Bearer $token" >/dev/null
}

cleanup_tag() {
  local token="$1" tag_id="$2" label="$3"
  [[ -z "$tag_id" ]] && return
  api_request_any_status "Cleanup tag: $label" "204 404" \
    -X DELETE "$API_BASE/api/calendar/tags/$tag_id/" \
    -H "Authorization: Bearer $token" >/dev/null
}

json_payload() {
  "$PYTHON_BIN" - "$@" <<'PY'
import json
import sys
print(json.dumps(json.load(sys.stdin)))
PY
}

run_agenda_tests() {
  local login_a_response login_b_response bootstrap_a_response bootstrap_b_response
  local profile_a_response profile_b_response search_by_email_response
  local secondary_calendar_response tag_response timed_event_response all_day_event_response
  local recurrent_event_response duplicate_event_response invited_event_response accepted_event_response
  local share_response

  echo
  echo "============================================================"
  echo "BLOQUE 1/2 — BEEAPP AGENDA E2E"
  echo "============================================================"

  echo "[Agenda 1/18] Health check"
  HEALTH_RESPONSE="$(api_request "Agenda: health check" "200" "$API_BASE/api/health/")"
  HEALTH_STATUS="$(printf '%s' "$HEALTH_RESPONSE" | json_value "data.get('status', '')")"
  assert_equals "Agenda: health payload status" "ok" "$HEALTH_STATUS"

  echo "[Agenda 2/18] Login de ambos usuarios"
  login_a_response="$(login "$USER_A_EMAIL" "$USER_A_PASSWORD")"
  login_b_response="$(login "$USER_B_EMAIL" "$USER_B_PASSWORD")"

  USER_A_TOKEN="$(printf '%s' "$login_a_response" | json_value "data.get('session', {}).get('access_token', '')")"
  USER_A_ID="$(printf '%s' "$login_a_response" | json_value "data.get('user', {}).get('id', '')")"
  USER_B_TOKEN="$(printf '%s' "$login_b_response" | json_value "data.get('session', {}).get('access_token', '')")"
  USER_B_ID="$(printf '%s' "$login_b_response" | json_value "data.get('user', {}).get('id', '')")"

  assert_nonempty "Agenda: User A access token extracted" "$USER_A_TOKEN" || return 1
  assert_nonempty "Agenda: User A ID extracted" "$USER_A_ID" || return 1
  assert_nonempty "Agenda: User B access token extracted" "$USER_B_TOKEN" || return 1
  assert_nonempty "Agenda: User B ID extracted" "$USER_B_ID" || return 1

  echo "[Agenda 3/18] Perfiles y bootstrap"
  profile_a_response="$(api_request "Agenda: User A profile" "200" "$API_BASE/api/accounts/me/" -H "Authorization: Bearer $USER_A_TOKEN")"
  profile_b_response="$(api_request "Agenda: User B profile" "200" "$API_BASE/api/accounts/me/" -H "Authorization: Bearer $USER_B_TOKEN")"
  bootstrap_a_response="$(api_request "Agenda: User A bootstrap" "200" "$API_BASE/api/calendar/bootstrap/?range_start=$RANGE_START&range_end=$RANGE_END" -H "Authorization: Bearer $USER_A_TOKEN")"
  bootstrap_b_response="$(api_request "Agenda: User B bootstrap" "200" "$API_BASE/api/calendar/bootstrap/?range_start=$RANGE_START&range_end=$RANGE_END" -H "Authorization: Bearer $USER_B_TOKEN")"

  USER_A_DEFAULT_CALENDAR_ID="$(printf '%s' "$bootstrap_a_response" | json_value "next((item.get('id', '') for item in data.get('calendars', []) if item.get('is_default') is True and item.get('share_permission') == 'owner'), '')")"
  USER_B_DEFAULT_CALENDAR_ID="$(printf '%s' "$bootstrap_b_response" | json_value "next((item.get('id', '') for item in data.get('calendars', []) if item.get('is_default') is True and item.get('share_permission') == 'owner'), '')")"
  assert_nonempty "Agenda: User A default calendar extracted" "$USER_A_DEFAULT_CALENDAR_ID" || return 1
  assert_nonempty "Agenda: User B default calendar extracted" "$USER_B_DEFAULT_CALENDAR_ID" || return 1

  echo "[Agenda 4/18] Calendarios y preferencias"
  api_request "Agenda: list User A calendars" "200" "$API_BASE/api/calendar/calendars/" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: get User A preferences" "200" "$API_BASE/api/calendar/preferences/" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: update User A preferences" "200" \
    -X PATCH "$API_BASE/api/calendar/preferences/" \
    -H "Authorization: Bearer $USER_A_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"default_view":"agenda","show_weekends":true,"show_declined_events":true,"default_reminders":[{"channel":"push","offset_minutes":15},{"channel":"in_app","offset_minutes":30}]}' >/dev/null

  echo "[Agenda 5/18] Búsqueda de usuarios"
  local user_b_email_encoded
  user_b_email_encoded="$(printf '%s' "$USER_B_EMAIL" | urlencode)"
  search_by_email_response="$(api_request "Agenda: User A searches User B by email" "200" "$API_BASE/api/calendar/users/search/?q=$user_b_email_encoded" -H "Authorization: Bearer $USER_A_TOKEN")"
  api_request "Agenda: User A searches User B by name" "200" "$API_BASE/api/calendar/users/search/?q=Felipe" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: User A searches User B by phone suffix" "200" "$API_BASE/api/calendar/users/search/?q=3058155499" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  local search_result_user_b_id
  search_result_user_b_id="$(printf '%s' "$search_by_email_response" | json_value "data.get('users', [{}])[0].get('user_id', '')")"
  assert_equals "Agenda: search by email returned expected User B" "$USER_B_ID" "$search_result_user_b_id"

  echo "[Agenda 6/18] CRUD de calendario secundario"
  secondary_calendar_response="$(api_request "Agenda: create secondary User A calendar" "201" \
    -X POST "$API_BASE/api/calendar/calendars/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'name':os.environ['TEST_PREFIX']+' Trabajo','description':'Calendario temporal para pruebas E2E.','color':'#2563EB','timezone':'America/Bogota'}))")")"
  SECONDARY_CALENDAR_ID="$(printf '%s' "$secondary_calendar_response" | json_value "data.get('calendar', {}).get('id', '')")"
  assert_nonempty "Agenda: secondary calendar ID extracted" "$SECONDARY_CALENDAR_ID"
  api_request "Agenda: update secondary calendar" "200" \
    -X PATCH "$API_BASE/api/calendar/calendars/$SECONDARY_CALENDAR_ID/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'name':os.environ['TEST_PREFIX']+' Trabajo actualizado','color':'#0891B2'}))")" >/dev/null

  echo "[Agenda 7/18] CRUD de tags"
  tag_response="$(api_request "Agenda: create User A tag" "201" \
    -X POST "$API_BASE/api/calendar/tags/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'name':os.environ['TEST_PREFIX']+' Etiqueta','color':'#9333EA'}))")")"
  TAG_ID="$(printf '%s' "$tag_response" | json_value "data.get('tag', {}).get('id', '')")"
  assert_nonempty "Agenda: calendar tag ID extracted" "$TAG_ID"
  api_request "Agenda: list User A tags" "200" "$API_BASE/api/calendar/tags/" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: update User A tag" "200" \
    -X PATCH "$API_BASE/api/calendar/tags/$TAG_ID/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'name':os.environ['TEST_PREFIX']+' Etiqueta actualizada','color':'#DB2777'}))")" >/dev/null

  echo "[Agenda 8/18] Crear evento horario completo"
  timed_event_response="$(api_request "Agenda: create timed event" "201" \
    -X POST "$API_BASE/api/calendar/events/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" CALENDAR_ID="$USER_A_DEFAULT_CALENDAR_ID" TAG_ID="$TAG_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'calendar_id':os.environ['CALENDAR_ID'],'title':os.environ['TEST_PREFIX']+' Evento horario','description':'Evento E2E con tag, enlace y recordatorios por defecto.','event_kind':'hybrid','custom_type_name':'Prueba automatizada','color':'#6025D2','is_all_day':False,'starts_at':'2026-08-22T14:15:00-05:00','ends_at':'2026-08-22T15:45:00-05:00','starts_on':None,'ends_on':None,'timezone':'America/Bogota','location_name':'Sala E2E','location_address':'Bogotá, Colombia','location_maps_url':None,'is_private':False,'notifications_enabled':True,'tag_ids':[os.environ['TAG_ID']],'conferences':[{'provider':'external','label':'Sala virtual E2E','join_url':'https://example.com/beeapp-agenda-e2e','is_primary':True}]}))")")"
  TIMED_EVENT_ID="$(printf '%s' "$timed_event_response" | json_value "data.get('event', {}).get('id', '')")"
  assert_nonempty "Agenda: timed event ID extracted" "$TIMED_EVENT_ID"
  api_request "Agenda: get timed event detail" "200" "$API_BASE/api/calendar/events/$TIMED_EVENT_ID/" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null

  echo "[Agenda 9/18] Crear evento todo el día"
  all_day_event_response="$(api_request "Agenda: create all-day event" "201" \
    -X POST "$API_BASE/api/calendar/events/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" CALENDAR_ID="$USER_A_DEFAULT_CALENDAR_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'calendar_id':os.environ['CALENDAR_ID'],'title':os.environ['TEST_PREFIX']+' Evento todo el día','description':'Prueba de evento sin horario.','event_kind':'in_person','color':'#059669','is_all_day':True,'starts_at':None,'ends_at':None,'starts_on':'2026-08-26','ends_on':'2026-08-27','timezone':'America/Bogota','location_name':'Bogotá','location_address':'Bogotá, Colombia','location_maps_url':None,'is_private':False,'notifications_enabled':True,'reminders':[{'channel':'push','offset_minutes':60,'all_day_reminder_time':'09:00:00'}]}))")")"
  ALL_DAY_EVENT_ID="$(printf '%s' "$all_day_event_response" | json_value "data.get('event', {}).get('id', '')")"
  assert_nonempty "Agenda: all-day event ID extracted" "$ALL_DAY_EVENT_ID"

  echo "[Agenda 10/18] Crear evento recurrente"
  recurrent_event_response="$(api_request "Agenda: create recurring weekly event" "201" \
    -X POST "$API_BASE/api/calendar/events/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" CALENDAR_ID="$USER_A_DEFAULT_CALENDAR_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'calendar_id':os.environ['CALENDAR_ID'],'title':os.environ['TEST_PREFIX']+' Evento recurrente','description':'Prueba de RRULE semanal.','event_kind':'virtual','color':'#9333EA','is_all_day':False,'starts_at':'2026-08-24T08:30:00-05:00','ends_at':'2026-08-24T09:00:00-05:00','starts_on':None,'ends_on':None,'timezone':'America/Bogota','location_name':None,'location_address':None,'location_maps_url':None,'is_private':False,'notifications_enabled':False,'recurrence':{'rrule':'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO','frequency':'weekly','interval_count':1,'week_days':[1],'timezone':'America/Bogota'}}))")")"
  RECURRENT_EVENT_ID="$(printf '%s' "$recurrent_event_response" | json_value "data.get('event', {}).get('id', '')")"
  assert_nonempty "Agenda: recurring event ID extracted" "$RECURRENT_EVENT_ID"

  echo "[Agenda 11/18] Listado, filtros, búsqueda y conflictos"
  api_request "Agenda: list User A events by range" "200" "$API_BASE/api/calendar/events/?range_start=$RANGE_START&range_end=$RANGE_END" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: filter User A events by tag" "200" "$API_BASE/api/calendar/events/?range_start=$RANGE_START&range_end=$RANGE_END&tag_ids=$TAG_ID" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  local search_event_encoded
  search_event_encoded="$(printf '%s' "$TEST_PREFIX Evento horario" | urlencode)"
  api_request "Agenda: search User A events by title" "200" "$API_BASE/api/calendar/events/?range_start=$RANGE_START&range_end=$RANGE_END&search=$search_event_encoded" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: detect conflict with timed event" "200" "$API_BASE/api/calendar/conflicts/?is_all_day=false&starts_at=2026-08-22T14%3A30%3A00-05%3A00&ends_at=2026-08-22T15%3A00%3A00-05%3A00" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null

  echo "[Agenda 12/18] Editar eventos"
  api_request "Agenda: update timed event schedule" "200" \
    -X PATCH "$API_BASE/api/calendar/events/$TIMED_EVENT_ID/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'title':os.environ['TEST_PREFIX']+' Evento horario actualizado','description':'Evento actualizado durante pruebas E2E.','is_all_day':False,'starts_at':'2026-08-22T16:00:00-05:00','ends_at':'2026-08-22T17:30:00-05:00','starts_on':None,'ends_on':None}))")" >/dev/null
  api_request "Agenda: update all-day event schedule" "200" \
    -X PATCH "$API_BASE/api/calendar/events/$ALL_DAY_EVENT_ID/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d '{"is_all_day":true,"starts_at":null,"ends_at":null,"starts_on":"2026-08-28","ends_on":"2026-08-29"}' >/dev/null

  echo "[Agenda 13/18] Duplicar evento"
  duplicate_event_response="$(api_request "Agenda: duplicate timed event" "201" \
    -X POST "$API_BASE/api/calendar/events/$TIMED_EVENT_ID/duplicate/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d '{"starts_at":"2026-08-31T16:00:00-05:00","ends_at":"2026-08-31T17:30:00-05:00","include_attendees":false,"include_reminders":false,"include_recurrence":false}')"
  DUPLICATE_EVENT_ID="$(printf '%s' "$duplicate_event_response" | json_value "data.get('event', {}).get('id', '')")"
  assert_nonempty "Agenda: duplicate event ID extracted" "$DUPLICATE_EVENT_ID"

  echo "[Agenda 14/18] Invitación y RSVP rechazar"
  invited_event_response="$(api_request "Agenda: create event inviting User B" "201" \
    -X POST "$API_BASE/api/calendar/events/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" CALENDAR_ID="$USER_A_DEFAULT_CALENDAR_ID" USER_B_ID="$USER_B_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'calendar_id':os.environ['CALENDAR_ID'],'title':os.environ['TEST_PREFIX']+' Invitación para RSVP','description':'Prueba RSVP aceptar/rechazar.','event_kind':'virtual','color':'#DC2626','is_all_day':False,'starts_at':'2026-08-27T10:00:00-05:00','ends_at':'2026-08-27T11:00:00-05:00','starts_on':None,'ends_on':None,'timezone':'America/Bogota','location_name':None,'location_address':None,'location_maps_url':None,'is_private':False,'notifications_enabled':True,'attendee_ids':[os.environ['USER_B_ID']]}))")")"
  INVITED_EVENT_ID="$(printf '%s' "$invited_event_response" | json_value "data.get('event', {}).get('id', '')")"
  assert_nonempty "Agenda: invited event ID extracted" "$INVITED_EVENT_ID"
  api_request "Agenda: User B sees invited event in bootstrap" "200" "$API_BASE/api/calendar/bootstrap/?range_start=$RANGE_START&range_end=$RANGE_END" -H "Authorization: Bearer $USER_B_TOKEN" >/dev/null
  api_request "Agenda: User B declines event invitation" "200" \
    -X POST "$API_BASE/api/calendar/events/$INVITED_EVENT_ID/rsvp/" \
    -H "Authorization: Bearer $USER_B_TOKEN" -H "Content-Type: application/json" \
    -d '{"response_status":"declined"}' >/dev/null
  api_request "Agenda: User B hides declined event" "200" \
    -X PATCH "$API_BASE/api/calendar/events/$INVITED_EVENT_ID/declined-visibility/" \
    -H "Authorization: Bearer $USER_B_TOKEN" -H "Content-Type: application/json" \
    -d '{"hidden":true}' >/dev/null
  api_request "Agenda: User B restores declined event visibility" "200" \
    -X PATCH "$API_BASE/api/calendar/events/$INVITED_EVENT_ID/declined-visibility/" \
    -H "Authorization: Bearer $USER_B_TOKEN" -H "Content-Type: application/json" \
    -d '{"hidden":false}' >/dev/null

  echo "[Agenda 15/18] Invitación y RSVP aceptar"
  accepted_event_response="$(api_request "Agenda: create second event inviting User B" "201" \
    -X POST "$API_BASE/api/calendar/events/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(TEST_PREFIX="$TEST_PREFIX" CALENDAR_ID="$USER_A_DEFAULT_CALENDAR_ID" USER_B_ID="$USER_B_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'calendar_id':os.environ['CALENDAR_ID'],'title':os.environ['TEST_PREFIX']+' Invitación aceptada','description':'Prueba de solicitud aprobada.','event_kind':'virtual','color':'#2563EB','is_all_day':False,'starts_at':'2026-08-28T10:00:00-05:00','ends_at':'2026-08-28T11:00:00-05:00','starts_on':None,'ends_on':None,'timezone':'America/Bogota','location_name':None,'location_address':None,'location_maps_url':None,'is_private':False,'notifications_enabled':True,'attendee_ids':[os.environ['USER_B_ID']]}))")")"
  ACCEPTED_EVENT_ID="$(printf '%s' "$accepted_event_response" | json_value "data.get('event', {}).get('id', '')")"
  assert_nonempty "Agenda: accepted event ID extracted" "$ACCEPTED_EVENT_ID"
  api_request "Agenda: User B accepts second invitation" "200" \
    -X POST "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/rsvp/" \
    -H "Authorization: Bearer $USER_B_TOKEN" -H "Content-Type: application/json" \
    -d '{"response_status":"accepted"}' >/dev/null
  api_request "Agenda: User B requests existing organizer (validation)" "400" \
    -X POST "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/invitee-requests/" \
    -H "Authorization: Bearer $USER_B_TOKEN" -H "Content-Type: application/json" \
    -d "$(USER_A_ID="$USER_A_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'requested_user_id':os.environ['USER_A_ID'],'note':'El organizador ya existe; esta prueba debe fallar.'}))")" >/dev/null
  api_request "Agenda: User A lists invitee requests" "200" "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/invitee-requests/" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null

  echo "[Agenda 16/18] Expulsar asistente"
  api_request "Agenda: User A removes User B" "200" \
    -X DELETE "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/attendees/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(USER_B_ID="$USER_B_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'attendee_user_id':os.environ['USER_B_ID']}))")" >/dev/null

  echo "[Agenda 17/18] Compartir calendario"
  share_response="$(api_request "Agenda: User A shares secondary calendar" "201" \
    -X POST "$API_BASE/api/calendar/calendars/$SECONDARY_CALENDAR_ID/shares/" \
    -H "Authorization: Bearer $USER_A_TOKEN" -H "Content-Type: application/json" \
    -d "$(USER_B_ID="$USER_B_ID" "$PYTHON_BIN" -c "import json,os; print(json.dumps({'shared_with_user_id':os.environ['USER_B_ID'],'permission':'viewer'}))")")"
  SHARE_ID="$(printf '%s' "$share_response" | json_value "data.get('share', {}).get('id', '')")"
  assert_nonempty "Agenda: calendar share ID extracted" "$SHARE_ID"
  api_request "Agenda: User A lists shares" "200" "$API_BASE/api/calendar/calendars/$SECONDARY_CALENDAR_ID/shares/" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: User B accepts calendar share" "200" -X POST "$API_BASE/api/calendar/calendar-shares/$SHARE_ID/accept/" -H "Authorization: Bearer $USER_B_TOKEN" >/dev/null
  api_request "Agenda: User B lists calendars after share" "200" "$API_BASE/api/calendar/calendars/" -H "Authorization: Bearer $USER_B_TOKEN" >/dev/null
  api_request "Agenda: User A revokes calendar share" "200" -X POST "$API_BASE/api/calendar/calendar-shares/$SHARE_ID/revoke/" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null

  echo "[Agenda 18/18] Notificaciones y limpieza"
  api_request "Agenda: list User A calendar notifications" "200" "$API_BASE/api/notifications/?module=calendar&unread_only=false&limit=100" -H "Authorization: Bearer $USER_A_TOKEN" >/dev/null
  api_request "Agenda: list User B calendar notifications" "200" "$API_BASE/api/notifications/?module=calendar&unread_only=false&limit=100" -H "Authorization: Bearer $USER_B_TOKEN" >/dev/null

  cleanup_event "$USER_A_TOKEN" "${INVITED_EVENT_ID:-}" "RSVP declined event"
  cleanup_event "$USER_A_TOKEN" "${ACCEPTED_EVENT_ID:-}" "accepted invitation event"
  cleanup_event "$USER_A_TOKEN" "${DUPLICATE_EVENT_ID:-}" "duplicate event"
  cleanup_event "$USER_A_TOKEN" "${RECURRENT_EVENT_ID:-}" "recurring event"
  cleanup_event "$USER_A_TOKEN" "${ALL_DAY_EVENT_ID:-}" "all-day event"
  cleanup_event "$USER_A_TOKEN" "${TIMED_EVENT_ID:-}" "timed event"
  cleanup_calendar "$USER_A_TOKEN" "${SECONDARY_CALENDAR_ID:-}" "secondary test calendar"
  cleanup_tag "$USER_A_TOKEN" "${TAG_ID:-}" "test tag"
}

run_integrations_tests() {
  local login_response catalog_response connections_response google_auth_response
  local google_status google_auth_url google_request_id google_expires_at
  local connection_id detail_response reauth_response disconnected_detail_response
  local detail_provider detail_status detail_email reauth_url disconnected_status

  echo
  echo "============================================================"
  echo "BLOQUE 2/2 — BEEAPP INTEGRACIONES E2E"
  echo "============================================================"

  echo "[Integraciones 1/9] Health check"
  HEALTH_RESPONSE="$(api_request "Integrations: health check" "200" "$API_BASE/api/health/")"
  HEALTH_STATUS="$(printf '%s' "$HEALTH_RESPONSE" | json_value "data.get('status', '')")"
  assert_equals "Integrations: health payload status" "ok" "$HEALTH_STATUS"

  echo "[Integraciones 2/9] Login"
  login_response="$(login "$INTEGRATIONS_USER_EMAIL" "$INTEGRATIONS_USER_PASSWORD")"
  INTEGRATIONS_ACCESS_TOKEN="$(printf '%s' "$login_response" | json_value "data.get('session', {}).get('access_token', '')")"
  assert_nonempty "Integrations: access token extracted" "$INTEGRATIONS_ACCESS_TOKEN" || return 1

  echo "[Integraciones 3/9] Seguridad sin credenciales"
  api_request "Integrations: catalog without credentials" "401" "$API_BASE/api/integrations/catalog/" >/dev/null
  api_request "Integrations: connections without credentials" "401" "$API_BASE/api/integrations/connections/" >/dev/null
  api_request "Integrations: Google authorization without credentials" "401" \
    -X POST "$API_BASE/api/integrations/connections/google/authorize/" \
    -H "Content-Type: application/json" -d '{"capabilities":[]}' >/dev/null

  echo "[Integraciones 4/9] Catálogo"
  catalog_response="$(api_request "Integrations: integration catalog" "200" "$API_BASE/api/integrations/catalog/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
  google_status="$(printf '%s' "$catalog_response" | json_value "next((item.get('status', '') for item in data.get('providers', []) if item.get('id') == 'google'), '')")"
  assert_equals "Integrations: Google appears as available" "available" "$google_status"
  assert_no_sensitive_keys "Integrations: catalog does not expose secrets" "$catalog_response"

  echo "[Integraciones 5/9] Lista segura de conexiones"
  connections_response="$(api_request "Integrations: connection list" "200" "$API_BASE/api/integrations/connections/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
  assert_no_sensitive_keys "Integrations: connection list does not expose tokens" "$connections_response"

  echo "[Integraciones 6/9] Validaciones"
  api_request "Integrations: Microsoft authorization unavailable" "400" \
    -X POST "$API_BASE/api/integrations/connections/microsoft/authorize/" \
    -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN" -H "Content-Type: application/json" \
    -d '{"capabilities":[]}' >/dev/null
  api_request "Integrations: Google capabilities must be an array" "400" \
    -X POST "$API_BASE/api/integrations/connections/google/authorize/" \
    -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN" -H "Content-Type: application/json" \
    -d '{"capabilities":"calendar"}' >/dev/null

  echo "[Integraciones 7/9] Inicio OAuth Google"
  google_auth_response="$(api_request "Integrations: start Google OAuth authorization" "201" \
    -X POST "$API_BASE/api/integrations/connections/google/authorize/" \
    -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN" -H "Content-Type: application/json" \
    -d '{"capabilities":[]}')"
  google_auth_url="$(printf '%s' "$google_auth_response" | json_value "data.get('authorization_url', '')")"
  google_request_id="$(printf '%s' "$google_auth_response" | json_value "data.get('request_id', '')")"
  google_expires_at="$(printf '%s' "$google_auth_response" | json_value "data.get('expires_at', '')")"
  assert_nonempty "Integrations: Google authorization URL extracted" "$google_auth_url"
  assert_nonempty "Integrations: Google OAuth request ID extracted" "$google_request_id"
  assert_nonempty "Integrations: Google OAuth expiration extracted" "$google_expires_at"
  if [[ "$google_auth_url" == https://accounts.google.com/* ]]; then
    record_assertion "Integrations: Google authorization endpoint is official" "PASS"
  else
    record_assertion "Integrations: Google authorization endpoint is official" "FAIL" "Expected https://accounts.google.com/"
  fi

  echo "[Integraciones 8/9] Callback OAuth inválido"
  api_request_any_status "Integrations: callback without parameters redirects safely" "301 302" "$API_BASE/api/integrations/oauth/callback/google/" >/dev/null
  api_request_any_status "Integrations: callback invalid state redirects safely" "301 302" "$API_BASE/api/integrations/oauth/callback/google/?code=fake-code&state=invalid-state" >/dev/null

  echo "[Integraciones 9/9] OAuth real, detalle, reautorización y desconexión"
  echo "Para comprobar el guardado real de tokens, debes autorizar Google."
  read -r -p "¿Abrir Google OAuth ahora? [y/N]: " RUN_GOOGLE_OAUTH

  connection_id=""
  if [[ "$RUN_GOOGLE_OAUTH" =~ ^[Yy]$ ]]; then
    echo "Abriendo navegador. Inicia sesión con un Test user de Google."
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$google_auth_url" >/dev/null 2>&1 || record_assertion "Integrations: open Google OAuth automatically" "SKIP" "No fue posible abrir el navegador; abre la URL manualmente."
    else
      record_assertion "Integrations: open Google OAuth automatically" "SKIP" "xdg-open no está instalado; abre la URL manualmente."
      echo "URL OAuth: $google_auth_url"
    fi

    read -r -p "Después de completar Google OAuth, presiona Enter... " _
    connections_response="$(api_request "Integrations: list connections after Google OAuth" "200" "$API_BASE/api/integrations/connections/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
    connection_id="$(printf '%s' "$connections_response" | json_value "next((item.get('id', '') for item in data.get('connections', []) if item.get('provider') == 'google' and item.get('status') == 'connected'), '')")"
    assert_nonempty "Integrations: connected Google connection ID exists" "$connection_id"
    assert_no_sensitive_keys "Integrations: connections after OAuth do not expose tokens" "$connections_response"

    if [[ -n "$connection_id" ]]; then
      detail_response="$(api_request "Integrations: Google connection detail" "200" "$API_BASE/api/integrations/connections/$connection_id/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
      detail_provider="$(printf '%s' "$detail_response" | json_value "data.get('connection', {}).get('provider', '')")"
      detail_status="$(printf '%s' "$detail_response" | json_value "data.get('connection', {}).get('status', '')")"
      detail_email="$(printf '%s' "$detail_response" | json_value "data.get('connection', {}).get('provider_email', '')")"
      assert_equals "Integrations: connected provider is Google" "google" "$detail_provider"
      assert_equals "Integrations: connected status is persisted" "connected" "$detail_status"
      assert_nonempty "Integrations: Google account email is persisted" "$detail_email"
      assert_no_sensitive_keys "Integrations: connection detail does not expose tokens" "$detail_response"

      reauth_response="$(api_request "Integrations: start Google reauthorization" "201" \
        -X POST "$API_BASE/api/integrations/connections/$connection_id/reauthorize/" \
        -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN" -H "Content-Type: application/json" \
        -d '{"capabilities":[]}')"
      reauth_url="$(printf '%s' "$reauth_response" | json_value "data.get('authorization_url', '')")"
      assert_nonempty "Integrations: reauthorization URL extracted" "$reauth_url"
      if [[ "$reauth_url" == https://accounts.google.com/* ]]; then
        record_assertion "Integrations: reauthorization endpoint is official Google" "PASS"
      else
        record_assertion "Integrations: reauthorization endpoint is official Google" "FAIL"
      fi

      read -r -p "¿Deseas desconectar la cuenta Google de prueba? [y/N]: " RUN_DISCONNECT
      if [[ "$RUN_DISCONNECT" =~ ^[Yy]$ ]]; then
        api_request "Integrations: disconnect Google connection" "204" \
          -X DELETE "$API_BASE/api/integrations/connections/$connection_id/" \
          -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN" >/dev/null
        disconnected_detail_response="$(api_request "Integrations: get disconnected detail" "200" "$API_BASE/api/integrations/connections/$connection_id/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
        disconnected_status="$(printf '%s' "$disconnected_detail_response" | json_value "data.get('connection', {}).get('status', '')")"
        assert_equals "Integrations: disconnected status is persisted" "disconnected" "$disconnected_status"
      else
        record_assertion "Integrations: disconnect endpoint" "SKIP" "La conexión se conserva para pruebas posteriores"
      fi
    fi
  else
    record_assertion "Integrations: OAuth real, persisted tokens, detail and reauthorization" "SKIP" "El usuario eligió no iniciar Google OAuth"
  fi
}

write_final_summary() {
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
}

{
  echo "BEEAPP — COMBINED E2E API TEST REPORT"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "API_BASE: $API_BASE"
  echo "Agenda User A: $USER_A_EMAIL"
  echo "Agenda User B: $USER_B_EMAIL"
  echo "Integrations User: $INTEGRATIONS_USER_EMAIL"
  echo "Test prefix: $TEST_PREFIX"
  echo "Passwords, tokens, OAuth codes and states are not recorded."
} > "$REPORT"

{
  echo "BEEAPP — COMBINED E2E API TEST SUMMARY"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "================================================================"
} > "$SUMMARY"

echo "============================================================"
echo "BEEAPP — SUITE E2E COMBINADA"
echo "API: $API_BASE"
echo "Orden: Agenda -> Integraciones"
echo "============================================================"

echo
read -r -s -p "Password para User A ($USER_A_EMAIL): " USER_A_PASSWORD
echo
read -r -s -p "Password para User B ($USER_B_EMAIL): " USER_B_PASSWORD
echo

if [[ "$INTEGRATIONS_USER_EMAIL" == "$USER_A_EMAIL" ]]; then
  INTEGRATIONS_USER_PASSWORD="$USER_A_PASSWORD"
  echo "Integraciones usará la contraseña de User A ($INTEGRATIONS_USER_EMAIL)."
elif [[ "$INTEGRATIONS_USER_EMAIL" == "$USER_B_EMAIL" ]]; then
  INTEGRATIONS_USER_PASSWORD="$USER_B_PASSWORD"
  echo "Integraciones usará la contraseña de User B ($INTEGRATIONS_USER_EMAIL)."
else
  read -r -s -p "Password para Integraciones ($INTEGRATIONS_USER_EMAIL): " INTEGRATIONS_USER_PASSWORD
  echo
fi

# No se usa `set -e`: se continúa para obtener el reporte completo,
# aun cuando alguna solicitud individual falle.
run_agenda_tests || record_assertion "Agenda: precondiciones críticas" "FAIL" "No fue posible continuar todas las pruebas de Agenda"
run_integrations_tests || record_assertion "Integrations: precondiciones críticas" "FAIL" "No fue posible continuar todas las pruebas de Integraciones"

write_final_summary

echo
echo "============================================================"
echo "SUITE E2E COMBINADA TERMINADA"
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
