import { asRows, type Json } from './runtime';

const DEFAULT_TIMEZONE = 'America/Bogota';
const TIME_PREFIX_PATTERN = /^(\d{2}):(\d{2})/;

export interface NormalizedBusinessHour {
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
}

function resolveTimezone(timezone: unknown): string {
    const candidate = String(timezone || '').trim();
    if (!candidate) {
        return DEFAULT_TIMEZONE;
    }

    try {
        new Intl.DateTimeFormat('en-US', { timeZone: candidate });
        return candidate;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}

export function parseTimeToMinutes(value: unknown): number | null {
    const raw = String(value || '').trim();
    const match = TIME_PREFIX_PATTERN.exec(raw);
    if (!match) {
        return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

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

export function normalizeBusinessHours(rawHours: unknown): NormalizedBusinessHour[] {
    const rows = asRows<Json>(rawHours);
    const result: NormalizedBusinessHour[] = [];

    for (const row of rows) {
        const dayOfWeek = Number(row.day_of_week);
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
            continue;
        }

        const isClosed = Boolean(row.is_closed);
        const opensAtRaw = row.opens_at ? String(row.opens_at).trim().slice(0, 5) : null;
        const closesAtRaw = row.closes_at ? String(row.closes_at).trim().slice(0, 5) : null;

        result.push({
            day_of_week: dayOfWeek,
            opens_at: isClosed ? null : opensAtRaw,
            closes_at: isClosed ? null : closesAtRaw,
            is_closed: isClosed,
        });
    }

    return result;
}

export function getZonedDayAndMinutes(
    date: Date,
    timezone: unknown,
): { dayOfWeek: number; minutesOfDay: number; timeString: string } {
    const resolvedTimezone = resolveTimezone(timezone);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        calendar: 'gregory',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        month: '2-digit',
        timeZone: resolvedTimezone,
        year: 'numeric',
    });

    const parts = formatter.formatToParts(date).reduce<Record<string, number>>(
        (acc, part) => {
            if (part.type !== 'literal') {
                acc[part.type] = Number(part.value);
            }
            return acc;
        },
        {},
    );

    const year = parts.year || date.getUTCFullYear();
    const month = parts.month || (date.getUTCMonth() + 1);
    const day = parts.day || date.getUTCDate();
    const hour = (parts.hour ?? date.getUTCHours()) % 24;
    const minute = parts.minute ?? date.getUTCMinutes();

    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const minutesOfDay = hour * 60 + minute;
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    return {
        dayOfWeek,
        minutesOfDay,
        timeString,
    };
}

export function isBusinessOpenAt(
    rawHours: unknown,
    timezone: unknown,
    isAvailable: unknown = true,
    targetDate: Date = new Date(),
): boolean {
    if (isAvailable === false) {
        return false;
    }

    const hours = normalizeBusinessHours(rawHours);
    if (hours.length === 0) {
        return false;
    }

    const { dayOfWeek, minutesOfDay } = getZonedDayAndMinutes(targetDate, timezone);
    const daySchedule = hours.find((item) => item.day_of_week === dayOfWeek);

    if (!daySchedule || daySchedule.is_closed) {
        return false;
    }

    const opensMinutes = parseTimeToMinutes(daySchedule.opens_at);
    const closesMinutes = parseTimeToMinutes(daySchedule.closes_at);

    if (
        opensMinutes === null
        || closesMinutes === null
        || closesMinutes <= opensMinutes
    ) {
        return false;
    }

    return minutesOfDay >= opensMinutes && minutesOfDay <= closesMinutes;
}

export function isBusinessRowOpenNow(
    businessRow: Json | null | undefined,
    now: Date = new Date(),
): boolean {
    if (!businessRow) {
        return false;
    }

    return isBusinessOpenAt(
        businessRow.hours,
        businessRow.timezone,
        businessRow.is_available,
        now,
    );
}

const WEEKDAY_NAMES_ES: Record<number, string> = {
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miércoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sábado',
};

export function validateReservationIsoAgainstBusinessHours(params: {
    rawHours: unknown;
    timezone: unknown;
    startsAtIso: string;
}): { ok: true } | { ok: false; message: string } {
    const parsedDate = new Date(String(params.startsAtIso || '').trim());
    if (Number.isNaN(parsedDate.getTime())) {
        return {
            ok: false,
            message: 'La fecha u hora de la reserva no es válida.',
        };
    }

    const hours = normalizeBusinessHours(params.rawHours);
    if (hours.length === 0) {
        return {
            ok: false,
            message: 'Este negocio aún no tiene horarios de atención configurados.',
        };
    }

    const { dayOfWeek, minutesOfDay } = getZonedDayAndMinutes(
        parsedDate,
        params.timezone,
    );
    const dayName = WEEKDAY_NAMES_ES[dayOfWeek] || 'ese día';
    const daySchedule = hours.find((item) => item.day_of_week === dayOfWeek);

    if (!daySchedule || daySchedule.is_closed) {
        return {
            ok: false,
            message: `El negocio no tiene atención los días ${dayName}. Elige un día en que el negocio esté abierto.`,
        };
    }

    const opensMinutes = parseTimeToMinutes(daySchedule.opens_at);
    const closesMinutes = parseTimeToMinutes(daySchedule.closes_at);

    if (
        opensMinutes === null
        || closesMinutes === null
        || closesMinutes <= opensMinutes
    ) {
        return {
            ok: false,
            message: `El negocio no tiene un horario válido configurado para el ${dayName}.`,
        };
    }

    if (minutesOfDay < opensMinutes || minutesOfDay > closesMinutes) {
        return {
            ok: false,
            message: `Para el ${dayName}, la hora debe estar dentro del horario del negocio (${daySchedule.opens_at} a ${daySchedule.closes_at}).`,
        };
    }

    return { ok: true };
}

