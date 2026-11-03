export type DayPeriod = 'AM' | 'PM';

export function parseTime24(value: string): {
  hour: number;
  minute: number;
} {
  const [hourPart = '09', minutePart = '00'] = (
    String(value || '09:00').trim()
  ).split(':');

  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);

  return {
    hour: Number.isFinite(hour)
      ? Math.min(23, Math.max(0, hour))
      : 9,
    minute: Number.isFinite(minute)
      ? Math.min(59, Math.max(0, minute))
      : 0,
  };
}

export function formatTime24(
  hour: number,
  minute: number,
): string {
  return `${String(hour).padStart(2, '0')}:${String(
    minute,
  ).padStart(2, '0')}`;
}

export function to12HourParts(hour24: number): {
  hour12: number;
  period: DayPeriod;
} {
  const period: DayPeriod = hour24 >= 12 ? 'PM' : 'AM';
  const remainder = hour24 % 12;

  return {
    hour12: remainder === 0 ? 12 : remainder,
    period,
  };
}

export function to24Hour(
  hour12: number,
  period: DayPeriod,
): number {
  const normalized = Math.min(12, Math.max(1, hour12));

  if (period === 'AM') {
    return normalized === 12 ? 0 : normalized;
  }

  return normalized === 12 ? 12 : normalized + 12;
}

export function formatTime12Label(
  value: string,
): string {
  const { hour, minute } = parseTime24(value);
  const { hour12, period } = to12HourParts(hour);

  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}
