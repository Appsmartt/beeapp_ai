import assert from 'node:assert/strict';

import type {
CommercialPublicOffer,
} from '@beeapp/shared-types';

import {
canSubmitServiceRequest,
getServiceRequestPriceHint,
getServiceRequestPriceLabel,
isNonBookableServiceOffer,
shouldRefreshServiceOfferAfterError,
} from '../src/features/buddyservices/serviceRequestFlow';

function offer(
overrides: Partial<CommercialPublicOffer> = {},
): CommercialPublicOffer {
return {
id: 'service-1',
commercial_profile_id: 'business-1',
catalog_id: 'catalog-1',
offer_kind: 'service',
title: 'Servicio de prueba',
description: null,
pricing_strategy: 'fixed',
base_price_amount: 50000,
currency_code: 'COP',
modalities: ['at_establishment'],
duration_minutes: null,
requires_booking: false,
payment_policy: null,
images: [],
created_at: null,
updated_at: null,
...overrides,
};
}

function formatCurrency(amount: number | null): string {
return amount === null ? 'Por confirmar' : `$${amount}`;
}

function run(): void {
const nonBookableService = offer();

assert.equal(
isNonBookableServiceOffer(nonBookableService),
true,
);
assert.equal(
isNonBookableServiceOffer(
offer({ offer_kind: 'product' }),
),
false,
);
assert.equal(
isNonBookableServiceOffer(
offer({ requires_booking: true }),
),
false,
);
assert.equal(isNonBookableServiceOffer(null), false);

assert.equal(
canSubmitServiceRequest({
offer: nonBookableService,
requestedModality: 'at_establishment',
deliveryAddress: '',
submitting: false,
}),
true,
);
assert.equal(
canSubmitServiceRequest({
offer: nonBookableService,
requestedModality: 'delivery',
deliveryAddress: 'Carrera 7 # 72-41',
submitting: false,
}),
true,
);
assert.equal(
canSubmitServiceRequest({
offer: nonBookableService,
requestedModality: 'delivery',
deliveryAddress: '   ',
submitting: false,
}),
false,
);
assert.equal(
canSubmitServiceRequest({
offer: nonBookableService,
requestedModality: null,
deliveryAddress: null,
submitting: false,
}),
false,
);
assert.equal(
canSubmitServiceRequest({
offer: nonBookableService,
requestedModality: 'at_establishment',
deliveryAddress: null,
submitting: true,
}),
false,
);
assert.equal(
canSubmitServiceRequest({
offer: offer({ requires_booking: true }),
requestedModality: 'at_establishment',
deliveryAddress: null,
submitting: false,
}),
false,
);

assert.equal(
getServiceRequestPriceLabel(
offer({
pricing_strategy: 'fixed',
base_price_amount: 50000,
}),
formatCurrency,
),
'$50000',
);
assert.equal(
getServiceRequestPriceLabel(
offer({
pricing_strategy: 'starting_at',
base_price_amount: 30000,
}),
formatCurrency,
),
'Desde $30000',
);
assert.equal(
getServiceRequestPriceLabel(
offer({
pricing_strategy: 'to_be_confirmed',
base_price_amount: null,
}),
formatCurrency,
),
'Precio por confirmar',
);
assert.equal(
getServiceRequestPriceLabel(
offer({
pricing_strategy: 'free',
base_price_amount: null,
}),
formatCurrency,
),
'Gratis',
);

assert.match(
getServiceRequestPriceHint(
offer({ pricing_strategy: 'starting_at' }),
),
/No es un total final/,
);
assert.match(
getServiceRequestPriceHint(
offer({ pricing_strategy: 'to_be_confirmed' }),
),
/No se muestra un total estimado/,
);

[400, 404, 409, 422].forEach((status) => {
assert.equal(
shouldRefreshServiceOfferAfterError(status),
true,
);
});

[0, 200, 401, 403, 500, null].forEach((status) => {
assert.equal(
shouldRefreshServiceOfferAfterError(status),
false,
);
});

console.log(
'OK: serviceRequestFlow valida servicio, formulario, precios y refresco remoto.',
);
}

run();
