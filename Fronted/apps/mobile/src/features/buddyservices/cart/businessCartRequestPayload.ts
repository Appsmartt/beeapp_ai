import type {
CreateCommercialRequestPayload,
} from '@beeapp/shared-types';

import type {
BusinessCart,
} from './businessCartStore';

export function buildProductOrderPayload(
cart: BusinessCart,
): CreateCommercialRequestPayload {
if (!cart.lines.length) {
throw new Error(
'Agrega al menos un producto antes de continuar.',
);
}

if (!cart.requestedModality) {
throw new Error(
'Selecciona una modalidad para la solicitud.',
);
}

if (
cart.requestedModality === 'delivery'
&& !cart.deliveryAddress?.trim()
) {
throw new Error(
'Ingresa la dirección para la entrega a domicilio.',
);
}

return {
request_type: 'product_order',
commercial_profile_id: cart.commercialProfileId,
requested_modality: cart.requestedModality,
...(cart.customerNote?.trim()
? {
customer_note: cart.customerNote.trim(),
}
: {}),
...(cart.requestedModality === 'delivery'
&& cart.deliveryAddress?.trim()
? {
delivery_address: cart.deliveryAddress.trim(),
}
: {}),
...(cart.requestedModality === 'delivery'
&& cart.deliveryReference?.trim()
? {
delivery_reference: cart.deliveryReference.trim(),
}
: {}),
currency_code: 'COP',
items: cart.lines.map((line) => ({
commercial_offer_id: line.commercialOfferId,
quantity: line.quantity,
})),
};
}

export function createCommercialRequestIdempotencyKey(): string {
const randomPart = Math.random()
.toString(36)
.slice(2, 12);

return [
'commercial-request',
Date.now().toString(36),
randomPart || 'retry',
].join('-');
}
