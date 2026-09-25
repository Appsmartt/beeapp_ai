export function formatChatLastSeen(
  lastSeenAt: string | null,
  now = Date.now(),
): string {
  if (!lastSeenAt) {
    return 'Última conexión no disponible';
  }

  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) {
    return 'Última conexión no disponible';
  }

  const elapsedMinutes = Math.max(0, Math.floor((now - seen) / 60000));
  if (elapsedMinutes < 1) {
    return 'Últ. vez hace menos de 1 minuto';
  }
  if (elapsedMinutes < 60) {
    return `Últ. vez hace ${elapsedMinutes} ${elapsedMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const hours = Math.max(1, Math.round((now - seen) / 3600000));
  return `Últ. vez hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
}
