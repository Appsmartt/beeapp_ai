import type {
  CommercialModality,
  CreateCommercialRequestPayload,
} from '@beeapp/shared-types';

import type {
  BusinessCart,
  BusinessCartLine,
} from './businessCartStore';

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
  maxLength = 3000,
): string | undefined {
  const rawValue = String(value || '');

  return rawValue.trim()
    ? rawValue.slice(0, maxLength)
    : undefined;
}

function getCartRequestType(
  cart: BusinessCart,
): CreateCommercialRequestPayload['request_type'] {
  const hasProducts = cart.lines.some(
    (line) => line.offerKind === 'product',
  );
  const serviceLines = cart.lines.filter(
    (line) => line.offerKind === 'service',
  );

  if (hasProducts && serviceLines.length > 0) {
    return 'mixed_request';
  }

  if (hasProducts) {
    return 'product_order';
  }

  if (serviceLines.length > 1) {
    return 'mixed_request';
  }

  if (serviceLines[0]?.requiresBooking) {
    return 'booking_request';
  }

  return 'service_request';
}

function getLineComment(
  line: BusinessCartLine,
): string | undefined {
  return normalizeOptionalRequestText(
    line.lineComment,
    1000,
  );
}

function getServiceTermsPayload(
  line: BusinessCartLine,
): Partial<CreateCommercialRequestPayload['items'][number]> {
  if (line.offerKind !== 'service') {
    return {};
  }

  return {
    ...(line.requestedModality
      ? { requested_modality: line.requestedModality }
      : {}),
    ...(line.requestedStartsAt
      ? { requested_starts_at: line.requestedStartsAt }
      : {}),
    ...(line.requestedEndsAt
      ? { requested_ends_at: line.requestedEndsAt }
      : {}),
    ...(line.timezone
      ? { timezone: line.timezone }
      : {}),
  };
}

function validateCartLine(
  line: BusinessCartLine,
): void {
  normalizeRequiredIdentifier(
    line.commercialOfferId,
    'la oferta',
  );

  if (line.quantity < 1) {
    throw new Error(
      `La cantidad de "${line.title}" debe ser mayor que cero.`,
    );
  }

  if (
    line.offerKind === 'service'
    && line.requiresBooking
    && (!line.requestedStartsAt || !line.timezone)
  ) {
    throw new Error(
      `Selecciona fecha, hora y zona horaria para "${line.title}".`,
    );
  }

  if (
    line.requestedStartsAt
    && line.requestedEndsAt
    && Date.parse(line.requestedEndsAt)
      <= Date.parse(line.requestedStartsAt)
  ) {
    throw new Error(
      `La hora final de "${line.title}" debe ser posterior a la inicial.`,
    );
  }
}

export function buildBusinessCartRequestPayload(
  cart: BusinessCart,
): CreateCommercialRequestPayload {
  if (!cart.lines.length) {
    throw new Error(
      'Agrega al menos un producto o servicio antes de continuar.',
    );
  }

  const commercialProfileId = normalizeRequiredIdentifier(
    cart.commercialProfileId,
    'el negocio',
  );

  if (!cart.requestedModality) {
    throw new Error(
      'Selecciona una modalidad para la solicitud.',
    );
  }

  const deliveryAddress = normalizeOptionalRequestText(
    cart.deliveryAddress,
    1000,
  );
  const deliveryReference = normalizeOptionalRequestText(
    cart.deliveryReference,
    1000,
  );

  if (
    cart.requestedModality === 'delivery'
    && !deliveryAddress
  ) {
    throw new Error(
      'Ingresa la dirección para la entrega a domicilio.',
    );
  }

  cart.lines.forEach(validateCartLine);

  return {
    request_type: getCartRequestType(cart),
    commercial_profile_id: commercialProfileId,
    requested_modality: cart.requestedModality,
    ...(normalizeOptionalRequestText(cart.customerNote)
      ? {
        customer_note: normalizeOptionalRequestText(
          cart.customerNote,
        ),
      }
      : {}),
    ...(cart.requestedModality === 'delivery' && deliveryAddress
      ? { delivery_address: deliveryAddress }
      : {}),
    ...(cart.requestedModality === 'delivery' && deliveryReference
      ? { delivery_reference: deliveryReference }
      : {}),
    currency_code: 'COP',
    items: cart.lines.map((line) => ({
      commercial_offer_id: line.commercialOfferId,
      quantity: line.quantity,
      ...(getLineComment(line)
        ? { line_comment: getLineComment(line) }
        : {}),
      ...getServiceTermsPayload(line),
    })),
  };
}

export function buildProductOrderPayload(
  cart: BusinessCart,
): CreateCommercialRequestPayload {
  const payload = buildBusinessCartRequestPayload(cart);

  if (payload.request_type !== 'product_order') {
    throw new Error(
      'Este carrito contiene servicios. Envía la solicitud mixta.',
    );
  }

  return payload;
}

export type BuildServiceRequestPayloadInput = {
  commercialOfferId: string;
  commercialProfileId: string;
  requestedModality: CommercialModality | null;
  customerNote?: string | null;
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
};

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
    1000,
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
    1000,
  );

  return {
    request_type: 'service_request',
    commercial_profile_id: commercialProfileId,
    requested_modality: input.requestedModality,
    ...(customerNote ? { customer_note: customerNote } : {}),
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
