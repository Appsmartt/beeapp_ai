#!/usr/bin/env bash
set -u -o pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
backend_root="${project_root}/Backend/beeAppBack"
results_directory="${project_root}/tmp/calendar_sync_refactor_results"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
results_file="${results_directory}/calendar_sync_refactor_${timestamp}.txt"

mkdir -p "${results_directory}"

run_check() {
    local check_name="$1"
    shift

    printf '\n=== %s ===\n' "${check_name}" | tee -a "${results_file}"

    if "$@" >>"${results_file}" 2>&1; then
        printf 'RESULT: PASS\n' | tee -a "${results_file}"
        return 0
    fi

    printf 'RESULT: FAIL\n' | tee -a "${results_file}"
    return 1
}

printf 'Calendar sync refactor verification\n' >"${results_file}"
printf 'Generated at: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"${results_file}"

overall_status=0

run_check \
    "Focused unit tests" \
    bash -lc \
    "cd '${backend_root}' && python manage.py test apps.calendar.tests.test_calendar_sync_normalization apps.calendar.tests.test_calendar_sync_orchestrator --verbosity 2" \
    || overall_status=1

run_check \
    "Django system check" \
    bash -lc \
    "cd '${backend_root}' && python manage.py check" \
    || overall_status=1

run_check \
    "Django import check" \
    bash -lc \
    "cd '${backend_root}' && python manage.py shell -c \"from apps.calendar.services.calendar_sync import sync_calendar_integration, sync_due_calendar_integrations; from apps.calendar.views.integrations import CalendarIntegrationSyncView; from apps.calendar.management.commands.sync_calendar_integrations import Command; print('calendar_sync_django_imports_ok')\"" \
    || overall_status=1

run_check \
    "Python syntax check" \
    bash -lc \
    "cd '${project_root}' && python -m py_compile Backend/beeAppBack/apps/calendar/services/calendar_sync/*.py Backend/beeAppBack/apps/calendar/tests/test_calendar_sync_normalization.py Backend/beeAppBack/apps/calendar/tests/test_calendar_sync_orchestrator.py" \
    || overall_status=1

run_check \
    "Maximum line count" \
    bash -lc \
    "cd '${project_root}' && awk 'FNR==1 { if (NR!=1) { if (count > 400) { print previous \": \" count \" lines\"; status=1 } count=0 } previous=FILENAME } { count++ } END { if (count > 400) { print previous \": \" count \" lines\"; status=1 } exit status }' Backend/beeAppBack/apps/calendar/services/calendar_sync/*.py Backend/beeAppBack/apps/calendar/tests/test_calendar_sync_normalization.py Backend/beeAppBack/apps/calendar/tests/test_calendar_sync_orchestrator.py" \
    || overall_status=1

run_check \
    "No legacy service references" \
    bash -lc \
    "cd '${project_root}' && ! grep -RIn 'calendar_sync_service' Backend/beeAppBack --include='*.py' --exclude-dir='.venv' --exclude-dir='venv' --exclude-dir='__pycache__' --exclude-dir='migrations' --exclude-dir='backups' --exclude-dir='backup' --exclude-dir='tmp'" \
    || overall_status=1

printf '\n=== OVERALL RESULT ===\n' | tee -a "${results_file}"

if [ "${overall_status}" -eq 0 ]; then
    printf 'RESULT: PASS\n' | tee -a "${results_file}"
else
    printf 'RESULT: FAIL\n' | tee -a "${results_file}"
fi

printf '\nResults file: %s\n' "${results_file}"

exit "${overall_status}"
