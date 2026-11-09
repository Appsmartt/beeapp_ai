import type {
  CommercialProfileHour,
  CommercialPublicProfile,
} from '@beeapp/shared-types';

export const COMMERCIAL_RESERVATION_PENDING_NOTICE = (
'Una fecha retenida o propuesta no está confirmada hasta el acuerdo final.'
);

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^\d{2}:\d{2}$/;

function normalize(value: string | null | undefined): string {
return String(value || '').trim();
}

export function isValidCommercialTimezone(
timezone: string | null | undefined,
): timezone is string {
const normalizedTimezone = normalize(timezone);

if (!normalizedTimezone) {
return false;
}

try {
new Intl.DateTimeFormat('en-US', {
timeZone: normalizedTimezone,
});
return true;
} catch {
return false;
}
}

export function isValidCommercialLocalDate(
localDate: string | null | undefined,
): localDate is string {
const normalizedDate = normalize(localDate);

if (!LOCAL_DATE_PATTERN.test(normalizedDate)) {
return false;
}

const [year, month, day] = normalizedDate.split('-').map(Number);
const date = new Date(Date.UTC(year, month - 1, day));

return (
date.getUTCFullYear() === year
&& date.getUTCMonth() === month - 1
&& date.getUTCDate() === day
);
}

export function isValidCommercialLocalTime(
localTime: string | null | undefined,
): localTime is string {
const normalizedTime = normalize(localTime);

if (!LOCAL_TIME_PATTERN.test(normalizedTime)) {
return false;
}

const [hour, minute] = normalizedTime.split(':').map(Number);

return (
Number.isInteger(hour)
&& Number.isInteger(minute)
&& hour >= 0
&& hour <= 23
&& minute >= 0
&& minute <= 59
);
}

function getTimezoneParts(
date: Date,
timezone: string,
): Record<string, number> {
const formatter = new Intl.DateTimeFormat('en-CA', {
calendar: 'gregory',
day: '2-digit',
hour: '2-digit',
hour12: false,
minute: '2-digit',
month: '2-digit',
second: '2-digit',
timeZone: timezone,
year: 'numeric',
});

return formatter.formatToParts(date).reduce<Record<string, number>>(
(parts, part) => {
if (part.type !== 'literal') {
parts[part.type] = Number(part.value);
}
return parts;
},
{},
);
}

function getTimezoneOffsetMilliseconds(
date: Date,
timezone: string,
): number {
const parts = getTimezoneParts(date, timezone);
const zonedUtcTimestamp = Date.UTC(
parts.year,
parts.month - 1,
parts.day,
parts.hour,
parts.minute,
parts.second,
);

return zonedUtcTimestamp - date.getTime();
}

export function toCommercialReservationStartsAtIso(
params: {
localDate: string;
localTime: string;
timezone: string;
now?: Date;
},
): string {
const localDate = normalize(params.localDate);
const localTime = normalize(params.localTime);
const timezone = normalize(params.timezone);
const now = params.now || new Date();

if (!isValidCommercialLocalDate(localDate)) {
throw new Error('Selecciona una fecha válida para la reserva.');
}

if (!isValidCommercialLocalTime(localTime)) {
throw new Error('Selecciona una hora válida para la reserva.');
}

if (!isValidCommercialTimezone(timezone)) {
throw new Error('La zona horaria de la reserva no es válida.');
}

const [year, month, day] = localDate.split('-').map(Number);
const [hour, minute] = localTime.split(':').map(Number);
const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
let candidate = new Date(localAsUtc);

for (let index = 0; index < 2; index += 1) {
const offset = getTimezoneOffsetMilliseconds(candidate, timezone);
candidate = new Date(localAsUtc - offset);
}

const resultingParts = getTimezoneParts(candidate, timezone);

if (
resultingParts.year !== year
|| resultingParts.month !== month
|| resultingParts.day !== day
|| resultingParts.hour !== hour
|| resultingParts.minute !== minute
) {
throw new Error(
'La fecha u hora seleccionada no existe en la zona horaria indicada.',
);
}

if (candidate.getTime() <= now.getTime()) {
throw new Error('Selecciona una fecha y hora futura para la reserva.');
}

return candidate.toISOString();
}

export function formatCommercialReservationDateTime(
isoValue: string | null | undefined,
timezone: string | null | undefined,
): string {
const normalizedIsoValue = normalize(isoValue);
const normalizedTimezone = normalize(timezone);
const date = new Date(normalizedIsoValue);

if (
Number.isNaN(date.getTime())
|| !isValidCommercialTimezone(normalizedTimezone)
) {
return 'Fecha no disponible';
}

return new Intl.DateTimeFormat('es-CO', {
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
month: 'long',
timeZone: normalizedTimezone,
timeZoneName: 'short',
weekday: 'long',
year: 'numeric',
}).format(date);
}

export function getCommercialReservationHoldInfo(
holdExpiresAt: string | null | undefined,
now: Date = new Date(),
): {
expiresAtLabel: string | null;
remainingSeconds: number | null;
isActive: boolean;
} {
const normalizedHoldExpiresAt = normalize(holdExpiresAt);
const expiresAt = new Date(normalizedHoldExpiresAt);

if (Number.isNaN(expiresAt.getTime())) {
return {
expiresAtLabel: null,
remainingSeconds: null,
isActive: false,
};
}

const remainingMilliseconds = expiresAt.getTime() - now.getTime();

return {
expiresAtLabel: expiresAt.toISOString(),
remainingSeconds: (
remainingMilliseconds > 0
? Math.floor(remainingMilliseconds / 1000)
: 0
),
isActive: remainingMilliseconds > 0,
};
}

const WEEKDAY_LABELS_ES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

function parseHHMMToMinutes(value: string | null | undefined): number | null {
  const normalized = normalize(value).slice(0, 5);
  if (!LOCAL_TIME_PATTERN.test(normalized)) {
    return null;
  }

  const [hours, minutes] = normalized.split(':').map(Number);
  if (
    !Number.isInteger(hours)
    || !Number.isInteger(minutes)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function hasConfiguredBusinessHours(
  hours: CommercialProfileHour[] | null | undefined,
): boolean {
  if (!Array.isArray(hours) || hours.length === 0) {
    return false;
  }

  return hours.some((hour) => {
    if (!hour || hour.is_closed) {
      return false;
    }

    const opens = parseHHMMToMinutes(hour.opens_at);
    const closes = parseHHMMToMinutes(hour.closes_at);
    return opens !== null && closes !== null && closes > opens;
  });
}

export function getBusinessScheduleForWeekday(
  hours: CommercialProfileHour[] | null | undefined,
  dayOfWeek: number,
): {
  day_of_week: number;
  dayLabel: string;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
} {
  const dayLabel = WEEKDAY_LABELS_ES[dayOfWeek] || 'Este día';
  const entry = (hours || []).find(
    (item) => Number(item.day_of_week) === dayOfWeek,
  );

  if (!entry || entry.is_closed) {
    return {
      day_of_week: dayOfWeek,
      dayLabel,
      opens_at: null,
      closes_at: null,
      is_closed: true,
    };
  }

  const opensAt = normalize(entry.opens_at).slice(0, 5) || null;
  const closesAt = normalize(entry.closes_at).slice(0, 5) || null;
  const opensMinutes = parseHHMMToMinutes(opensAt);
  const closesMinutes = parseHHMMToMinutes(closesAt);

  if (
    opensMinutes === null
    || closesMinutes === null
    || closesMinutes <= opensMinutes
  ) {
    return {
      day_of_week: dayOfWeek,
      dayLabel,
      opens_at: null,
      closes_at: null,
      is_closed: true,
    };
  }

  return {
    day_of_week: dayOfWeek,
    dayLabel,
    opens_at: opensAt,
    closes_at: closesAt,
    is_closed: false,
  };
}

export function getBusinessScheduleForLocalDate(
  hours: CommercialProfileHour[] | null | undefined,
  localDate: string | null | undefined,
): {
  day_of_week: number;
  dayLabel: string;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
} | null {
  const normalizedDate = normalize(localDate);
  if (!isValidCommercialLocalDate(normalizedDate)) {
    return null;
  }

  const [year, month, day] = normalizedDate.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return getBusinessScheduleForWeekday(hours, dayOfWeek);
}

export function isBusinessProfileOpenNow(
  profile: Pick<
    CommercialPublicProfile,
    'hours' | 'timezone' | 'is_available' | 'is_open_now'
  > | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!profile) {
    return false;
  }

  if (profile.is_available === false) {
    return false;
  }

  if (typeof profile.is_open_now === 'boolean') {
    return profile.is_open_now;
  }

  const hours = profile.hours;
  if (!hasConfiguredBusinessHours(hours)) {
    return false;
  }

  const resolvedTimezone = isValidCommercialTimezone(profile.timezone)
    ? profile.timezone
    : 'America/Bogota';
  const parts = getTimezoneParts(now, resolvedTimezone);
  const year = parts.year || now.getUTCFullYear();
  const month = parts.month || (now.getUTCMonth() + 1);
  const day = parts.day || now.getUTCDate();
  const hour = (parts.hour ?? now.getUTCHours()) % 24;
  const minute = parts.minute ?? now.getUTCMinutes();
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const currentMinutes = hour * 60 + minute;

  const schedule = getBusinessScheduleForWeekday(hours, dayOfWeek);
  if (schedule.is_closed || !schedule.opens_at || !schedule.closes_at) {
    return false;
  }

  const opensMinutes = parseHHMMToMinutes(schedule.opens_at);
  const closesMinutes = parseHHMMToMinutes(schedule.closes_at);
  if (opensMinutes === null || closesMinutes === null) {
    return false;
  }

  return currentMinutes >= opensMinutes && currentMinutes <= closesMinutes;
}

export function validateLocalReservationAgainstBusinessHours(params: {
  localDate: string;
  localTime: string;
  hours: CommercialProfileHour[] | null | undefined;
}): { ok: true } | { ok: false; message: string } {
  if (!hasConfiguredBusinessHours(params.hours)) {
    return {
      ok: false,
      message: 'Este negocio no tiene horarios de atención activos para recibir reservas.',
    };
  }

  const schedule = getBusinessScheduleForLocalDate(params.hours, params.localDate);
  if (!schedule) {
    return {
      ok: false,
      message: 'Selecciona una fecha válida para la reserva.',
    };
  }

  if (schedule.is_closed || !schedule.opens_at || !schedule.closes_at) {
    return {
      ok: false,
      message: `El negocio permanece cerrado los días ${schedule.dayLabel.toLowerCase()}. Elige otro día disponible.`,
    };
  }

  const selectedMinutes = parseHHMMToMinutes(params.localTime);
  const opensMinutes = parseHHMMToMinutes(schedule.opens_at);
  const closesMinutes = parseHHMMToMinutes(schedule.closes_at);

  if (
    selectedMinutes === null
    || opensMinutes === null
    || closesMinutes === null
  ) {
    return {
      ok: false,
      message: 'Selecciona una hora válida para la reserva.',
    };
  }

  if (selectedMinutes < opensMinutes || selectedMinutes > closesMinutes) {
    return {
      ok: false,
      message: `Para el día ${schedule.dayLabel.toLowerCase()}, el horario de atención del negocio es de ${schedule.opens_at} a ${schedule.closes_at}.`,
    };
  }

  return { ok: true };
}

export function formatBusinessHoursSummary(
  hours: CommercialProfileHour[] | null | undefined,
): string {
  if (!hasConfiguredBusinessHours(hours)) {
    return 'Sin horario de atención configurado.';
  }

  const openDays = [1, 2, 3, 4, 5, 6, 0]
    .map((day) => getBusinessScheduleForWeekday(hours, day))
    .filter((item) => !item.is_closed && item.opens_at && item.closes_at);

  if (openDays.length === 0) {
    return 'Cerrado todos los días.';
  }

  return openDays
    .map((item) => `${item.dayLabel}: ${item.opens_at} – ${item.closes_at}`)
    .join(' · ');
}
