import type {
CommercialModality,
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
...(line.lineComment?.trim()
? {
line_comment: line.lineComment.trim().slice(0, 1000),
}
: {}),
})),
};
}

export type BuildServiceRequestPayloadInput = {
  commercialOfferId: string;
  commercialProfileId: string;
  requestedModality: CommercialModality | null;
  customerNote?: string | null;
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
};

function normalizeRequiredIdentifier(
  value: string | null | undefined,
  label: string,
): string {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw new Error(`No fue posible identificar ${label}.`);
  }

  return normalized;
}

function normalizeOptionalRequestText(
  value: string | null | undefined,
): string | undefined {
  const normalized = String(value || '').trim();

  return normalized || undefined;
}

export function buildServiceRequestPayload(
  input: BuildServiceRequestPayloadInput,
): CreateCommercialRequestPayload {
  const commercialOfferId = normalizeRequiredIdentifier(
    input.commercialOfferId,
    'el servicio',
  );
  const commercialProfileId = normalizeRequiredIdentifier(
    input.commercialProfileId,
    'el negocio',
  );

  if (!input.requestedModality) {
    throw new Error(
      'Selecciona una modalidad para la solicitud.',
    );
  }

  const deliveryAddress = normalizeOptionalRequestText(
    input.deliveryAddress,
  );

  if (
    input.requestedModality === 'delivery'
    && !deliveryAddress
  ) {
    throw new Error(
      'Ingresa la dirección para la entrega a domicilio.',
    );
  }

  const customerNote = normalizeOptionalRequestText(
    input.customerNote,
  );
  const deliveryReference = normalizeOptionalRequestText(
    input.deliveryReference,
  );

  return {
    request_type: 'service_request',
    commercial_profile_id: commercialProfileId,
    requested_modality: input.requestedModality,
    ...(customerNote
      ? { customer_note: customerNote }
      : {}),
    ...(input.requestedModality === 'delivery' && deliveryAddress
      ? { delivery_address: deliveryAddress }
      : {}),
    ...(input.requestedModality === 'delivery' && deliveryReference
      ? { delivery_reference: deliveryReference }
      : {}),
    currency_code: 'COP',
    items: [
      {
        commercial_offer_id: commercialOfferId,
        quantity: 1,
      },
    ],
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
