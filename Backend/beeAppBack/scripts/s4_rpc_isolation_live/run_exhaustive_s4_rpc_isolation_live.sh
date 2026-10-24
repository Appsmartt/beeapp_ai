#!/usr/bin/env bash
cd ~/Git/beeapp_ai
umask 077

report_path="tmp/s4_rpc_isolation_exhaustive_results.txt"
runner_path="Backend/beeAppBack/scripts/s4_rpc_isolation_live/run_s4_rpc_isolation_live.py"
cycles=3
overall_status=0

: > "$report_path"

for cycle in $(seq 1 "$cycles"); do
    cycle_path="tmp/s4_rpc_isolation_cycle_${cycle}.txt"
    printf 'CICLO | %s | inicio\n' "$cycle" >> "$report_path"
    printf '\n===== CICLO %s DE %s =====\n' "$cycle" "$cycles" >&2

    set +e
    python3 "$runner_path" | tee "$cycle_path"
    cycle_status=${PIPESTATUS[0]}
    set -e

    chmod 600 "$cycle_path"
    cat "$cycle_path" >> "$report_path"
    printf 'CICLO | %s | código_salida=%s\n' "$cycle" "$cycle_status" >> "$report_path"

    if [ "$cycle_status" -ne 0 ]; then
        overall_status=1
    fi
done

chmod 600 "$report_path"
printf 'Código de salida: %s\n' "$overall_status"
grep -E '^(PASS|FAIL|SKIP|WARN|TOTAL|CICLO) [|]' "$report_path"
test "$overall_status" -eq 0
