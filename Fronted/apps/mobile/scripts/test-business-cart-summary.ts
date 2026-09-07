import assert from 'node:assert/strict';

import {
getBusinessCartDeliveryLabel,
getBusinessCartSummary,
getBusinessCartTotalStateLabel,
} from '../src/features/buddyservices/cart/businessCartSummary';

import type {
BusinessCart,
BusinessCartLine,
} from '../src/features/buddyservices/cart/businessCartStore';

function line(
overrides: Partial<BusinessCartLine> = {},
): BusinessCartLine {
return {
id: 'line-1',
commercialOfferId: 'offer-1',
commercialProfileId: 'business-1',
offerKind: 'product',
title: 'Producto de prueba',
quantity: 1,
lineComment: null,
pricingStrategy: 'fixed',
unitPriceAmount: 10000,
currencyCode: 'COP',
requestedModality: 'delivery',
imageUrl: null,
...overrides,
};
}

function cart(
lines: BusinessCartLine[],
): BusinessCart {
return {
version: 1,
commercialProfileId: 'business-1',
commercialProfileName: 'Negocio de prueba',
requestedModality: 'delivery',
customerNote: null,
deliveryAddress: 'Calle 1 # 2-3',
deliveryReference: null,
deliveryFeeMode: 'not_offered',
deliveryFeeAmount: null,
submissionIdempotencyKey: null,
lines,
updatedAt: '2026-09-07T00:00:00.000Z',
};
}

function run(): void {
const fixed = getBusinessCartSummary(
cart([
line({
id: 'line-fixed-1',
quantity: 2,
unitPriceAmount: 10000,
}),
line({
id: 'line-fixed-2',
commercialOfferId: 'offer-2',
quantity: 3,
unitPriceAmount: 3000,
}),
]),
{
deliveryFeeMode: 'fixed',
deliveryFeeAmount: 5000,
},
);

assert.equal(fixed.subtotalAmount, 29000);
assert.equal(fixed.deliveryFeeAmount, 5000);
assert.equal(fixed.totalAmount, 34000);
assert.equal(fixed.totalState, 'confirmed');
assert.equal(
getBusinessCartTotalStateLabel(fixed.totalState),
'Total confirmado',
);
assert.equal(
getBusinessCartDeliveryLabel(fixed),
'Domicilio fijo',
);

const free = getBusinessCartSummary(
cart([
line({
pricingStrategy: 'free',
unitPriceAmount: null,
quantity: 3,
}),
]),
{
deliveryFeeMode: 'free',
},
);

assert.equal(free.subtotalAmount, 0);
assert.equal(free.deliveryFeeAmount, 0);
assert.equal(free.totalAmount, 0);
assert.equal(free.totalState, 'confirmed');
assert.equal(
getBusinessCartDeliveryLabel(free),
'Domicilio gratis',
);

const startingAt = getBusinessCartSummary(
cart([
line({
pricingStrategy: 'starting_at',
unitPriceAmount: 25000,
quantity: 2,
}),
]),
{
deliveryFeeMode: 'fixed',
deliveryFeeAmount: 7000,
},
);

assert.equal(startingAt.subtotalAmount, 50000);
assert.equal(startingAt.deliveryFeeAmount, 7000);
assert.equal(startingAt.totalAmount, 57000);
assert.equal(startingAt.totalState, 'estimated');
assert.equal(
getBusinessCartTotalStateLabel(startingAt.totalState),
'Total estimado',
);

const pendingPrice = getBusinessCartSummary(
cart([
line({
pricingStrategy: 'to_be_confirmed',
unitPriceAmount: null,
}),
]),
{
deliveryFeeMode: 'free',
},
);

assert.equal(pendingPrice.subtotalAmount, null);
assert.equal(pendingPrice.deliveryFeeAmount, 0);
assert.equal(pendingPrice.totalAmount, null);
assert.equal(
pendingPrice.totalState,
'pending_confirmation',
);
assert.equal(
getBusinessCartTotalStateLabel(
pendingPrice.totalState,
),
'Total pendiente de confirmación',
);

const pendingDelivery = getBusinessCartSummary(
cart([
line({
pricingStrategy: 'fixed',
unitPriceAmount: 10000,
}),
]),
{
deliveryFeeMode: 'to_be_confirmed',
},
);

assert.equal(pendingDelivery.subtotalAmount, 10000);
assert.equal(pendingDelivery.deliveryFeeAmount, null);
assert.equal(pendingDelivery.totalAmount, null);
assert.equal(
pendingDelivery.totalState,
'pending_confirmation',
);
assert.equal(
getBusinessCartDeliveryLabel(pendingDelivery),
'Domicilio por confirmar',
);

console.log(
'OK: Todas las pruebas de businessCartSummary pasaron.',
);
}

run();
