#!/usr/bin/env bash
set -u -o pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"
BACKEND_ROOT="$PROJECT_ROOT/Backend/beeAppBack"
REPORT_DIRECTORY="$PROJECT_ROOT/tmp"
REPORT_PATH="$REPORT_DIRECTORY/commercial_payment_method_refactor_verification.txt"
CYCLES=20

mkdir -p "$REPORT_DIRECTORY"

{
    printf '%s\n' '=== COMMERCIAL PAYMENT METHOD REFACTOR VERIFICATION ==='
    printf 'Started at: %s\n' "$(date --iso-8601=seconds)"
    printf 'Cycles: %s\n' "$CYCLES"
    printf '%s\n' 'Environment files are not read, displayed, or modified by this script.'
    printf '%s\n' '=== PACKAGE RESOLUTION ==='
    (
        cd "$BACKEND_ROOT" || exit 1
        python -c "import apps.commercial.services.commercial_payment_method_service as service; print(service.__file__); print(','.join(sorted(service.__all__)))"
    )

    printf '%s\n' '=== LINE LIMITS ==='
    find "$BACKEND_ROOT/apps/commercial/services/commercial_payment_method_service" \
        -maxdepth 1 \
        -type f \
        -name '*.py' \
        ! -path '*/__pycache__/*' \
        -print0 |
        xargs -0 wc -l |
        sort -n

    printf '%s\n' '=== REPEATED FOCUSED TESTS ==='
    for cycle in $(seq 1 "$CYCLES"); do
        printf 'Cycle %s/%s: ' "$cycle" "$CYCLES"
        if (
            cd "$BACKEND_ROOT" || exit 1
            python manage.py test \
                apps.commercial.tests.test_commercial_payment_method_service \
                --verbosity 0
        ) >/dev/null 2>&1; then
            printf '%s\n' 'PASS'
        else
            printf '%s\n' 'FAIL'
            exit 1
        fi
    done

    printf '%s\n' '=== RELATED PAYMENT TESTS ==='
    (
        cd "$BACKEND_ROOT" || exit 1
        python manage.py test \
            apps.commercial.tests.test_commercial_payment_and_verification_serializers \
            apps.commercial.tests.test_commercial_payment_flow_service \
            apps.commercial.tests.test_commercial_payment_proof_service \
            --verbosity 1
    )

    printf '%s\n' '=== COMPILE CHECK ==='
    (
        cd "$BACKEND_ROOT" || exit 1
        python -m py_compile \
            apps/commercial/services/commercial_payment_method_service/__init__.py \
            apps/commercial/services/commercial_payment_method_service/audit.py \
            apps/commercial/services/commercial_payment_method_service/client.py \
            apps/commercial/services/commercial_payment_method_service/constants.py \
            apps/commercial/services/commercial_payment_method_service/operations.py \
            apps/commercial/services/commercial_payment_method_service/queries.py \
            apps/commercial/services/commercial_payment_method_service/serialization.py \
            apps/commercial/services/commercial_payment_method_service/validation.py \
            apps/commercial/tests/test_commercial_payment_method_service.py
    )
    printf '%s\n' 'PASS'

    printf '%s\n' '=== RESIDUAL MONOLITH CHECK ==='
    if test -e "$BACKEND_ROOT/apps/commercial/services/commercial_payment_method_service.py"; then
        printf '%s\n' 'FAIL: monolith still exists'
        exit 1
    fi
    printf '%s\n' 'PASS'

    printf '%s\n' '=== IMPORT COMPATIBILITY CHECK ==='
    (
        cd "$BACKEND_ROOT" || exit 1
        python -c "from apps.commercial.services.commercial_payment_method_service import archive_commercial_payment_method, create_commercial_payment_method, get_owned_commercial_payment_method, list_owned_commercial_payment_methods, serialize_public_payment_method, update_commercial_payment_method; print('PASS')"
    )

    printf '%s\n' '=== SECURITY LEAKAGE CHECK ==='
    (
        cd "$BACKEND_ROOT" || exit 1
        python - <<'PY'
from apps.commercial.services.commercial_payment_method_service import (
    serialize_public_payment_method,
)

payment_method = {
    "id": "payment-method-1",
    "commercial_profile_id": "profile-1",
    "payment_method_type": "nequi",
    "display_name": "Nequi",
    "sort_order": 0,
    "private_details": {"phone_number": "3001234567"},
    "private_instructions": "Private payment instruction",
    "commercial_mobile_payment_accounts": [
        {
            "wallet_type": "nequi",
            "payment_key": "3001234567",
            "account_holder_name": "Owner",
        }
    ],
}
serialized = serialize_public_payment_method(payment_method)
forbidden_keys = {
    "private_details",
    "private_instructions",
    "mobile_account",
    "bank_account",
    "payment_key",
    "account_number",
    "account_holder_document_number",
}
assert not forbidden_keys.intersection(serialized)
print("PASS")
PY
    )

    printf '%s\n' '=== GIT DIFF SUMMARY ==='
    (
        cd "$PROJECT_ROOT" || exit 1
        git diff --check
        git diff --stat -- \
            Backend/beeAppBack/apps/commercial/services/commercial_payment_method_service.py \
            Backend/beeAppBack/apps/commercial/services/commercial_payment_method_service \
            Backend/beeAppBack/apps/commercial/tests/test_commercial_payment_method_service.py
        git status --short
    )

    printf 'Finished at: %s\n' "$(date --iso-8601=seconds)"
    printf '%s\n' 'VERIFICATION_PASSED'
} > "$REPORT_PATH" 2>&1
