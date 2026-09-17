import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  CommercialDeliveryFeeMode,
  CommercialModality,
  CommercialPricingStrategy,
} from '@beeapp/shared-types';

const BUSINESS_CART_STORAGE_PREFIX = 'beeapp.buddyservices.cart.v1';
const BUSINESS_CART_STORAGE_VERSION = 2;

export type BusinessCartOfferKind = 'product' | 'service';

export type BusinessCartLine = {
  id: string;
  commercialOfferId: string;
  commercialProfileId: string;
  offerKind: BusinessCartOfferKind;
  title: string;
  quantity: number;
  lineComment: string | null;
  pricingStrategy: CommercialPricingStrategy;
  unitPriceAmount: number | null;
  currencyCode: 'COP';
  requestedModality: CommercialModality | null;
  availableModalities: CommercialModality[];
  imageUrl: string | null;
  requiresBooking: boolean;
  durationMinutes: number | null;
  requestedStartsAt: string | null;
  requestedEndsAt: string | null;
  timezone: string | null;
};

export type BusinessCart = {
  version: number;
  commercialProfileId: string;
  commercialProfileName: string;
  requestedModality: CommercialModality | null;
  customerNote: string | null;
  deliveryAddress: string | null;
  deliveryReference: string | null;
  deliveryFeeMode: CommercialDeliveryFeeMode;
  deliveryFeeAmount: number | null;
  submissionIdempotencyKey: string | null;
  lines: BusinessCartLine[];
  updatedAt: string;
};

export type AddBusinessCartLineInput = {
  commercialOfferId: string;
  commercialProfileId: string;
  commercialProfileName: string;
  offerKind: BusinessCartOfferKind;
  title: string;
  quantity?: number;
  pricingStrategy: CommercialPricingStrategy;
  unitPriceAmount: number | null;
  currencyCode: 'COP';
  requestedModality?: CommercialModality | null;
  availableModalities?: CommercialModality[];
  imageUrl?: string | null;
  deliveryFeeMode?: CommercialDeliveryFeeMode | null;
  deliveryFeeAmount?: number | null;
  requiresBooking?: boolean;
  durationMinutes?: number | null;
  requestedStartsAt?: string | null;
  requestedEndsAt?: string | null;
  timezone?: string | null;
};

export type AddBusinessCartProductInput = Omit<
  AddBusinessCartLineInput,
  'offerKind'
>;

export type AddBusinessCartServiceInput = Omit<
  AddBusinessCartLineInput,
  'offerKind'
> & {
  offerKind?: never;
};

export type BusinessCartConflict = {
  currentCommercialProfileId: string;
  currentCommercialProfileName: string;
  incomingCommercialProfileId: string;
  incomingCommercialProfileName: string;
};

export type AddBusinessCartLineResult =
  | {
      kind: 'added';
      cart: BusinessCart;
    }
  | {
      kind: 'conflict';
      conflict: BusinessCartConflict;
    };

export type AddBusinessCartProductResult = AddBusinessCartLineResult;

export type BusinessCartChange = {
  type:
    | 'changed'
    | 'hydrated'
    | 'cleared'
    | 'reset'
    | 'submission_key_set';
  cart: BusinessCart | null;
};

export type BusinessCartListener = (
  change: BusinessCartChange,
) => void;

type PersistedBusinessCart = BusinessCart;

let activeUserId: string | null = null;
let activeCart: BusinessCart | null = null;
const listeners = new Set<BusinessCartListener>();

function normalizeId(value: string | null | undefined): string {
  return String(value || '').trim();
}

function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const rawValue = String(value || '');

  return rawValue.trim()
    ? rawValue.slice(0, maxLength)
    : null;
}

function normalizeQuantity(value: number | undefined): number {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return 1;
  }

  return Math.floor(quantity);
}

function normalizeNonNegativeInteger(
  value: number | null | undefined,
): number | null {
  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || value < 0
  ) {
    return null;
  }

  return Math.floor(value);
}

function normalizePositiveInteger(
  value: number | null | undefined,
): number | null {
  const normalized = normalizeNonNegativeInteger(value);
  return normalized && normalized > 0 ? normalized : null;
}

function normalizeIsoDateTime(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeOptionalText(value, 80);

  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    return null;
  }

  return normalized;
}

function getStorageKey(userId: string): string {
  return `${BUSINESS_CART_STORAGE_PREFIX}.${userId}`;
}

function notify(type: BusinessCartChange['type']): void {
  listeners.forEach((listener) => {
    try {
      listener({ type, cart: activeCart });
    } catch {
      // Un listener no debe impedir actualizar a los demás.
    }
  });
}

function persist(): void {
  if (!activeUserId || !activeCart) {
    return;
  }

  void AsyncStorage.setItem(
    getStorageKey(activeUserId),
    JSON.stringify(activeCart),
  ).catch(() => {
    // La persistencia local no debe bloquear la compra.
  });
}

function removePersistedCart(userId: string): void {
  void AsyncStorage.removeItem(getStorageKey(userId)).catch(() => {
    // La limpieza local no debe bloquear la compra.
  });
}

function isPricingStrategy(
  value: unknown,
): value is CommercialPricingStrategy {
  return (
    value === 'fixed'
    || value === 'starting_at'
    || value === 'free'
    || value === 'to_be_confirmed'
  );
}

function isDeliveryFeeMode(
  value: unknown,
): value is CommercialDeliveryFeeMode {
  return (
    value === 'not_offered'
    || value === 'free'
    || value === 'fixed'
    || value === 'to_be_confirmed'
  );
}

function isCommercialModality(
  value: unknown,
): value is CommercialModality {
  return (
    value === 'at_establishment'
    || value === 'in_person'
    || value === 'virtual'
    || value === 'home_visit'
    || value === 'delivery'
    || value === 'pickup'
    || value === 'phone_call'
    || value === 'buddy_chat'
  );
}

function isOfferKind(
  value: unknown,
): value is BusinessCartOfferKind {
  return value === 'product' || value === 'service';
}

function normalizeModalities(
  values: CommercialModality[] | null | undefined,
  fallback: CommercialModality | null,
): CommercialModality[] {
  const normalized = Array.isArray(values)
    ? values.filter(isCommercialModality)
    : [];

  const unique = Array.from(new Set(normalized));

  if (fallback && isCommercialModality(fallback) && !unique.includes(fallback)) {
    unique.push(fallback);
  }

  return unique;
}

function normalizeDeliveryFeeAmount(
  value: unknown,
  deliveryFeeMode: CommercialDeliveryFeeMode,
): number | null {
  if (deliveryFeeMode === 'free') {
    return 0;
  }

  if (deliveryFeeMode !== 'fixed') {
    return null;
  }

  return normalizeNonNegativeInteger(
    typeof value === 'number' ? value : null,
  );
}

function normalizeLine(
  input: AddBusinessCartLineInput,
  commercialProfileId: string,
): BusinessCartLine {
  const commercialOfferId = normalizeId(input.commercialOfferId);
  const title = normalizeId(input.title);
  const offerKind = input.offerKind;
  const requestedStartsAt = normalizeIsoDateTime(
    input.requestedStartsAt,
  );
  const requestedEndsAt = normalizeIsoDateTime(
    input.requestedEndsAt,
  );
  const timezone = normalizeOptionalText(input.timezone, 100);
  const durationMinutes = normalizePositiveInteger(
    input.durationMinutes,
  );
  const requiresBooking = (
    offerKind === 'service'
    && Boolean(input.requiresBooking)
  );

  if (!commercialOfferId || !title || !isOfferKind(offerKind)) {
    throw new Error(
      'No fue posible agregar el ítem al carrito.',
    );
  }

  if (offerKind === 'product' && (
    requiresBooking
    || durationMinutes !== null
    || requestedStartsAt !== null
    || requestedEndsAt !== null
    || timezone !== null
  )) {
    throw new Error(
      'Un producto no puede incluir datos de reserva.',
    );
  }

  if (
    requestedStartsAt
    && requestedEndsAt
    && Date.parse(requestedEndsAt) <= Date.parse(requestedStartsAt)
  ) {
    throw new Error(
      'La hora final del servicio debe ser posterior a la hora inicial.',
    );
  }

  return {
    id: createLineId(commercialOfferId),
    commercialOfferId,
    commercialProfileId,
    offerKind,
    title,
    quantity: normalizeQuantity(input.quantity),
    lineComment: null,
    pricingStrategy: input.pricingStrategy,
    unitPriceAmount: normalizeNonNegativeInteger(
      input.unitPriceAmount,
    ),
    currencyCode: input.currencyCode,
    requestedModality: (
      input.requestedModality
      && isCommercialModality(input.requestedModality)
        ? input.requestedModality
        : null
    ),
    availableModalities: normalizeModalities(
      input.availableModalities,
      input.requestedModality || null,
    ),
    imageUrl: normalizeOptionalText(input.imageUrl, 2000),
    requiresBooking,
    durationMinutes: (
      offerKind === 'service' ? durationMinutes : null
    ),
    requestedStartsAt: (
      offerKind === 'service' ? requestedStartsAt : null
    ),
    requestedEndsAt: (
      offerKind === 'service' ? requestedEndsAt : null
    ),
    timezone: offerKind === 'service' ? timezone : null,
  };
}

function isValidCartLine(
  value: unknown,
  commercialProfileId: string,
): value is BusinessCartLine {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const line = value as Partial<BusinessCartLine>;

  if (
    !normalizeId(line.id)
    || !normalizeId(line.commercialOfferId)
    || line.commercialProfileId !== commercialProfileId
    || !isOfferKind(line.offerKind)
    || !normalizeId(line.title)
    || !Number.isInteger(line.quantity)
    || Number(line.quantity) < 1
    || !isPricingStrategy(line.pricingStrategy)
    || line.currencyCode !== 'COP'
    || (
      line.requestedModality !== null
      && line.requestedModality !== undefined
      && !isCommercialModality(line.requestedModality)
    )
    || (
      line.unitPriceAmount !== null
      && (
        typeof line.unitPriceAmount !== 'number'
        || !Number.isFinite(line.unitPriceAmount)
        || line.unitPriceAmount < 0
      )
    )
  ) {
    return false;
  }

  if (line.offerKind === 'product') {
    return (
      !line.requiresBooking
      && line.durationMinutes === null
      && line.requestedStartsAt === null
      && line.requestedEndsAt === null
      && line.timezone === null
    );
  }

  const startsAt = normalizeIsoDateTime(line.requestedStartsAt);
  const endsAt = normalizeIsoDateTime(line.requestedEndsAt);
  const timezone = normalizeOptionalText(line.timezone, 100);
  const durationMinutes = normalizePositiveInteger(
    line.durationMinutes,
  );

  return (
    typeof line.requiresBooking === 'boolean'
    && (durationMinutes === null || durationMinutes > 0)
    && (startsAt === null || timezone !== null)
    && (
      !startsAt
      || !endsAt
      || Date.parse(endsAt) > Date.parse(startsAt)
    )
  );
}

function normalizePersistedCart(
  value: unknown,
): PersistedBusinessCart | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const cart = value as Partial<PersistedBusinessCart>;
  const commercialProfileId = normalizeId(cart.commercialProfileId);
  const commercialProfileName = normalizeId(cart.commercialProfileName);

  if (
    cart.version !== BUSINESS_CART_STORAGE_VERSION
    || !commercialProfileId
    || !commercialProfileName
    || !isDeliveryFeeMode(cart.deliveryFeeMode)
    || !Array.isArray(cart.lines)
    || !cart.lines.length
    || typeof cart.updatedAt !== 'string'
    || !cart.lines.every((line) => (
      isValidCartLine(line, commercialProfileId)
    ))
  ) {
    return null;
  }

  if (
    cart.requestedModality !== null
    && cart.requestedModality !== undefined
    && !isCommercialModality(cart.requestedModality)
  ) {
    return null;
  }

  return {
    version: BUSINESS_CART_STORAGE_VERSION,
    commercialProfileId,
    commercialProfileName,
    requestedModality: (
      cart.requestedModality
      && isCommercialModality(cart.requestedModality)
        ? cart.requestedModality
        : null
    ),
    customerNote: normalizeOptionalText(cart.customerNote, 3000),
    deliveryAddress: normalizeOptionalText(
      cart.deliveryAddress,
      1000,
    ),
    deliveryReference: normalizeOptionalText(
      cart.deliveryReference,
      1000,
    ),
    deliveryFeeMode: cart.deliveryFeeMode,
    deliveryFeeAmount: normalizeDeliveryFeeAmount(
      cart.deliveryFeeAmount,
      cart.deliveryFeeMode,
    ),
    submissionIdempotencyKey: normalizeOptionalText(
      cart.submissionIdempotencyKey,
      200,
    ),
    lines: cart.lines.map((line) => ({
      id: normalizeId(line.id),
      commercialOfferId: normalizeId(line.commercialOfferId),
      commercialProfileId,
      offerKind: line.offerKind,
      title: normalizeId(line.title),
      quantity: normalizeQuantity(line.quantity),
      lineComment: normalizeOptionalText(line.lineComment, 1000),
      pricingStrategy: line.pricingStrategy,
      unitPriceAmount: normalizeNonNegativeInteger(
        line.unitPriceAmount,
      ),
      currencyCode: 'COP',
      requestedModality: (
        line.requestedModality
        && isCommercialModality(line.requestedModality)
          ? line.requestedModality
          : null
      ),
      availableModalities: normalizeModalities(
        line.availableModalities,
        line.requestedModality || null,
      ),
      imageUrl: normalizeOptionalText(line.imageUrl, 2000),
      requiresBooking: Boolean(line.requiresBooking),
      durationMinutes: normalizePositiveInteger(
        line.durationMinutes,
      ),
      requestedStartsAt: normalizeIsoDateTime(
        line.requestedStartsAt,
      ),
      requestedEndsAt: normalizeIsoDateTime(
        line.requestedEndsAt,
      ),
      timezone: normalizeOptionalText(line.timezone, 100),
    })),
    updatedAt: cart.updatedAt,
  };
}

function createLineId(commercialOfferId: string): string {
  return `${commercialOfferId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createCart(
  input: AddBusinessCartLineInput,
): BusinessCart {
  const commercialProfileId = normalizeId(input.commercialProfileId);
  const commercialProfileName = normalizeId(
    input.commercialProfileName,
  );

  if (!commercialProfileId || !commercialProfileName) {
    throw new Error(
      'No fue posible identificar el negocio del ítem.',
    );
  }

  const deliveryFeeMode = (
    input.deliveryFeeMode
    && isDeliveryFeeMode(input.deliveryFeeMode)
      ? input.deliveryFeeMode
      : 'not_offered'
  );

  return {
    version: BUSINESS_CART_STORAGE_VERSION,
    commercialProfileId,
    commercialProfileName,
    requestedModality: (
      input.requestedModality
      && isCommercialModality(input.requestedModality)
        ? input.requestedModality
        : null
    ),
    customerNote: null,
    deliveryAddress: null,
    deliveryReference: null,
    deliveryFeeMode,
    deliveryFeeAmount: normalizeDeliveryFeeAmount(
      input.deliveryFeeAmount,
      deliveryFeeMode,
    ),
    submissionIdempotencyKey: null,
    lines: [normalizeLine(input, commercialProfileId)],
    updatedAt: new Date().toISOString(),
  };
}

function updateCart(
  nextCart: BusinessCart,
  type: BusinessCartChange['type'] = 'changed',
): void {
  activeCart = {
    ...nextCart,
    submissionIdempotencyKey: (
      type === 'changed'
        ? null
        : normalizeOptionalText(
          nextCart.submissionIdempotencyKey,
          200,
        )
    ),
    updatedAt: new Date().toISOString(),
  };

  persist();
  notify(type);
}

function resetActiveCart(
  type: BusinessCartChange['type'] = 'reset',
): void {
  activeCart = null;
  notify(type);
}

function getLineMergeKey(
  line: Pick<
    BusinessCartLine,
    | 'commercialOfferId'
    | 'offerKind'
    | 'requestedStartsAt'
    | 'requestedEndsAt'
    | 'requestedModality'
  >,
): string {
  return [
    line.commercialOfferId,
    line.offerKind,
    line.requestedStartsAt || '',
    line.requestedEndsAt || '',
    line.requestedModality || '',
  ].join('|');
}

export function subscribeBusinessCart(
  listener: BusinessCartListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBusinessCart(): BusinessCart | null {
  return activeCart;
}

export function getBusinessCartItemCount(): number {
  return activeCart?.lines.reduce(
    (total, line) => total + line.quantity,
    0,
  ) || 0;
}

export function setBusinessCartActiveUser(
  userId: string | null | undefined,
): void {
  const normalizedUserId = normalizeId(userId);

  if (activeUserId && activeUserId !== normalizedUserId) {
    resetActiveCart('reset');
  }

  activeUserId = normalizedUserId || null;

  if (!activeUserId) {
    resetActiveCart('reset');
  }
}

export async function hydrateBusinessCart(
  userId: string | null | undefined,
): Promise<BusinessCart | null> {
  const normalizedUserId = normalizeId(userId);

  if (!normalizedUserId) {
    setBusinessCartActiveUser(null);
    return null;
  }

  setBusinessCartActiveUser(normalizedUserId);

  try {
    const rawCart = await AsyncStorage.getItem(
      getStorageKey(normalizedUserId),
    );

    if (!rawCart) {
      resetActiveCart('hydrated');
      return null;
    }

    const cart = normalizePersistedCart(JSON.parse(rawCart));

    if (!cart) {
      removePersistedCart(normalizedUserId);
      resetActiveCart('hydrated');
      return null;
    }

    activeCart = cart;
    notify('hydrated');
    return activeCart;
  } catch {
    removePersistedCart(normalizedUserId);
    resetActiveCart('hydrated');
    return null;
  }
}

export function addBusinessCartLine(
  input: AddBusinessCartLineInput,
): AddBusinessCartLineResult {
  const incomingCommercialProfileId = normalizeId(
    input.commercialProfileId,
  );
  const incomingCommercialProfileName = normalizeId(
    input.commercialProfileName,
  );

  if (
    !incomingCommercialProfileId
    || !incomingCommercialProfileName
  ) {
    throw new Error(
      'No fue posible identificar el negocio del ítem.',
    );
  }

  if (
    activeCart
    && activeCart.commercialProfileId
      !== incomingCommercialProfileId
  ) {
    return {
      kind: 'conflict',
      conflict: {
        currentCommercialProfileId: activeCart.commercialProfileId,
        currentCommercialProfileName: activeCart.commercialProfileName,
        incomingCommercialProfileId,
        incomingCommercialProfileName,
      },
    };
  }

  if (!activeCart) {
    const nextCart = createCart(input);
    updateCart(nextCart);
    return { kind: 'added', cart: nextCart };
  }

  const incomingLine = normalizeLine(
    input,
    activeCart.commercialProfileId,
  );
  const incomingKey = getLineMergeKey(incomingLine);
  const currentLine = activeCart.lines.find((line) => (
    getLineMergeKey(line) === incomingKey
  ));

  const nextCart: BusinessCart = {
    ...activeCart,
    lines: currentLine
      ? activeCart.lines.map((line) => (
        line.id === currentLine.id
          ? {
            ...line,
            quantity: line.quantity + incomingLine.quantity,
          }
          : line
      ))
      : [...activeCart.lines, incomingLine],
  };

  updateCart(nextCart);
  return { kind: 'added', cart: activeCart };
}

export function replaceBusinessCartWithLine(
  input: AddBusinessCartLineInput,
): BusinessCart {
  const nextCart = createCart(input);
  updateCart(nextCart);
  return nextCart;
}

export function addBusinessCartProduct(
  input: AddBusinessCartProductInput,
): AddBusinessCartProductResult {
  return addBusinessCartLine({
    ...input,
    offerKind: 'product',
    requiresBooking: false,
    durationMinutes: null,
    requestedStartsAt: null,
    requestedEndsAt: null,
    timezone: null,
  });
}

export function replaceBusinessCartWithProduct(
  input: AddBusinessCartProductInput,
): BusinessCart {
  return replaceBusinessCartWithLine({
    ...input,
    offerKind: 'product',
    requiresBooking: false,
    durationMinutes: null,
    requestedStartsAt: null,
    requestedEndsAt: null,
    timezone: null,
  });
}

export function addBusinessCartService(
  input: AddBusinessCartServiceInput,
): AddBusinessCartLineResult {
  return addBusinessCartLine({
    ...input,
    offerKind: 'service',
  });
}

export function replaceBusinessCartWithService(
  input: AddBusinessCartServiceInput,
): BusinessCart {
  return replaceBusinessCartWithLine({
    ...input,
    offerKind: 'service',
  });
}

export function updateBusinessCartLineQuantity(
  lineId: string,
  quantity: number,
): void {
  if (!activeCart) {
    return;
  }

  const normalizedLineId = normalizeId(lineId);
  const normalizedQuantity = normalizeQuantity(quantity);

  updateCart({
    ...activeCart,
    lines: activeCart.lines.map((line) => (
      line.id === normalizedLineId
        ? { ...line, quantity: normalizedQuantity }
        : line
    )),
  });
}

export function updateBusinessCartBookingDetails(
  lineId: string,
  details: {
    requestedModality?: CommercialModality | null;
    requestedStartsAt?: string | null;
    requestedEndsAt?: string | null;
    timezone?: string | null;
  },
): void {
  if (!activeCart) {
    return;
  }

  const normalizedLineId = normalizeId(lineId);

  updateCart({
    ...activeCart,
    lines: activeCart.lines.map((line) => {
      if (
        line.id !== normalizedLineId
        || line.offerKind !== 'service'
        || !line.requiresBooking
      ) {
        return line;
      }

      const requestedStartsAt = (
        details.requestedStartsAt === undefined
          ? line.requestedStartsAt
          : normalizeIsoDateTime(details.requestedStartsAt)
      );
      const requestedEndsAt = (
        details.requestedEndsAt === undefined
          ? line.requestedEndsAt
          : normalizeIsoDateTime(details.requestedEndsAt)
      );
      const timezone = (
        details.timezone === undefined
          ? line.timezone
          : normalizeOptionalText(details.timezone, 100)
      );

      if (
        requestedStartsAt
        && requestedEndsAt
        && Date.parse(requestedEndsAt) <= Date.parse(requestedStartsAt)
      ) {
        return line;
      }

      return {
        ...line,
        requestedModality: (
          details.requestedModality === undefined
            ? line.requestedModality
            : (
              details.requestedModality
              && isCommercialModality(details.requestedModality)
                ? details.requestedModality
                : null
            )
        ),
        requestedStartsAt,
        requestedEndsAt,
        timezone,
      };
    }),
  });
}

export function updateBusinessCartLineComment(
  lineId: string,
  lineComment: string | null | undefined,
): void {
  if (!activeCart) {
    return;
  }

  const normalizedLineId = normalizeId(lineId);

  updateCart({
    ...activeCart,
    lines: activeCart.lines.map((line) => (
      line.id === normalizedLineId
        ? {
          ...line,
          lineComment: normalizeOptionalText(lineComment, 1000),
        }
        : line
    )),
  });
}

export function removeBusinessCartLine(lineId: string): void {
  if (!activeCart) {
    return;
  }

  const normalizedLineId = normalizeId(lineId);
  const nextLines = activeCart.lines.filter(
    (line) => line.id !== normalizedLineId,
  );

  if (!nextLines.length) {
    clearBusinessCart();
    return;
  }

  updateCart({ ...activeCart, lines: nextLines });
}

export function updateBusinessCartRequestDetails(
  details: {
    requestedModality?: CommercialModality | null;
    customerNote?: string | null;
    deliveryAddress?: string | null;
    deliveryReference?: string | null;
    deliveryFeeMode?: CommercialDeliveryFeeMode | null;
    deliveryFeeAmount?: number | null;
  },
): void {
  if (!activeCart) {
    return;
  }

  const requestedModality = (
    details.requestedModality === undefined
      ? activeCart.requestedModality
      : (
        details.requestedModality
        && isCommercialModality(details.requestedModality)
          ? details.requestedModality
          : null
      )
  );
  const isDelivery = requestedModality === 'delivery';
  const deliveryFeeMode = (
    !isDelivery
      ? 'not_offered'
      : details.deliveryFeeMode === undefined
        ? activeCart.deliveryFeeMode
        : (
          details.deliveryFeeMode
          && isDeliveryFeeMode(details.deliveryFeeMode)
            ? details.deliveryFeeMode
            : 'not_offered'
        )
  );

  updateCart({
    ...activeCart,
    requestedModality,
    customerNote: (
      details.customerNote === undefined
        ? activeCart.customerNote
        : normalizeOptionalText(details.customerNote, 3000)
    ),
    deliveryAddress: (
      !isDelivery
        ? null
        : details.deliveryAddress === undefined
          ? activeCart.deliveryAddress
          : normalizeOptionalText(details.deliveryAddress, 1000)
    ),
    deliveryReference: (
      !isDelivery
        ? null
        : details.deliveryReference === undefined
          ? activeCart.deliveryReference
          : normalizeOptionalText(details.deliveryReference, 1000)
    ),
    deliveryFeeMode,
    deliveryFeeAmount: (
      !isDelivery
        ? null
        : normalizeDeliveryFeeAmount(
          details.deliveryFeeAmount === undefined
            ? activeCart.deliveryFeeAmount
            : details.deliveryFeeAmount,
          deliveryFeeMode,
        )
    ),
  });
}

export function getOrCreateBusinessCartSubmissionIdempotencyKey(
  createKey: () => string,
): string {
  if (!activeCart) {
    throw new Error('No hay un carrito activo.');
  }

  const currentKey = normalizeOptionalText(
    activeCart.submissionIdempotencyKey,
    200,
  );

  if (currentKey) {
    return currentKey;
  }

  const nextKey = normalizeOptionalText(createKey(), 200);

  if (!nextKey) {
    throw new Error(
      'No fue posible preparar la solicitud. Inténtalo nuevamente.',
    );
  }

  updateCart(
    {
      ...activeCart,
      submissionIdempotencyKey: nextKey,
    },
    'submission_key_set',
  );

  return nextKey;
}

export function clearBusinessCart(): void {
  if (activeUserId) {
    removePersistedCart(activeUserId);
  }

  activeCart = null;
  notify('cleared');
}

export type RevalidateBusinessCartLineInput = {
  lineId: string;
  title: string;
  pricingStrategy: CommercialPricingStrategy;
  unitPriceAmount: number | null;
  requestedModality: CommercialModality | null;
  imageUrl: string | null;
};

export type RevalidateBusinessCartLinesResult = {
  updatedLineCount: number;
  removedLineCount: number;
  cart: BusinessCart | null;
};

export function revalidateBusinessCartLines(
  inputs: RevalidateBusinessCartLineInput[],
  removedLineIds: string[],
): RevalidateBusinessCartLinesResult {
  if (!activeCart) {
    return {
      updatedLineCount: 0,
      removedLineCount: 0,
      cart: null,
    };
  }

  const updatesByLineId = new Map(
    inputs.map((input) => [
      normalizeId(input.lineId),
      input,
    ]),
  );
  const removedIds = new Set(
    removedLineIds.map((lineId) => normalizeId(lineId)),
  );

  let updatedLineCount = 0;
  let removedLineCount = 0;

  const nextLines = activeCart.lines
    .filter((line) => {
      const shouldRemove = removedIds.has(line.id);

      if (shouldRemove) {
        removedLineCount += 1;
      }

      return !shouldRemove;
    })
    .map((line) => {
      const update = updatesByLineId.get(line.id);

      if (!update) {
        return line;
      }

      const nextLine: BusinessCartLine = {
        ...line,
        title: normalizeId(update.title) || line.title,
        pricingStrategy: update.pricingStrategy,
        unitPriceAmount: normalizeNonNegativeInteger(
          update.unitPriceAmount,
        ),
        requestedModality: (
          update.requestedModality
          && isCommercialModality(update.requestedModality)
            ? update.requestedModality
            : null
        ),
        imageUrl: normalizeOptionalText(update.imageUrl, 2000),
      };

      if (
        nextLine.title !== line.title
        || nextLine.pricingStrategy !== line.pricingStrategy
        || nextLine.unitPriceAmount !== line.unitPriceAmount
        || nextLine.requestedModality !== line.requestedModality
        || nextLine.imageUrl !== line.imageUrl
      ) {
        updatedLineCount += 1;
      }

      return nextLine;
    });

  if (!nextLines.length) {
    clearBusinessCart();

    return {
      updatedLineCount,
      removedLineCount,
      cart: null,
    };
  }

  updateCart({
    ...activeCart,
    lines: nextLines,
    submissionIdempotencyKey: null,
  });

  return {
    updatedLineCount,
    removedLineCount,
    cart: activeCart,
  };
}
