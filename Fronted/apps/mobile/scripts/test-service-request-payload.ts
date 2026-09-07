import assert from 'node:assert/strict';

import {
buildServiceRequestPayload,
} from '../src/features/buddyservices/cart/businessCartRequestPayload';

function run(): void {
const inPersonPayload = buildServiceRequestPayload({
commercialOfferId: 'service-offer-1',
commercialProfileId: 'business-1',
requestedModality: 'at_establishment',
customerNote: 'Necesito atención esta semana.',
deliveryAddress: 'No debe enviarse',
deliveryReference: 'No debe enviarse',
});

assert.deepEqual(inPersonPayload, {
request_type: 'service_request',
commercial_profile_id: 'business-1',
requested_modality: 'at_establishment',
customer_note: 'Necesito atención esta semana.',
currency_code: 'COP',
items: [
{
commercial_offer_id: 'service-offer-1',
quantity: 1,
},
],
});

const deliveryPayload = buildServiceRequestPayload({
commercialOfferId: 'service-offer-2',
commercialProfileId: 'business-2',
requestedModality: 'delivery',
customerNote: 'Por favor confirmar disponibilidad.',
deliveryAddress: 'Carrera 7 # 72-41',
deliveryReference: 'Recepción principal',
});

assert.deepEqual(deliveryPayload, {
request_type: 'service_request',
commercial_profile_id: 'business-2',
requested_modality: 'delivery',
customer_note: 'Por favor confirmar disponibilidad.',
delivery_address: 'Carrera 7 # 72-41',
delivery_reference: 'Recepción principal',
currency_code: 'COP',
items: [
{
commercial_offer_id: 'service-offer-2',
quantity: 1,
},
],
});

assert.throws(
() => buildServiceRequestPayload({
commercialOfferId: 'service-offer-3',
commercialProfileId: 'business-3',
requestedModality: null,
}),
/Selecciona una modalidad para la solicitud/,
);

assert.throws(
() => buildServiceRequestPayload({
commercialOfferId: 'service-offer-4',
commercialProfileId: 'business-4',
requestedModality: 'delivery',
}),
/Ingresa la dirección para la entrega a domicilio/,
);

const serializedPayload = JSON.stringify(deliveryPayload);

assert.equal(
serializedPayload.includes('unitPriceAmount'),
false,
);
assert.equal(
serializedPayload.includes('deliveryFeeAmount'),
false,
);
assert.equal(
serializedPayload.includes('lineComment'),
false,
);
assert.equal(
serializedPayload.includes('imageUrl'),
false,
);

console.log(
'OK: El payload de service_request valida modalidad y dirección sin enviar datos locales.',
);
}

run();
