#!/usr/bin/env bash
set -Eeuo pipefail

: "${CHAT_PUSH_BATCH_SIZE:=50}"
: "${CHAT_PUSH_POLL_SECONDS:=10}"
: "${WORKER_ERROR_RETRY_SECONDS:=10}"

shutdown() {
  echo "[$(date '+%F %T')] Deteniendo chat-push worker..."
  exit 0
}

trap shutdown INT TERM

echo "[$(date '+%F %T')] Iniciando chat-push worker"
echo "batch_size=${CHAT_PUSH_BATCH_SIZE} poll_seconds=${CHAT_PUSH_POLL_SECONDS}"

while true; do
  echo "[$(date '+%F %T')] Procesando notificaciones push de chat..."

  if python manage.py process_chat_push_notifications \
    --limit "${CHAT_PUSH_BATCH_SIZE}"; then
    sleep "${CHAT_PUSH_POLL_SECONDS}"
  else
    status=$?
    echo "[$(date '+%F %T')] ERROR: process_chat_push_notifications terminó con código ${status}. Reintentando en ${WORKER_ERROR_RETRY_SECONDS} segundos."
    sleep "${WORKER_ERROR_RETRY_SECONDS}"
  fi
done
