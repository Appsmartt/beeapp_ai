#!/usr/bin/env bash
set -u

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
backend_root="${project_root}/Backend/beeAppBack"
report_directory="${project_root}/tmp"
report_path="${report_directory}/integrations_refactor_validation_$(date +%Y%m%d_%H%M%S).txt"
overall_status=0

mkdir -p "${report_directory}"

{
    printf '%s\n' '=== BEEAPP INTEGRATIONS REFACTOR VALIDATION ==='
    printf 'Generated at: %s\n' "$(date -Is)"
    printf 'Project root: %s\n' "${project_root}"
    printf '\n%s\n' '=== DJANGO SYSTEM CHECK ==='
    (
        cd "${backend_root}" &&
        python manage.py check
    ) || overall_status=1

    printf '\n%s\n' '=== TARGETED TEST SUITE ==='
    (
        cd "${backend_root}" &&
        python manage.py test \
            apps.integrations.tests.test_oauth_callback_v2 \
            apps.integrations.tests.test_refactored_views_contract \
            apps.integrations.tests.test_refactored_views_factory_contract \
            beeAppBack.tests.test_security_settings \
            --verbosity 1
    ) || overall_status=1

    for cycle in 1 2 3 4 5; do
        printf '\n=== OAUTH REGRESSION CYCLE %s ===\n' "${cycle}"
        (
            cd "${backend_root}" &&
            python manage.py test \
                apps.integrations.tests.test_oauth_callback_v2 \
                apps.integrations.tests.test_refactored_views_contract \
                apps.integrations.tests.test_refactored_views_factory_contract \
                --verbosity 1
        ) || overall_status=1
    done

    printf '\n%s\n' '=== STATIC SOURCE CHECKS ==='
    python -m compileall -q \
        "${backend_root}/apps/integrations/views.py" \
        "${backend_root}/apps/integrations/refactored_views" \
        "${backend_root}/apps/integrations/tests/test_refactored_views_contract.py" \
        "${backend_root}/apps/integrations/tests/test_refactored_views_factory_contract.py" \
        || overall_status=1

    if grep -RInE --include='*.py' \
        'apps\.integrations\.views|\.env|dotenv|os\.environ|os\.getenv' \
        "${backend_root}/apps/integrations/refactored_views"; then
        printf '%s\n' 'FAIL: forbidden refactored-view dependency or environment access found.'
        overall_status=1
    else
        printf '%s\n' 'PASS: refactored modules have no facade or environment access.'
    fi

    printf '\n=== OVERALL STATUS: %s ===\n' "${overall_status}"
} > "${report_path}" 2>&1

printf '%s\n' "${report_path}"
