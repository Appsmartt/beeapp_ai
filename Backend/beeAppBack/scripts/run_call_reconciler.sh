#!/usr/bin/env bash
set -Eeuo pipefail

: "${CALL_RECONCILE_BATCH_SIZE:=500}"
: "${CALL_RECONCILE_POLL_SECONDS:=10}"
: "${WORKER_ERROR_RETRY_SECONDS:=10}"

shutdown() {
  echo "[$(date '+%F %T')] Deteniendo call-reconciler worker..."
  exit 0
}

trap shutdown INT TERM

echo "[$(date '+%F %T')] Iniciando call-reconciler worker"
echo "batch_size=${CALL_RECONCILE_BATCH_SIZE} poll_seconds=${CALL_RECONCILE_POLL_SECONDS}"

while true; do
  echo "[$(date '+%F %T')] Reconciliando sesiones de llamada..."

  if python manage.py reconcile_call_sessions \
    --limit "${CALL_RECONCILE_BATCH_SIZE}"; then
    sleep "${CALL_RECONCILE_POLL_SECONDS}"
  else
    status=$?
    echo "[$(date '+%F %T')] ERROR: reconcile_call_sessions terminó con código ${status}. Reintentando en ${WORKER_ERROR_RETRY_SECONDS} segundos."
    sleep "${WORKER_ERROR_RETRY_SECONDS}"
  fi
done
