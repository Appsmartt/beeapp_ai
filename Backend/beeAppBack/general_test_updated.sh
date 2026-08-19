#!/usr/bin/env bash
# Actualización para tu general_test.sh actual.
# Aplica automáticamente las correcciones de rutas de calendarios externos,
# agrega diagnóstico de OAuth Microsoft y corrige las pruebas dependientes.
#
# Uso (desde Backend/beeAppBack):
#   chmod +x general_test_updated.sh
#   ./general_test_updated.sh general_test.sh
#
# El archivo objetivo queda respaldado como general_test.sh.bak y reemplazado.

set -euo pipefail

TARGET="${1:-general_test.sh}"

if [[ ! -f "$TARGET" ]]; then
  echo "ERROR: No existe el archivo objetivo: $TARGET" >&2
  exit 1
fi

python3 - "$TARGET" <<'PY'
from pathlib import Path
import shutil
import sys

path = Path(sys.argv[1])
original = path.read_text()
updated = original

replacements = {
    '"$API_BASE/api/calendar/external-calendars/"': '"$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID/external-calendars/"',
    '"$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID/discover/"': '"$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID/discover-calendars/"',
    '"$API_BASE/api/calendar/integrations/00000000-0000-0000-0000-000000000000/discover/"': '"$API_BASE/api/calendar/integrations/00000000-0000-0000-0000-000000000000/discover-calendars/"',
    '"$API_BASE/api/calendar/integrations/$google_connection_id_for_discovery/discover/"': '"$API_BASE/api/calendar/integrations/$google_connection_id_for_discovery/discover-calendars/"',
}

for old, new in replacements.items():
    updated = updated.replace(old, new)

old_security_block = '''  api_request "External calendars: integrations without credentials" "401" "$API_BASE/api/calendar/integrations/" >/dev/null
  api_request "External calendars: list without credentials" "401" "$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID/external-calendars/" >/dev/null

  if [[ -n "${EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID:-}" ]]; then
    api_request "External calendars: Microsoft discovery without credentials" "401" \\
      -X POST "$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID/discover-calendars/" >/dev/null
  else
    record_assertion "External calendars: discovery without credentials route" "SKIP" "No existe conexión Microsoft para construir la URL de discovery."
  fi
'''
new_security_block = '''  # Se usa un UUID sintácticamente válido: AuthenticatedAPIView debe rechazar
  # antes de buscar la integración, por eso se esperan 401 en ambas rutas.
  EXTERNAL_CALENDAR_TEST_INTEGRATION_ID="00000000-0000-0000-0000-000000000000"
  api_request "External calendars: integrations without credentials" "401" "$API_BASE/api/calendar/integrations/" >/dev/null
  api_request "External calendars: list without credentials" "401" \\
    "$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_TEST_INTEGRATION_ID/external-calendars/" >/dev/null
  api_request "External calendars: discovery without credentials" "401" \\
    -X POST "$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_TEST_INTEGRATION_ID/discover-calendars/" >/dev/null
'''
if old_security_block not in updated:
    raise SystemExit('No encontré el bloque de seguridad esperado. No se modificó el archivo.')
updated = updated.replace(old_security_block, new_security_block)

old_list_block = '''  echo "[External calendars 3/12] Listado externo inicial y forma de datos"
  external_list_before_response="$(api_request "External calendars: list before discovery" "200" "$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID/external-calendars/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
  assert_no_sensitive_keys "External calendars: list before discovery does not expose tokens" "$external_list_before_response"
  assert_all_external_calendars_shape "External calendars: existing records have required public shape" "$external_list_before_response"
  before_external_total="$(external_calendar_count "$external_list_before_response")"
  before_microsoft_external="$(external_calendar_count_by_provider "microsoft" "$external_list_before_response")"
  before_microsoft_ids="$(external_calendar_ids_by_provider "microsoft" "$external_list_before_response")"

  calendar_list_before_response="$(api_request "External calendars: BeeApp calendars before discovery" "200" "$API_BASE/api/calendar/calendars/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
  assert_no_sensitive_keys "External calendars: BeeApp calendars before discovery do not expose secrets" "$calendar_list_before_response"
  before_beeapp_calendar_count="$(printf '%s' "$calendar_list_before_response" | json_count "data.get('calendars', [])")"

  echo "[External calendars 4/12] Validaciones de discovery"
  api_request_any_status "External calendars: invalid connection discovery is rejected" "400 404" \\
    -X POST "$API_BASE/api/calendar/integrations/00000000-0000-0000-0000-000000000000/discover-calendars/" \\
    -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN" >/dev/null

  if [[ -z "${EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID:-}" ]]; then
'''
new_list_block = '''  echo "[External calendars 3/12] Precondición Microsoft y listado externo inicial"
  if [[ -z "${EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID:-}" ]]; then
    record_assertion "External calendars: list before discovery" "SKIP" "No existe conexión Microsoft connected; el listado es por integration_id."
    record_assertion "External calendars: list before discovery does not expose tokens" "SKIP" "No existe conexión Microsoft connected."
    record_assertion "External calendars: existing records have required public shape" "SKIP" "No existe conexión Microsoft connected."
    record_assertion "External calendars: Microsoft connection prerequisite" "SKIP" "No se completó OAuth Microsoft ni hay una conexión Microsoft previa."
    record_assertion "External calendars: Microsoft discovery" "SKIP" "No se puede ejecutar sin conexión Microsoft connected."
    record_assertion "External calendars: discovery idempotency" "SKIP" "No se puede ejecutar sin conexión Microsoft connected."
    record_assertion "External calendars: discovery does not import events" "SKIP" "No se puede ejecutar sin conexión Microsoft connected."
    return 0
  fi

  external_list_before_response="$(api_request "External calendars: list before discovery" "200" "$API_BASE/api/calendar/integrations/$EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID/external-calendars/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
  assert_no_sensitive_keys "External calendars: list before discovery does not expose tokens" "$external_list_before_response"
  assert_all_external_calendars_shape "External calendars: existing records have required public shape" "$external_list_before_response"
  before_external_total="$(external_calendar_count "$external_list_before_response")"
  before_microsoft_external="$(external_calendar_count_by_provider "microsoft" "$external_list_before_response")"
  before_microsoft_ids="$(external_calendar_ids_by_provider "microsoft" "$external_list_before_response")"

  calendar_list_before_response="$(api_request "External calendars: BeeApp calendars before discovery" "200" "$API_BASE/api/calendar/calendars/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
  assert_no_sensitive_keys "External calendars: BeeApp calendars before discovery do not expose secrets" "$calendar_list_before_response"
  before_beeapp_calendar_count="$(printf '%s' "$calendar_list_before_response" | json_count "data.get('calendars', [])")"

  echo "[External calendars 4/12] Validaciones de discovery"
  api_request_any_status "External calendars: invalid integration discovery is rejected" "400 404" \\
    -X POST "$API_BASE/api/calendar/integrations/00000000-0000-0000-0000-000000000000/discover-calendars/" \\
    -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN" >/dev/null

  if [[ -z "${EXTERNAL_CALENDAR_MICROSOFT_CONNECTION_ID:-}" ]]; then
'''
if old_list_block not in updated:
    raise SystemExit('No encontré el bloque de listado externo esperado. No se modificó el archivo.')
updated = updated.replace(old_list_block, new_list_block)

old_microsoft_else = '''  else
    connections_response="$(api_request "Integrations: list existing connections before calendar tests" "200" "$API_BASE/api/integrations/connections/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
    microsoft_connection_id="$(find_connected_connection_id "microsoft" "$connections_response")"
    if [[ -n "$microsoft_connection_id" ]]; then
      record_assertion "Integrations: reuses existing Microsoft connection" "PASS" "$microsoft_connection_id"
    else
      record_assertion "Integrations: real Microsoft OAuth" "SKIP" "El usuario eligió no iniciar Microsoft OAuth y no existe conexión previa."
    fi
  fi
'''
new_microsoft_else = '''  else
    connections_response="$(api_request "Integrations: list existing connections before calendar tests" "200" "$API_BASE/api/integrations/connections/" -H "Authorization: Bearer $INTEGRATIONS_ACCESS_TOKEN")"
    microsoft_connection_id="$(find_connected_connection_id "microsoft" "$connections_response")"
    if [[ -n "$microsoft_connection_id" ]]; then
      record_assertion "Integrations: Microsoft OAuth not started in this run" "SKIP" "El usuario eligió no abrir OAuth; se reutilizará la conexión Microsoft connected existente: $microsoft_connection_id."
      record_assertion "Integrations: reuses existing Microsoft connection" "PASS" "$microsoft_connection_id"
    else
      microsoft_existing_status="$(find_connection_status "microsoft" "$connections_response")"
      if [[ -n "$microsoft_existing_status" ]]; then
        record_assertion "Integrations: Microsoft OAuth not started in this run" "SKIP" "El usuario eligió no abrir OAuth. Existe una conexión Microsoft pero no está connected (estado=$microsoft_existing_status). Discovery se omite; reautoriza Microsoft."
      else
        record_assertion "Integrations: Microsoft OAuth not started in this run" "SKIP" "El usuario eligió no abrir OAuth y no existe ninguna conexión Microsoft. Discovery se omite."
      fi
    fi
  fi
'''
if old_microsoft_else not in updated:
    raise SystemExit('No encontré el bloque Microsoft OAuth esperado. No se modificó el archivo.')
updated = updated.replace(old_microsoft_else, new_microsoft_else)

old_microsoft_after = '''    echo
    assert_nonempty "Integrations: connected Microsoft connection ID exists" "$microsoft_connection_id"
    assert_no_sensitive_keys "Integrations: Microsoft connections after OAuth do not expose tokens" "$connections_response"
'''
new_microsoft_after = '''    echo
    assert_nonempty "Integrations: connected Microsoft connection ID exists" "$microsoft_connection_id"
    assert_no_sensitive_keys "Integrations: Microsoft connections after OAuth do not expose tokens" "$connections_response"

    if [[ -n "$microsoft_connection_id" ]]; then
      record_assertion "Integrations: Microsoft OAuth session completed" "PASS" "Se detectó conexión Microsoft connected: $microsoft_connection_id."
    else
      microsoft_existing_status="$(find_connection_status "microsoft" "$connections_response")"
      if [[ -n "$microsoft_existing_status" ]]; then
        record_assertion "Integrations: Microsoft OAuth session completed" "FAIL" "El usuario abrió Microsoft OAuth, pero la conexión no quedó connected (estado=$microsoft_existing_status). Revisa consentimiento, callback, redirect URI, túnel Cloudflare, scopes Calendars.Read y logs Django."
      else
        record_assertion "Integrations: Microsoft OAuth session completed" "FAIL" "El usuario abrió Microsoft OAuth, pero no se creó ninguna conexión Microsoft. Posibles causas: consentimiento cancelado, callback no llegó al backend, redirect URI incorrecto, túnel Cloudflare caído o error de Microsoft."
      fi
    fi
'''
if old_microsoft_after not in updated:
    raise SystemExit('No encontré el bloque de resultado OAuth Microsoft esperado. No se modificó el archivo.')
updated = updated.replace(old_microsoft_after, new_microsoft_after)

if updated == original:
    raise SystemExit('No se detectaron cambios; no se modificó el archivo.')

backup = path.with_name(path.name + '.bak')
shutil.copy2(path, backup)
path.write_text(updated)
print(f'Actualizado: {path}')
print(f'Respaldo:    {backup}')
PY

bash -n "$TARGET"
echo "Sintaxis Bash válida: $TARGET"
