import assert from 'node:assert/strict';

import {
buildProductOrderPayload,
createCommercialRequestIdempotencyKey,
} from '../src/features/buddyservices/cart/businessCartRequestPayload';

import type {
BusinessCart,
} from '../src/features/buddyservices/cart/businessCartStore';

const cart: BusinessCart = {
version: 1,
commercialProfileId: 'business-1',
commercialProfileName: 'Negocio de prueba',
requestedModality: 'delivery',
customerNote: '  Tocar el timbre.  ',
deliveryAddress: '  Calle 10 # 20-30  ',
deliveryReference: '  Torre B  ',
deliveryFeeMode: 'fixed',
deliveryFeeAmount: 5000,
submissionIdempotencyKey: null,
lines: [
{
id: 'local-line-1',
commercialOfferId: 'offer-1',
commercialProfileId: 'business-1',
offerKind: 'product',
title: 'Producto de prueba',
quantity: 2,
lineComment: '  No enviar en bolsa.  ',
pricingStrategy: 'fixed',
unitPriceAmount: 25000,
currencyCode: 'COP',
requestedModality: 'delivery',
imageUrl: 'https://example.com/image.jpg',
},
],
updatedAt: '2026-09-07T00:00:00.000Z',
};

const payload = buildProductOrderPayload(cart);

assert.deepEqual(payload, {
request_type: 'product_order',
commercial_profile_id: 'business-1',
requested_modality: 'delivery',
customer_note: 'Tocar el timbre.',
delivery_address: 'Calle 10 # 20-30',
delivery_reference: 'Torre B',
currency_code: 'COP',
items: [
{
commercial_offer_id: 'offer-1',
quantity: 2,
line_comment: 'No enviar en bolsa.',
},
],
});

const cartWithoutLineComment: BusinessCart = {
...cart,
lines: [
{
...cart.lines[0],
id: 'local-line-2',
lineComment: '   ',
},
],
};

const payloadWithoutLineComment = buildProductOrderPayload(
cartWithoutLineComment,
);

assert.equal(
'line_comment' in payloadWithoutLineComment.items[0],
false,
);

const cartWithLongLineComment: BusinessCart = {
...cart,
lines: [
{
...cart.lines[0],
id: 'local-line-3',
lineComment: 'x'.repeat(1200),
},
],
};

const payloadWithLongLineComment = buildProductOrderPayload(
cartWithLongLineComment,
);

assert.equal(
payloadWithLongLineComment.items[0].line_comment?.length,
1000,
);

assert.equal(
JSON.stringify(payload).includes('deliveryFeeAmount'),
false,
);
assert.equal(
JSON.stringify(payload).includes('unitPriceAmount'),
false,
);
assert.equal(
JSON.stringify(payload).includes('lineComment'),
false,
);
assert.equal(
JSON.stringify(payload).includes('private_instructions'),
false,
);
assert.equal(
JSON.stringify(payload).includes('signed_url'),
false,
);
assert.equal(
JSON.stringify(payload).includes('imageUrl'),
false,
);

console.log(
'OK: El payload de solicitud omite datos locales y precios calculados.',
);

const firstIdempotencyKey = (
createCommercialRequestIdempotencyKey()
);
const secondIdempotencyKey = (
createCommercialRequestIdempotencyKey()
);

assert.match(
firstIdempotencyKey,
/^commercial-request-[a-z0-9]+-[a-z0-9]+$/,
);
assert.notEqual(
firstIdempotencyKey,
secondIdempotencyKey,
);

console.log(
'OK: La clave de idempotencia tiene formato válido y es distinta por intento.',
);
