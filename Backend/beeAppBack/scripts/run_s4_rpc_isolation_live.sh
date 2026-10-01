#!/usr/bin/env bash
cd ~/Git/beeapp_ai
umask 077
python3 Backend/beeAppBack/scripts/test_s4_rpc_isolation_live.py > tmp/s4_rpc_isolation_results.txt
result=$?
chmod 600 tmp/s4_rpc_isolation_results.txt
printf 'Código de salida: %s\n' "$result"
grep -E '^(PASS|FAIL|SKIP|WARN|TOTAL) [|]' tmp/s4_rpc_isolation_results.txt
test "$result" -eq 0
