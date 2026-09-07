import assert from 'node:assert/strict';

import {
formatCommercialRequestListAmount,
formatCommercialRequestListDate,
getCommercialRequestListItemCountLabel,
getCommercialRequestListStatusLabel,
getCommercialRequestListStatusTone,
getCommercialRequestListTypeLabel,
} from '../src/features/buddyservices/commercialRequestListPresentation';

assert.equal(
getCommercialRequestListTypeLabel('product_order'),
'Compra',
'Product orders must use the purchase label',
);

assert.equal(
getCommercialRequestListTypeLabel('service_request'),
'Servicio',
'Service requests must use the service label',
);

assert.equal(
getCommercialRequestListTypeLabel('booking_request'),
'Reserva',
'Booking requests must use the reservation label',
);

assert.equal(
getCommercialRequestListStatusLabel('payment_pending'),
'Pago pendiente',
'Payment pending status must be readable',
);

assert.equal(
getCommercialRequestListStatusLabel('unknown_status'),
'unknown_status',
'Unknown statuses must remain visible',
);

assert.equal(
getCommercialRequestListStatusTone('confirmed'),
'success',
'Confirmed requests must use success tone',
);

assert.equal(
getCommercialRequestListStatusTone('payment_submitted'),
'warning',
'Submitted payments must use warning tone',
);

assert.equal(
getCommercialRequestListStatusTone('cancelled'),
'danger',
'Cancelled requests must use danger tone',
);

assert.equal(
getCommercialRequestListStatusTone('under_review'),
'neutral',
'Review requests must use neutral tone',
);

assert.equal(
getCommercialRequestListItemCountLabel(1),
'1 ítem',
'One item must use singular label',
);

assert.equal(
getCommercialRequestListItemCountLabel(3),
'3 ítems',
'Multiple items must use plural label',
);

assert.equal(
formatCommercialRequestListAmount(null, 'COP'),
'Pendiente de confirmación',
'Null totals must remain pending',
);

assert.equal(
formatCommercialRequestListDate('invalid-date'),
'Fecha no disponible',
'Invalid dates must have a safe fallback',
);

console.log(
'Commercial request list presentation checks passed.',
);
