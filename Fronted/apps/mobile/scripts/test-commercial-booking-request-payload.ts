import {
buildBookingRequestPayload,
} from '../src/features/buddyservices/commercialBookingRequestPayload';

function assert(
condition: unknown,
message: string,
): asserts condition {
if (!condition) {
throw new Error(message);
}
}

const payload = buildBookingRequestPayload({
commercialOfferId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
commercialProfileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
requestedModality: 'at_establishment',
customerNote: 'Necesito una atención breve.',
localDate: '2026-09-10',
localTime: '09:30',
timezone: 'America/Bogota',
now: new Date('2026-09-09T00:00:00.000Z'),
});

assert(
payload.request_type === 'booking_request',
'El payload no usa booking_request.',
);
assert(
payload.commercial_profile_id
=== 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'El perfil comercial no se preservó.',
);
assert(
payload.items.length === 1
&& payload.items[0].quantity === 1,
'Una reserva debe incluir exactamente un servicio.',
);
assert(
payload.items[0].line_comment === (
'Fecha y hora solicitadas: 2026-09-10T14:30:00.000Z '
+ '(America/Bogota). La fecha queda sujeta a confirmación '
+ 'del negocio.'
),
'La fecha solicitada no quedó normalizada en el comentario.',
);
assert(
payload.customer_note === 'Necesito una atención breve.',
'La necesidad del cliente no se preservó.',
);

let deliveryError = '';

try {
buildBookingRequestPayload({
commercialOfferId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
commercialProfileId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
requestedModality: 'delivery',
localDate: '2026-09-10',
localTime: '09:30',
timezone: 'America/Bogota',
now: new Date('2026-09-09T00:00:00.000Z'),
});
} catch (error) {
deliveryError = error instanceof Error ? error.message : '';
}

assert(
deliveryError === 'Ingresa la dirección para la entrega a domicilio.',
'La dirección requerida no se validó.',
);

console.log(
'OK: payload de booking_request validado sin decidir disponibilidad local.',
);
