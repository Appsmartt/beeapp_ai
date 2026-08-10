export function formatCurrencyCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}

export function formatDate(dateIso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateIso));
}

export function formatRelativeTime(dateIso: string): string {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `Hace ${diffDays}d`;

  return formatDate(dateIso);
}
