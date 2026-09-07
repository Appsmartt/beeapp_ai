import assert from 'node:assert/strict';

import type {
CommercialRequestDetail,
CommercialRequestDetailItem,
} from '@beeapp/shared-types';

import {
getCommercialRequestItemLabel,
getCommercialRequestItemPriceLabel,
getCommercialRequestItemsTitle,
getCommercialRequestLineComment,
getCommercialRequestTotalLabel,
getCommercialRequestTotalState,
} from '../src/features/buddyservices/commercialRequestDetailPresentation';

function makeItem(
overrides: Partial<CommercialRequestDetailItem> = {},
): CommercialRequestDetailItem {
return {
id: 'item-1',
commercial_offer_id: 'offer-1',
sort_order: 0,
quantity: 1,
offer_kind: 'product',
title: 'Oferta de prueba',
description: null,
pricing_strategy: 'fixed',
unit_price_amount: 10000,
currency_code: 'COP',
modality: 'pickup',
duration_minutes: null,
requires_booking: false,
payment_policy: null,
line_total_amount: 10000,
offer_snapshot: {},
original_terms: {},
created_at: '2026-09-07T00:00:00.000Z',
updated_at: null,
...overrides,
};
}

function makeRequest(
overrides: Partial<CommercialRequestDetail> = {},
): CommercialRequestDetail {
return {
id: 'request-1',
code: 'BS-2026-00000001',
client_id: 'client-1',
commercial_profile_id: 'business-1',
request_type: 'product_order',
status: 'submitted',
expires_at: null,
customer_note: null,
requested_modality: 'pickup',
delivery_address: null,
delivery_reference: null,
subtotal_amount: 10000,
delivery_fee_amount: null,
total_amount: 10000,
currency_code: 'COP',
final_terms: {},
created_at: '2026-09-07T00:00:00.000Z',
updated_at: '2026-09-07T00:00:00.000Z',
items: [makeItem()],
...overrides,
};
}

function formatCurrency(amount: number | null): string {
return amount === null ? 'Pendiente' : `$${amount}`;
}

function run(): void {
assert.equal(
getCommercialRequestItemsTitle('product_order'),
'Productos solicitados',
);
assert.equal(
getCommercialRequestItemsTitle('service_request'),
'Servicio solicitado',
);
assert.equal(
getCommercialRequestItemsTitle('booking_request'),
'Reserva solicitada',
);

assert.equal(
getCommercialRequestItemLabel(makeItem()),
'Producto',
);
assert.equal(
getCommercialRequestItemLabel(
makeItem({
offer_kind: 'service',
requires_booking: false,
}),
),
'Servicio',
);
assert.equal(
getCommercialRequestItemLabel(
makeItem({
offer_kind: 'service',
requires_booking: true,
}),
),
'Reserva',
);

assert.equal(
getCommercialRequestItemPriceLabel(
makeItem({
pricing_strategy: 'fixed',
line_total_amount: 20000,
}),
formatCurrency,
),
'$20000',
);
assert.equal(
getCommercialRequestItemPriceLabel(
makeItem({
pricing_strategy: 'free',
unit_price_amount: null,
line_total_amount: 0,
}),
formatCurrency,
),
'Gratis',
);
assert.equal(
getCommercialRequestItemPriceLabel(
makeItem({
pricing_strategy: 'starting_at',
unit_price_amount: 30000,
line_total_amount: null,
}),
formatCurrency,
),
'Desde $30000',
);
assert.equal(
getCommercialRequestItemPriceLabel(
makeItem({
pricing_strategy: 'to_be_confirmed',
unit_price_amount: null,
line_total_amount: null,
}),
formatCurrency,
),
'Precio por confirmar',
);

assert.equal(
getCommercialRequestLineComment(
makeItem({
original_terms: {
line_comment: '  Por favor empacar con cuidado.  ',
},
}),
),
'Por favor empacar con cuidado.',
);
assert.equal(
getCommercialRequestLineComment(
makeItem({
original_terms: {
line_comment: '   ',
},
}),
),
null,
);
assert.equal(
getCommercialRequestLineComment(
makeItem({
original_terms: {
line_comment: 42,
},
}),
),
null,
);

const confirmedRequest = makeRequest();

assert.equal(
getCommercialRequestTotalState(confirmedRequest),
'confirmed',
);
assert.equal(
getCommercialRequestTotalLabel(
getCommercialRequestTotalState(confirmedRequest),
),
'Total confirmado',
);

const estimatedRequest = makeRequest({
items: [
makeItem({
pricing_strategy: 'starting_at',
unit_price_amount: 30000,
line_total_amount: null,
}),
],
subtotal_amount: null,
total_amount: 30000,
});

assert.equal(
getCommercialRequestTotalState(estimatedRequest),
'estimated',
);
assert.equal(
getCommercialRequestTotalLabel(
getCommercialRequestTotalState(estimatedRequest),
),
'Total estimado',
);

const pendingRequest = makeRequest({
items: [
makeItem({
pricing_strategy: 'to_be_confirmed',
unit_price_amount: null,
line_total_amount: null,
}),
],
subtotal_amount: null,
total_amount: null,
});

assert.equal(
getCommercialRequestTotalState(pendingRequest),
'pending_confirmation',
);
assert.equal(
getCommercialRequestTotalLabel(
getCommercialRequestTotalState(pendingRequest),
),
'Total pendiente de confirmación',
);

console.log(
'OK: El detalle formal presenta tipo, precios, comentario y total correctamente.',
);
}

run();
