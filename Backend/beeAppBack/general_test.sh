#!/usr/bin/env bash
set -u
set -o pipefail

API_BASE="${BEEAPP_API:-http://127.0.0.1:8000}"
USER_A_EMAIL="${BEEAPP_USER_A_EMAIL:-andres.santa-fe@hotmail.com}"
USER_B_EMAIL="${BEEAPP_USER_B_EMAIL:-andresFelipeMendozaSilva@hotmail.com}"
REPORT="agenda_api_test_report.txt"
SUMMARY="agenda_api_test_summary.txt"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TEST_PREFIX="E2E Agenda $(date '+%Y%m%d%H%M%S')"
NOW_LABEL="$(date '+%H:%M:%S')"

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

read -r -s -p "Password para User A ($USER_A_EMAIL): " USER_A_PASSWORD
echo
read -r -s -p "Password para User B ($USER_B_EMAIL): " USER_B_PASSWORD
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
else:
    print(value)
" 2>/dev/null
}

json_has_key() {
  local key="$1"

  python -c "
import json
import sys

data = json.load(sys.stdin)
sys.exit(0 if '$key' in data else 1)
" 2>/dev/null
}

urlencode() {
  python -c "
import sys
import urllib.parse

print(urllib.parse.quote(sys.stdin.read().strip()))
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
    echo "$response" | json_pretty
  } >> "$REPORT"

  {
    printf '%-8s | expected=%-12s | actual=%-4s | %s\n' \
      "$result" \
      "$expected_status" \
      "$actual_status" \
      "$label"
  } >> "$SUMMARY"
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

skip_test() {
  local label="$1"
  local reason="$2"

  SKIP_COUNT=$((SKIP_COUNT + 1))

  {
    echo
    echo "================================================================"
    echo "TEST: $label"
    echo "================================================================"
    echo "result: SKIP"
    echo "reason: $reason"
  } >> "$REPORT"

  printf '%-8s | %s\n' "SKIP" "$label — $reason" >> "$SUMMARY"
}

assert_nonempty() {
  local label="$1"
  local value="$2"

  if [[ -n "$value" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    printf '%-8s | %s\n' "PASS" "$label" >> "$SUMMARY"
    return 0
  fi

  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf '%-8s | %s\n' "FAIL" "$label" >> "$SUMMARY"
  return 1
}

login() {
  local email="$1"
  local password="$2"

  api_request \
    "Login: $email" \
    "200" \
    -X POST \
    "$API_BASE/api/accounts/login/" \
    -H "Content-Type: application/json" \
    -d "$(python - <<PY
import json

print(json.dumps({
    "email": "$email",
    "password": "$password",
}))
PY
)"
}

make_json() {
  python - "$@" <<'PY'
import json
import sys

print(json.dumps(json.loads(sys.stdin.read())))
PY
}

cleanup_event() {
  local token="$1"
  local event_id="$2"
  local label="$3"

  if [[ -z "$event_id" ]]; then
    return
  fi

  api_request_any_status \
    "Cleanup event: $label" \
    "204 404" \
    -X DELETE \
    "$API_BASE/api/calendar/events/$event_id/" \
    -H "Authorization: Bearer $token" \
    >/dev/null
}

cleanup_calendar() {
  local token="$1"
  local calendar_id="$2"
  local label="$3"

  if [[ -z "$calendar_id" ]]; then
    return
  fi

  api_request_any_status \
    "Cleanup calendar: $label" \
    "204 404" \
    -X DELETE \
    "$API_BASE/api/calendar/calendars/$calendar_id/" \
    -H "Authorization: Bearer $token" \
    >/dev/null
}

cleanup_tag() {
  local token="$1"
  local tag_id="$2"
  local label="$3"

  if [[ -z "$tag_id" ]]; then
    return
  fi

  api_request_any_status \
    "Cleanup tag: $label" \
    "204 404" \
    -X DELETE \
    "$API_BASE/api/calendar/tags/$tag_id/" \
    -H "Authorization: Bearer $token" \
    >/dev/null
}

{
  echo "BEEAPP — AGENDA E2E API TEST REPORT"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "API_BASE: $API_BASE"
  echo "User A: $USER_A_EMAIL"
  echo "User B: $USER_B_EMAIL"
  echo "Test prefix: $TEST_PREFIX"
  echo "Passwords are intentionally not recorded."
} > "$REPORT"

{
  echo "BEEAPP — AGENDA E2E API TEST SUMMARY"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "================================================================"
} > "$SUMMARY"

echo "============================================================"
echo "BEEAPP AGENDA — PRUEBAS END-TO-END"
echo "API: $API_BASE"
echo "Prefijo de prueba: $TEST_PREFIX"
echo "============================================================"

echo
echo "[1/18] Health check"

HEALTH_RESPONSE="$(api_request \
  "Health check" \
  "200" \
  "$API_BASE/api/health/"
)"

echo "$HEALTH_RESPONSE" | json_pretty

echo
echo "[2/18] Login de ambos usuarios"

LOGIN_A_RESPONSE="$(login "$USER_A_EMAIL" "$USER_A_PASSWORD")"
LOGIN_B_RESPONSE="$(login "$USER_B_EMAIL" "$USER_B_PASSWORD")"

export USER_A_TOKEN="$(
  echo "$LOGIN_A_RESPONSE" \
  | json_value "data.get('session', {}).get('access_token', '')"
)"

export USER_A_ID="$(
  echo "$LOGIN_A_RESPONSE" \
  | json_value "data.get('user', {}).get('id', '')"
)"

export USER_B_TOKEN="$(
  echo "$LOGIN_B_RESPONSE" \
  | json_value "data.get('session', {}).get('access_token', '')"
)"

export USER_B_ID="$(
  echo "$LOGIN_B_RESPONSE" \
  | json_value "data.get('user', {}).get('id', '')"
)"

assert_nonempty "User A access token extracted" "$USER_A_TOKEN" || exit 1
assert_nonempty "User A ID extracted" "$USER_A_ID" || exit 1
assert_nonempty "User B access token extracted" "$USER_B_TOKEN" || exit 1
assert_nonempty "User B ID extracted" "$USER_B_ID" || exit 1

RANGE_START="2026-08-01T00:00:00-05:00"
RANGE_END="2026-09-10T00:00:00-05:00"

echo
echo "[3/18] Perfiles y bootstrap"

PROFILE_A_RESPONSE="$(api_request \
  "User A profile" \
  "200" \
  "$API_BASE/api/accounts/me/" \
  -H "Authorization: Bearer $USER_A_TOKEN"
)"

PROFILE_B_RESPONSE="$(api_request \
  "User B profile" \
  "200" \
  "$API_BASE/api/accounts/me/" \
  -H "Authorization: Bearer $USER_B_TOKEN"
)"

BOOTSTRAP_A_RESPONSE="$(api_request \
  "User A bootstrap" \
  "200" \
  "$API_BASE/api/calendar/bootstrap/?range_start=$RANGE_START&range_end=$RANGE_END" \
  -H "Authorization: Bearer $USER_A_TOKEN"
)"

BOOTSTRAP_B_RESPONSE="$(api_request \
  "User B bootstrap" \
  "200" \
  "$API_BASE/api/calendar/bootstrap/?range_start=$RANGE_START&range_end=$RANGE_END" \
  -H "Authorization: Bearer $USER_B_TOKEN"
)"

export USER_A_DEFAULT_CALENDAR_ID="$(
  echo "$BOOTSTRAP_A_RESPONSE" \
  | python -c "
import json
import sys

data = json.load(sys.stdin)
calendar = next(
    (
        item
        for item in data.get('calendars', [])
        if item.get('is_default') is True
        and item.get('share_permission') == 'owner'
    ),
    None,
)
print(calendar['id'] if calendar else '')
"
)"

export USER_B_DEFAULT_CALENDAR_ID="$(
  echo "$BOOTSTRAP_B_RESPONSE" \
  | python -c "
import json
import sys

data = json.load(sys.stdin)
calendar = next(
    (
        item
        for item in data.get('calendars', [])
        if item.get('is_default') is True
        and item.get('share_permission') == 'owner'
    ),
    None,
)
print(calendar['id'] if calendar else '')
"
)"

assert_nonempty \
  "User A default calendar extracted" \
  "$USER_A_DEFAULT_CALENDAR_ID" || exit 1

assert_nonempty \
  "User B default calendar extracted" \
  "$USER_B_DEFAULT_CALENDAR_ID" || exit 1

echo
echo "[4/18] Listado de calendarios y preferencias"

api_request \
  "List User A calendars" \
  "200" \
  "$API_BASE/api/calendar/calendars/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

api_request \
  "Get User A preferences" \
  "200" \
  "$API_BASE/api/calendar/preferences/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

PREFERENCES_UPDATE_RESPONSE="$(api_request \
  "Update User A preferences" \
  "200" \
  -X PATCH \
  "$API_BASE/api/calendar/preferences/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "default_view": "agenda",
    "show_weekends": true,
    "show_declined_events": true,
    "default_reminders": [
      {
        "channel": "push",
        "offset_minutes": 15
      },
      {
        "channel": "in_app",
        "offset_minutes": 30
      }
    ]
  }'
)"

echo
echo "[5/18] Búsqueda de usuarios por correo, teléfono y nombre"

USER_B_EMAIL_ENCODED="$(
  printf '%s' "$USER_B_EMAIL" | urlencode
)"

SEARCH_BY_EMAIL_RESPONSE="$(api_request \
  "User A searches User B by email" \
  "200" \
  "$API_BASE/api/calendar/users/search/?q=$USER_B_EMAIL_ENCODED" \
  -H "Authorization: Bearer $USER_A_TOKEN"
)"

SEARCH_BY_NAME_RESPONSE="$(api_request \
  "User A searches User B by name" \
  "200" \
  "$API_BASE/api/calendar/users/search/?q=Felipe" \
  -H "Authorization: Bearer $USER_A_TOKEN"
)"

SEARCH_BY_PHONE_RESPONSE="$(api_request \
  "User A searches User B by phone suffix" \
  "200" \
  "$API_BASE/api/calendar/users/search/?q=3058155499" \
  -H "Authorization: Bearer $USER_A_TOKEN"
)"

SEARCH_RESULT_USER_B_ID="$(
  echo "$SEARCH_BY_EMAIL_RESPONSE" \
  | json_value "data.get('users', [{}])[0].get('user_id', '')"
)"

if [[ "$SEARCH_RESULT_USER_B_ID" == "$USER_B_ID" ]]; then
  PASS_COUNT=$((PASS_COUNT + 1))
  printf '%-8s | Search by email returned expected User B\n' \
    "PASS" >> "$SUMMARY"
else
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf '%-8s | Search by email did not return expected User B\n' \
    "FAIL" >> "$SUMMARY"
fi

echo
echo "[6/18] CRUD de calendario secundario"

SECONDARY_CALENDAR_RESPONSE="$(api_request \
  "Create secondary User A calendar" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/calendars/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json
print(json.dumps({
    "name": "$TEST_PREFIX Trabajo",
    "description": "Calendario temporal para pruebas E2E.",
    "color": "#2563EB",
    "timezone": "America/Bogota",
}))
PY
)"
)"

export SECONDARY_CALENDAR_ID="$(
  echo "$SECONDARY_CALENDAR_RESPONSE" \
  | json_value "data.get('calendar', {}).get('id', '')"
)"

assert_nonempty \
  "Secondary calendar ID extracted" \
  "$SECONDARY_CALENDAR_ID"

api_request \
  "Update secondary calendar" \
  "200" \
  -X PATCH \
  "$API_BASE/api/calendar/calendars/$SECONDARY_CALENDAR_ID/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json
print(json.dumps({
    "name": "$TEST_PREFIX Trabajo actualizado",
    "color": "#0891B2",
}))
PY
)" \
  >/dev/null

echo
echo "[7/18] CRUD de tags"

TAG_RESPONSE="$(api_request \
  "Create User A tag" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/tags/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json
print(json.dumps({
    "name": "$TEST_PREFIX Etiqueta",
    "color": "#9333EA",
}))
PY
)"
)"

export TAG_ID="$(
  echo "$TAG_RESPONSE" \
  | json_value "data.get('tag', {}).get('id', '')"
)"

assert_nonempty "Calendar tag ID extracted" "$TAG_ID"

api_request \
  "List User A tags" \
  "200" \
  "$API_BASE/api/calendar/tags/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

api_request \
  "Update User A tag" \
  "200" \
  -X PATCH \
  "$API_BASE/api/calendar/tags/$TAG_ID/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json
print(json.dumps({
    "name": "$TEST_PREFIX Etiqueta actualizada",
    "color": "#DB2777",
}))
PY
)" \
  >/dev/null

echo
echo "[8/18] Crear evento horario completo"

TIMED_EVENT_RESPONSE="$(api_request \
  "Create timed event with tag, conference and default reminders" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/events/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json

print(json.dumps({
    "calendar_id": "$USER_A_DEFAULT_CALENDAR_ID",
    "title": "$TEST_PREFIX Evento horario",
    "description": "Evento E2E con tag, enlace y recordatorios por defecto.",
    "event_kind": "hybrid",
    "custom_type_name": "Prueba automatizada",
    "color": "#6025D2",
    "is_all_day": False,
    "starts_at": "2026-08-22T14:15:00-05:00",
    "ends_at": "2026-08-22T15:45:00-05:00",
    "starts_on": None,
    "ends_on": None,
    "timezone": "America/Bogota",
    "location_name": "Sala E2E",
    "location_address": "Bogotá, Colombia",
    "location_maps_url": None,
    "is_private": False,
    "notifications_enabled": True,
    "tag_ids": ["$TAG_ID"],
    "conferences": [
        {
            "provider": "external",
            "label": "Sala virtual E2E",
            "join_url": "https://example.com/beeapp-agenda-e2e",
            "is_primary": True
        }
    ]
}))
PY
)"
)"

export TIMED_EVENT_ID="$(
  echo "$TIMED_EVENT_RESPONSE" \
  | json_value "data.get('event', {}).get('id', '')"
)"

assert_nonempty "Timed event ID extracted" "$TIMED_EVENT_ID"

TIMED_EVENT_DETAIL_RESPONSE="$(api_request \
  "Get timed event detail" \
  "200" \
  "$API_BASE/api/calendar/events/$TIMED_EVENT_ID/" \
  -H "Authorization: Bearer $USER_A_TOKEN"
)"

echo
echo "[9/18] Crear evento todo el día"

ALL_DAY_EVENT_RESPONSE="$(api_request \
  "Create all-day event with explicit reminder" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/events/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json

print(json.dumps({
    "calendar_id": "$USER_A_DEFAULT_CALENDAR_ID",
    "title": "$TEST_PREFIX Evento todo el día",
    "description": "Prueba de evento sin horario.",
    "event_kind": "in_person",
    "color": "#059669",
    "is_all_day": True,
    "starts_at": None,
    "ends_at": None,
    "starts_on": "2026-08-26",
    "ends_on": "2026-08-27",
    "timezone": "America/Bogota",
    "location_name": "Bogotá",
    "location_address": "Bogotá, Colombia",
    "location_maps_url": None,
    "is_private": False,
    "notifications_enabled": True,
    "reminders": [
        {
            "channel": "push",
            "offset_minutes": 60,
            "all_day_reminder_time": "09:00:00"
        }
    ]
}))
PY
)"
)"

export ALL_DAY_EVENT_ID="$(
  echo "$ALL_DAY_EVENT_RESPONSE" \
  | json_value "data.get('event', {}).get('id', '')"
)"

assert_nonempty "All-day event ID extracted" "$ALL_DAY_EVENT_ID"

echo
echo "[10/18] Crear evento recurrente"

RECURRENT_EVENT_RESPONSE="$(api_request \
  "Create recurring weekly event" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/events/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json

print(json.dumps({
    "calendar_id": "$USER_A_DEFAULT_CALENDAR_ID",
    "title": "$TEST_PREFIX Evento recurrente",
    "description": "Prueba de RRULE semanal.",
    "event_kind": "virtual",
    "color": "#9333EA",
    "is_all_day": False,
    "starts_at": "2026-08-24T08:30:00-05:00",
    "ends_at": "2026-08-24T09:00:00-05:00",
    "starts_on": None,
    "ends_on": None,
    "timezone": "America/Bogota",
    "location_name": None,
    "location_address": None,
    "location_maps_url": None,
    "is_private": False,
    "notifications_enabled": False,
    "recurrence": {
        "rrule": "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO",
        "frequency": "weekly",
        "interval_count": 1,
        "week_days": [1],
        "timezone": "America/Bogota"
    }
}))
PY
)"
)"

export RECURRENT_EVENT_ID="$(
  echo "$RECURRENT_EVENT_RESPONSE" \
  | json_value "data.get('event', {}).get('id', '')"
)"

assert_nonempty "Recurring event ID extracted" "$RECURRENT_EVENT_ID"

echo
echo "[11/18] Listado, filtros, búsqueda y conflictos"

api_request \
  "List User A events by range" \
  "200" \
  "$API_BASE/api/calendar/events/?range_start=$RANGE_START&range_end=$RANGE_END" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

api_request \
  "Filter User A events by tag" \
  "200" \
  "$API_BASE/api/calendar/events/?range_start=$RANGE_START&range_end=$RANGE_END&tag_ids=$TAG_ID" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

SEARCH_EVENT_ENCODED="$(
  printf '%s' "$TEST_PREFIX Evento horario" | urlencode
)"

api_request \
  "Search User A events by title" \
  "200" \
  "$API_BASE/api/calendar/events/?range_start=$RANGE_START&range_end=$RANGE_END&search=$SEARCH_EVENT_ENCODED" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

api_request \
  "Detect conflict with timed event" \
  "200" \
  "$API_BASE/api/calendar/conflicts/?is_all_day=false&starts_at=2026-08-22T14%3A30%3A00-05%3A00&ends_at=2026-08-22T15%3A00%3A00-05%3A00" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

echo
echo "[12/18] Editar evento y verificar reprogramación"

EDIT_TIMED_EVENT_RESPONSE="$(api_request \
  "Update timed event schedule and description" \
  "200" \
  -X PATCH \
  "$API_BASE/api/calendar/events/$TIMED_EVENT_ID/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json

print(json.dumps({
    "title": "$TEST_PREFIX Evento horario actualizado",
    "description": "Evento actualizado durante pruebas E2E.",
    "is_all_day": False,
    "starts_at": "2026-08-22T16:00:00-05:00",
    "ends_at": "2026-08-22T17:30:00-05:00",
    "starts_on": None,
    "ends_on": None
}))
PY
)"
)"

EDIT_ALL_DAY_EVENT_RESPONSE="$(api_request \
  "Update all-day event schedule" \
  "200" \
  -X PATCH \
  "$API_BASE/api/calendar/events/$ALL_DAY_EVENT_ID/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_all_day": true,
    "starts_at": null,
    "ends_at": null,
    "starts_on": "2026-08-28",
    "ends_on": "2026-08-29"
  }'
)"

echo
echo "[13/18] Duplicar eventos"

DUPLICATE_EVENT_RESPONSE="$(api_request \
  "Duplicate timed event without attendees or recurrence" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/events/$TIMED_EVENT_ID/duplicate/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "starts_at": "2026-08-31T16:00:00-05:00",
    "ends_at": "2026-08-31T17:30:00-05:00",
    "include_attendees": false,
    "include_reminders": false,
    "include_recurrence": false
  }'
)"

export DUPLICATE_EVENT_ID="$(
  echo "$DUPLICATE_EVENT_RESPONSE" \
  | json_value "data.get('event', {}).get('id', '')"
)"

assert_nonempty "Duplicate event ID extracted" "$DUPLICATE_EVENT_ID"

echo
echo "[14/18] Invitación, RSVP rechazar y ocultar"

INVITED_EVENT_RESPONSE="$(api_request \
  "Create event inviting User B" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/events/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json

print(json.dumps({
    "calendar_id": "$USER_A_DEFAULT_CALENDAR_ID",
    "title": "$TEST_PREFIX Invitación para RSVP",
    "description": "Prueba RSVP aceptar/rechazar.",
    "event_kind": "virtual",
    "color": "#DC2626",
    "is_all_day": False,
    "starts_at": "2026-08-27T10:00:00-05:00",
    "ends_at": "2026-08-27T11:00:00-05:00",
    "starts_on": None,
    "ends_on": None,
    "timezone": "America/Bogota",
    "location_name": None,
    "location_address": None,
    "location_maps_url": None,
    "is_private": False,
    "notifications_enabled": True,
    "attendee_ids": ["$USER_B_ID"]
}))
PY
)"
)"

export INVITED_EVENT_ID="$(
  echo "$INVITED_EVENT_RESPONSE" \
  | json_value "data.get('event', {}).get('id', '')"
)"

assert_nonempty "Invited event ID extracted" "$INVITED_EVENT_ID"

api_request \
  "User B sees invited event in bootstrap" \
  "200" \
  "$API_BASE/api/calendar/bootstrap/?range_start=$RANGE_START&range_end=$RANGE_END" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  >/dev/null

RSVP_DECLINE_RESPONSE="$(api_request \
  "User B declines event invitation" \
  "200" \
  -X POST \
  "$API_BASE/api/calendar/events/$INVITED_EVENT_ID/rsvp/" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"response_status":"declined"}'
)"

api_request \
  "User B hides declined event" \
  "200" \
  -X PATCH \
  "$API_BASE/api/calendar/events/$INVITED_EVENT_ID/declined-visibility/" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hidden":true}' \
  >/dev/null

api_request \
  "User B restores visibility of declined event" \
  "200" \
  -X PATCH \
  "$API_BASE/api/calendar/events/$INVITED_EVENT_ID/declined-visibility/" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hidden":false}' \
  >/dev/null

echo
echo "[15/18] Invitación, RSVP aceptar y solicitud de invitado"

ACCEPTED_EVENT_RESPONSE="$(api_request \
  "Create second event inviting User B" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/events/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json

print(json.dumps({
    "calendar_id": "$USER_A_DEFAULT_CALENDAR_ID",
    "title": "$TEST_PREFIX Invitación aceptada",
    "description": "Prueba de solicitud aprobada.",
    "event_kind": "virtual",
    "color": "#2563EB",
    "is_all_day": False,
    "starts_at": "2026-08-28T10:00:00-05:00",
    "ends_at": "2026-08-28T11:00:00-05:00",
    "starts_on": None,
    "ends_on": None,
    "timezone": "America/Bogota",
    "location_name": None,
    "location_address": None,
    "location_maps_url": None,
    "is_private": False,
    "notifications_enabled": True,
    "attendee_ids": ["$USER_B_ID"]
}))
PY
)"
)"

export ACCEPTED_EVENT_ID="$(
  echo "$ACCEPTED_EVENT_RESPONSE" \
  | json_value "data.get('event', {}).get('id', '')"
)"

assert_nonempty "Accepted event ID extracted" "$ACCEPTED_EVENT_ID"

api_request \
  "User B accepts second invitation" \
  "200" \
  -X POST \
  "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/rsvp/" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"response_status":"accepted"}' \
  >/dev/null

INVITEE_REQUEST_RESPONSE="$(api_request \
  "User B requests adding User A (expected validation failure)" \
  "400" \
  -X POST \
  "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/invitee-requests/" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json
print(json.dumps({
    "requested_user_id": "$USER_A_ID",
    "note": "El organizador ya existe; esta prueba debe fallar.",
}))
PY
)"
)"

api_request \
  "User A lists invitee requests" \
  "200" \
  "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/invitee-requests/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

echo
echo "[16/18] Expulsar asistente"

api_request \
  "User A removes User B from accepted event" \
  "200" \
  -X DELETE \
  "$API_BASE/api/calendar/events/$ACCEPTED_EVENT_ID/attendees/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json
print(json.dumps({
    "attendee_user_id": "$USER_B_ID",
}))
PY
)" \
  >/dev/null

echo
echo "[17/18] Compartir calendario, aceptar y revocar"

SHARE_RESPONSE="$(api_request \
  "User A shares secondary calendar with User B" \
  "201" \
  -X POST \
  "$API_BASE/api/calendar/calendars/$SECONDARY_CALENDAR_ID/shares/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python - <<PY
import json
print(json.dumps({
    "shared_with_user_id": "$USER_B_ID",
    "permission": "viewer",
}))
PY
)"
)"

export SHARE_ID="$(
  echo "$SHARE_RESPONSE" \
  | json_value "data.get('share', {}).get('id', '')"
)"

assert_nonempty "Calendar share ID extracted" "$SHARE_ID"

api_request \
  "User A lists secondary calendar shares" \
  "200" \
  "$API_BASE/api/calendar/calendars/$SECONDARY_CALENDAR_ID/shares/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

api_request \
  "User B accepts calendar share" \
  "200" \
  -X POST \
  "$API_BASE/api/calendar/calendar-shares/$SHARE_ID/accept/" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  >/dev/null

api_request \
  "User B lists calendars after share acceptance" \
  "200" \
  "$API_BASE/api/calendar/calendars/" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  >/dev/null

api_request \
  "User A revokes calendar share" \
  "200" \
  -X POST \
  "$API_BASE/api/calendar/calendar-shares/$SHARE_ID/revoke/" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

echo
echo "[18/18] Notificaciones y limpieza"

api_request \
  "List User A calendar notifications" \
  "200" \
  "$API_BASE/api/notifications/?module=calendar&unread_only=false&limit=100" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  >/dev/null

api_request \
  "List User B calendar notifications" \
  "200" \
  "$API_BASE/api/notifications/?module=calendar&unread_only=false&limit=100" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  >/dev/null

if [[ -n "${INVITED_EVENT_ID:-}" ]]; then
  cleanup_event \
    "$USER_A_TOKEN" \
    "$INVITED_EVENT_ID" \
    "RSVP declined event"
fi

if [[ -n "${ACCEPTED_EVENT_ID:-}" ]]; then
  cleanup_event \
    "$USER_A_TOKEN" \
    "$ACCEPTED_EVENT_ID" \
    "accepted invitation event"
fi

cleanup_event \
  "$USER_A_TOKEN" \
  "$DUPLICATE_EVENT_ID" \
  "duplicate event"

cleanup_event \
  "$USER_A_TOKEN" \
  "$RECURRENT_EVENT_ID" \
  "recurring event"

cleanup_event \
  "$USER_A_TOKEN" \
  "$ALL_DAY_EVENT_ID" \
  "all-day event"

cleanup_event \
  "$USER_A_TOKEN" \
  "$TIMED_EVENT_ID" \
  "timed event"

cleanup_calendar \
  "$USER_A_TOKEN" \
  "$SECONDARY_CALENDAR_ID" \
  "secondary test calendar"

cleanup_tag \
  "$USER_A_TOKEN" \
  "$TAG_ID" \
  "test tag"

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
echo "PRUEBAS TERMINADAS"
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