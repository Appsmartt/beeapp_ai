import type {
  CommercialDeliveryFeeMode,
} from '@beeapp/shared-types';

import type {
  BusinessCart,
  BusinessCartLine,
  BusinessCartOfferKind,
} from './businessCartStore';

export type BusinessCartTotalState =
  | 'confirmed'
  | 'estimated'
  | 'pending_confirmation';

export type BusinessCartPresentationKind =
  | 'purchase'
  | 'reservation'
  | 'mixed';

export type BusinessCartLineSummary = {
  lineId: string;
  offerKind: BusinessCartOfferKind;
  requiresBooking: boolean;
  quantity: number;
  unitPriceAmount: number | null;
  lineTotalAmount: number | null;
  pricingStrategy: BusinessCartLine['pricingStrategy'];
  requestedStartsAt: string | null;
  requestedEndsAt: string | null;
  timezone: string | null;
};

export type BusinessCartSummary = {
  currencyCode: 'COP';
  lineCount: number;
  itemCount: number;
  productLineCount: number;
  productItemCount: number;
  serviceLineCount: number;
  serviceItemCount: number;
  bookingServiceLineCount: number;
  presentationKind: BusinessCartPresentationKind;
  subtotalAmount: number | null;
  deliveryFeeMode: CommercialDeliveryFeeMode;
  deliveryFeeAmount: number | null;
  totalAmount: number | null;
  totalState: BusinessCartTotalState;
  lines: BusinessCartLineSummary[];
};

function hasReferencePrice(
  line: BusinessCartLine,
): boolean {
  if (line.pricingStrategy === 'free') {
    return true;
  }

  return (
    (line.pricingStrategy === 'fixed'
      || line.pricingStrategy === 'starting_at')
    && line.unitPriceAmount !== null
  );
}

function getLineTotal(
  line: BusinessCartLine,
): number | null {
  if (line.pricingStrategy === 'free') {
    return 0;
  }

  if (
    (line.pricingStrategy !== 'fixed'
      && line.pricingStrategy !== 'starting_at')
    || line.unitPriceAmount === null
  ) {
    return null;
  }

  return line.unitPriceAmount * line.quantity;
}

function getPresentationKind(
  cart: BusinessCart,
): BusinessCartPresentationKind {
  const hasProducts = cart.lines.some(
    (line) => line.offerKind === 'product',
  );
  const hasServices = cart.lines.some(
    (line) => line.offerKind === 'service',
  );

  if (hasProducts && hasServices) {
    return 'mixed';
  }

  if (hasServices) {
    return 'reservation';
  }

  return 'purchase';
}

export function getBusinessCartSummary(
  cart: BusinessCart,
  options: {
    deliveryFeeMode?: CommercialDeliveryFeeMode;
    deliveryFeeAmount?: number | null;
  } = {},
): BusinessCartSummary {
  const deliveryFeeMode = (
    options.deliveryFeeMode
    || 'not_offered'
  );

  const deliveryFeeAmount = (
    deliveryFeeMode === 'free'
      ? 0
      : (
        deliveryFeeMode === 'fixed'
        && typeof options.deliveryFeeAmount === 'number'
        && Number.isFinite(options.deliveryFeeAmount)
        && options.deliveryFeeAmount >= 0
      )
        ? Math.floor(options.deliveryFeeAmount)
        : null
  );

  const lines = cart.lines.map((line) => ({
    lineId: line.id,
    offerKind: line.offerKind,
    requiresBooking: line.requiresBooking,
    quantity: line.quantity,
    unitPriceAmount: line.unitPriceAmount,
    lineTotalAmount: getLineTotal(line),
    pricingStrategy: line.pricingStrategy,
    requestedStartsAt: line.requestedStartsAt,
    requestedEndsAt: line.requestedEndsAt,
    timezone: line.timezone,
  }));

  const allLinePricesKnown = cart.lines.every(
    hasReferencePrice,
  );
  const subtotalAmount = allLinePricesKnown
    ? lines.reduce(
      (total, line) => total + (line.lineTotalAmount || 0),
      0,
    )
    : null;

  const hasPendingPrice = cart.lines.some(
    (line) => line.pricingStrategy === 'to_be_confirmed',
  );
  const hasStartingAtPrice = cart.lines.some(
    (line) => line.pricingStrategy === 'starting_at',
  );
  const hasPendingDelivery = (
    deliveryFeeMode === 'to_be_confirmed'
  );

  const totalAmount = (
    subtotalAmount !== null
    && deliveryFeeAmount !== null
      ? subtotalAmount + deliveryFeeAmount
      : (
        deliveryFeeMode === 'not_offered'
        && subtotalAmount !== null
      )
        ? subtotalAmount
        : null
  );

  const productLines = cart.lines.filter(
    (line) => line.offerKind === 'product',
  );
  const serviceLines = cart.lines.filter(
    (line) => line.offerKind === 'service',
  );

  const totalState: BusinessCartTotalState = (
    hasPendingPrice
    || hasPendingDelivery
    || totalAmount === null
  )
    ? 'pending_confirmation'
    : hasStartingAtPrice
      ? 'estimated'
      : 'confirmed';

  return {
    currencyCode: 'COP',
    lineCount: cart.lines.length,
    itemCount: cart.lines.reduce(
      (total, line) => total + line.quantity,
      0,
    ),
    productLineCount: productLines.length,
    productItemCount: productLines.reduce(
      (total, line) => total + line.quantity,
      0,
    ),
    serviceLineCount: serviceLines.length,
    serviceItemCount: serviceLines.reduce(
      (total, line) => total + line.quantity,
      0,
    ),
    bookingServiceLineCount: serviceLines.filter(
      (line) => line.requiresBooking,
    ).length,
    presentationKind: getPresentationKind(cart),
    subtotalAmount,
    deliveryFeeMode,
    deliveryFeeAmount,
    totalAmount,
    totalState,
    lines,
  };
}

export function getBusinessCartTotalStateLabel(
  state: BusinessCartTotalState,
): string {
  if (state === 'confirmed') {
    return 'Total confirmado';
  }

  if (state === 'estimated') {
    return 'Total estimado';
  }

  return 'Total pendiente de confirmación';
}

export function getBusinessCartPresentationLabel(
  kind: BusinessCartPresentationKind,
): string {
  if (kind === 'mixed') {
    return 'Compra y reserva';
  }

  if (kind === 'reservation') {
    return 'Reserva';
  }

  return 'Compra';
}

export function getBusinessCartDeliveryLabel(
  summary: BusinessCartSummary,
): string {
  if (summary.deliveryFeeMode === 'free') {
    return 'Domicilio gratis';
  }

  if (summary.deliveryFeeMode === 'fixed') {
    return summary.deliveryFeeAmount === null
      ? 'Domicilio por confirmar'
      : 'Domicilio fijo';
  }

  if (summary.deliveryFeeMode === 'to_be_confirmed') {
    return 'Domicilio por confirmar';
  }

  return 'Sin domicilio';
}
