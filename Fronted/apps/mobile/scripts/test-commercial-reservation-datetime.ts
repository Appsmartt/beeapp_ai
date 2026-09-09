import {
COMMERCIAL_RESERVATION_PENDING_NOTICE,
formatCommercialReservationDateTime,
getCommercialReservationHoldInfo,
isValidCommercialLocalDate,
isValidCommercialLocalTime,
isValidCommercialTimezone,
toCommercialReservationStartsAtIso,
} from '../src/features/buddyservices/commercialReservationDateTime';

function assert(
condition: unknown,
message: string,
): asserts condition {
if (!condition) {
throw new Error(message);
}
}

const now = new Date('2026-09-09T00:00:00.000Z');

assert(
isValidCommercialLocalDate('2026-09-10'),
'La fecha válida fue rechazada.',
);
assert(
!isValidCommercialLocalDate('2026-02-30'),
'La fecha imposible fue aceptada.',
);
assert(
isValidCommercialLocalTime('09:30'),
'La hora válida fue rechazada.',
);
assert(
!isValidCommercialLocalTime('24:00'),
'La hora imposible fue aceptada.',
);
assert(
isValidCommercialTimezone('America/Bogota'),
'La zona horaria IANA válida fue rechazada.',
);
assert(
!isValidCommercialTimezone('Bogota'),
'La zona horaria inválida fue aceptada.',
);

const startsAt = toCommercialReservationStartsAtIso({
localDate: '2026-09-10',
localTime: '09:30',
timezone: 'America/Bogota',
now,
});

assert(
startsAt === '2026-09-10T14:30:00.000Z',
`ISO inesperado para Bogotá: ${startsAt}`,
);

const formatted = formatCommercialReservationDateTime(
startsAt,
'America/Bogota',
);

assert(
formatted !== 'Fecha no disponible'
&& formatted.includes('2026'),
'La fecha de reserva no se pudo presentar.',
);

const activeHold = getCommercialReservationHoldInfo(
'2026-09-09T00:01:30.000Z',
now,
);

assert(
activeHold.isActive
&& activeHold.remainingSeconds === 90
&& activeHold.expiresAtLabel === '2026-09-09T00:01:30.000Z',
'El hold activo no se interpretó correctamente.',
);

const expiredHold = getCommercialReservationHoldInfo(
'2026-09-08T23:59:59.000Z',
now,
);

assert(
!expiredHold.isActive
&& expiredHold.remainingSeconds === 0,
'El hold vencido no se interpretó correctamente.',
);

assert(
COMMERCIAL_RESERVATION_PENDING_NOTICE === (
'Una fecha retenida o propuesta no está confirmada hasta el acuerdo final.'
),
'El aviso obligatorio de reserva cambió.',
);

console.log(
'OK: utilidades de fecha, timezone y hold de reservas validadas.',
);
