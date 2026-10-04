#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"
BACKEND_ROOT="$PROJECT_ROOT/Backend/beeAppBack"
REPORT_PATH="$PROJECT_ROOT/tmp/status_media_refactor_test_report.txt"

cd "$BACKEND_ROOT"

{
    printf '%s\n' '=== STATUS MEDIA REFACTOR TEST REPORT ==='
    printf 'Timestamp: %s\n' "$(date -Is)"
    printf 'Branch: %s\n' "$(git -C "$PROJECT_ROOT" branch --show-current)"
    printf '%s\n' '=== PYTHON VERSION ==='
    python --version
    printf '%s\n' '=== COMPILE CHECK ==='
    python -m compileall -q \
        apps/statuses/services/status_media_refactor \
        apps/statuses/services/status_refactor/story_creation.py \
        apps/statuses/services/status_refactor/enrichment.py \
        apps/statuses/services/status_follow_service.py \
        apps/chat/services/chat_conversation/avatars.py \
        apps/chat/services/chat_identity_service.py
    printf '%s\n' 'COMPILE_OK'
    printf '%s\n' '=== FOCUSED TESTS ==='
    python manage.py test \
        apps.statuses.tests.test_status_media_validation \
        apps.statuses.tests.test_status_image_layers \
        apps.statuses.tests.test_s6_avatar_ownership \
        apps.commercial.tests.test_s6_public_media_ownership \
        apps.statuses.tests.test_status_refactor_contract \
        --verbosity 2
    printf '%s\n' 'FOCUSED_TESTS_OK'
    printf '%s\n' '=== REPEATED SECURITY TEST CYCLES ==='
    for cycle in 1 2 3 4 5; do
        printf 'Security cycle %s/5\n' "$cycle"
        python manage.py test \
            apps.statuses.tests.test_s6_avatar_ownership \
            apps.commercial.tests.test_s6_public_media_ownership \
            --verbosity 1
    done
    printf '%s\n' 'SECURITY_CYCLES_OK'
    printf '%s\n' '=== MONOLITH REMOVAL CHECK ==='
    if test -e apps/statuses/services/status_media_service.py; then
        printf '%s\n' 'MONOLITH_FILE_STILL_EXISTS'
        exit 1
    fi
    if grep -RIn \
        'apps\.statuses\.services\.status_media_service' \
        apps \
        --include='*.py' \
        --exclude='*.pyc' \
        --exclude-dir='__pycache__' \
        --exclude-dir='.pytest_cache' \
        2>/dev/null; then
        printf '%s\n' 'MONOLITH_REFERENCE_CHECK_FAILED'
        exit 1
    fi
    printf '%s\n' 'MONOLITH_REMOVAL_CHECK_OK'
    printf '%s\n' '=== FILE SIZE CHECK ==='
    find apps/statuses/services/status_media_refactor \
        -maxdepth 1 \
        -type f \
        -name '*.py' \
        -print0 | sort -z | xargs -0 wc -l
    printf '%s\n' 'FILE_SIZE_CHECK_OK'
    printf '%s\n' '=== GIT DIFF CHECK ==='
    git -C "$PROJECT_ROOT" diff --check
    printf '%s\n' 'GIT_DIFF_CHECK_OK'
    printf '%s\n' '=== RESULT ==='
    printf '%s\n' 'STATUS_MEDIA_REFACTOR_PRE_DELETE_CHECKS_PASSED'
} > "$REPORT_PATH" 2>&1
