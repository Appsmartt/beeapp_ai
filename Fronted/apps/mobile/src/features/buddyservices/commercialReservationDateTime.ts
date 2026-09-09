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
