import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
CommercialDeliveryFeeMode,
CommercialModality,
CommercialPricingStrategy,
} from '@beeapp/shared-types';

const BUSINESS_CART_STORAGE_PREFIX = 'beeapp.buddyservices.cart.v1';

const BUSINESS_CART_STORAGE_VERSION = 1;

export type BusinessCartLine = {
id: string;
commercialOfferId: string;
commercialProfileId: string;
offerKind: 'product';
title: string;
quantity: number;
lineComment: string | null;
pricingStrategy: CommercialPricingStrategy;
unitPriceAmount: number | null;
currencyCode: 'COP';
requestedModality: CommercialModality | null;
imageUrl: string | null;
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

export type AddBusinessCartProductInput = {
commercialOfferId: string;
commercialProfileId: string;
commercialProfileName: string;
title: string;
quantity?: number;
pricingStrategy: CommercialPricingStrategy;
unitPriceAmount: number | null;
currencyCode: 'COP';
requestedModality?: CommercialModality | null;
imageUrl?: string | null;
deliveryFeeMode?: CommercialDeliveryFeeMode | null;
deliveryFeeAmount?: number | null;
};

export type BusinessCartConflict = {
currentCommercialProfileId: string;
currentCommercialProfileName: string;
incomingCommercialProfileId: string;
incomingCommercialProfileName: string;
};

export type AddBusinessCartProductResult =
| {
kind: 'added';
cart: BusinessCart;
}
| {
kind: 'conflict';
conflict: BusinessCartConflict;
};

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
const normalized = String(value || '').trim();

if (!normalized) {
return null;
}

return normalized.slice(0, maxLength);
}

function normalizeQuantity(value: number | undefined): number {
const quantity = Number(value);

if (
!Number.isFinite(quantity)
|| quantity < 1
) {
return 1;
}

return Math.floor(quantity);
}

function getStorageKey(userId: string): string {
return `${BUSINESS_CART_STORAGE_PREFIX}.${userId}`;
}

function notify(
type: BusinessCartChange['type'],
): void {
const change: BusinessCartChange = {
type,
cart: activeCart,
};

listeners.forEach((listener) => {
try {
listener(change);
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
// La persistencia del carrito nunca debe bloquear la compra.
});
}

function removePersistedCart(
userId: string,
): void {
void AsyncStorage.removeItem(
getStorageKey(userId),
).catch(() => {
// La limpieza local nunca debe bloquear la compra.
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

function normalizeDeliveryFeeAmount(
value: unknown,
deliveryFeeMode: CommercialDeliveryFeeMode,
): number | null {
if (deliveryFeeMode === 'free') {
return 0;
}

if (
deliveryFeeMode !== 'fixed'
|| typeof value !== 'number'
|| !Number.isFinite(value)
|| value < 0
) {
return null;
}

return Math.floor(value);
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

function isValidCartLine(
value: unknown,
commercialProfileId: string,
): value is BusinessCartLine {
if (!value || typeof value !== 'object') {
return false;
}

const line = value as Partial<BusinessCartLine>;

return (
normalizeId(line.id).length > 0
&& normalizeId(line.commercialOfferId).length > 0
&& line.commercialProfileId === commercialProfileId
&& line.offerKind === 'product'
&& normalizeId(line.title).length > 0
&& Number.isInteger(line.quantity)
&& Number(line.quantity) > 0
&& (
line.lineComment === null
|| typeof line.lineComment === 'string'
)
&& isPricingStrategy(line.pricingStrategy)
&& (
line.unitPriceAmount === null
|| (
typeof line.unitPriceAmount === 'number'
&& Number.isFinite(line.unitPriceAmount)
&& line.unitPriceAmount >= 0
)
)
&& line.currencyCode === 'COP'
&& (
line.requestedModality === null
|| isCommercialModality(line.requestedModality)
)
&& (
line.imageUrl === null
|| typeof line.imageUrl === 'string'
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
const commercialProfileId = normalizeId(
cart.commercialProfileId,
);
const commercialProfileName = normalizeId(
cart.commercialProfileName,
);

if (
cart.version !== BUSINESS_CART_STORAGE_VERSION
|| !commercialProfileId
|| !commercialProfileName
|| !isDeliveryFeeMode(cart.deliveryFeeMode)
|| !Array.isArray(cart.lines)
|| !cart.lines.length
|| typeof cart.updatedAt !== 'string'
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

if (
cart.customerNote !== null
&& cart.customerNote !== undefined
&& typeof cart.customerNote !== 'string'
) {
return null;
}

if (
cart.deliveryAddress !== null
&& cart.deliveryAddress !== undefined
&& typeof cart.deliveryAddress !== 'string'
) {
return null;
}

if (
cart.deliveryReference !== null
&& cart.deliveryReference !== undefined
&& typeof cart.deliveryReference !== 'string'
) {
return null;
}

if (
!cart.lines.every((line) => (
isValidCartLine(line, commercialProfileId)
))
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
customerNote: normalizeOptionalText(
cart.customerNote,
3000,
),
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
...line,
id: normalizeId(line.id),
commercialOfferId: normalizeId(
line.commercialOfferId,
),
commercialProfileId,
title: normalizeId(line.title),
quantity: normalizeQuantity(line.quantity),
lineComment: normalizeOptionalText(
line.lineComment,
1000,
),
unitPriceAmount: (
typeof line.unitPriceAmount === 'number'
? line.unitPriceAmount
: null
),
requestedModality: (
line.requestedModality
&& isCommercialModality(line.requestedModality)
? line.requestedModality
: null
),
imageUrl: normalizeOptionalText(line.imageUrl, 2000),
})),
updatedAt: cart.updatedAt,
};
}

function createLineId(
commercialOfferId: string,
): string {
return `${commercialOfferId}:${Date.now()}:${Math.random()
.toString(36)
.slice(2, 10)}`;
}

function createCart(
input: AddBusinessCartProductInput,
): BusinessCart {
const commercialProfileId = normalizeId(
input.commercialProfileId,
);
const commercialProfileName = normalizeId(
input.commercialProfileName,
);
const commercialOfferId = normalizeId(input.commercialOfferId);
const title = normalizeId(input.title);

if (
!commercialProfileId
|| !commercialProfileName
|| !commercialOfferId
|| !title
) {
throw new Error(
'No fue posible agregar el producto al carrito.',
);
}

return {
version: BUSINESS_CART_STORAGE_VERSION,
commercialProfileId,
commercialProfileName,
requestedModality: input.requestedModality || null,
customerNote: null,
deliveryAddress: null,
deliveryReference: null,
deliveryFeeMode: (
input.deliveryFeeMode
&& isDeliveryFeeMode(input.deliveryFeeMode)
? input.deliveryFeeMode
: 'not_offered'
),
deliveryFeeAmount: normalizeDeliveryFeeAmount(
input.deliveryFeeAmount,
(
input.deliveryFeeMode
&& isDeliveryFeeMode(input.deliveryFeeMode)
? input.deliveryFeeMode
: 'not_offered'
),
),
submissionIdempotencyKey: null,
lines: [
{
id: createLineId(commercialOfferId),
commercialOfferId,
commercialProfileId,
offerKind: 'product',
title,
quantity: normalizeQuantity(input.quantity),
lineComment: null,
pricingStrategy: input.pricingStrategy,
unitPriceAmount: input.unitPriceAmount,
currencyCode: input.currencyCode,
requestedModality: input.requestedModality || null,
imageUrl: normalizeOptionalText(input.imageUrl, 2000),
},
],
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

export function subscribeBusinessCart(
listener: BusinessCartListener,
): () => void {
listeners.add(listener);

return () => {
listeners.delete(listener);
};
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

if (
activeUserId
&& activeUserId !== normalizedUserId
) {
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

const parsedCart: unknown = JSON.parse(rawCart);
const cart = normalizePersistedCart(parsedCart);

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

export function addBusinessCartProduct(
input: AddBusinessCartProductInput,
): AddBusinessCartProductResult {
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
'No fue posible identificar el negocio del producto.',
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
currentCommercialProfileId: (
activeCart.commercialProfileId
),
currentCommercialProfileName: (
activeCart.commercialProfileName
),
incomingCommercialProfileId,
incomingCommercialProfileName,
},
};
}

if (!activeCart) {
const nextCart = createCart(input);
updateCart(nextCart);

return {
kind: 'added',
cart: nextCart,
};
}

const commercialOfferId = normalizeId(input.commercialOfferId);

if (!commercialOfferId) {
throw new Error(
'No fue posible identificar el producto.',
);
}

const currentLine = activeCart.lines.find(
(line) => line.commercialOfferId === commercialOfferId,
);

const nextLines = currentLine
? activeCart.lines.map((line) => (
line.id === currentLine.id
? {
...line,
quantity: (
line.quantity
+ normalizeQuantity(input.quantity)
),
}
: line
))
: [
...activeCart.lines,
{
id: createLineId(commercialOfferId),
commercialOfferId,
commercialProfileId: activeCart.commercialProfileId,
offerKind: 'product' as const,
title: normalizeId(input.title),
quantity: normalizeQuantity(input.quantity),
lineComment: null,
pricingStrategy: input.pricingStrategy,
unitPriceAmount: input.unitPriceAmount,
currencyCode: input.currencyCode,
requestedModality: input.requestedModality || null,
imageUrl: normalizeOptionalText(input.imageUrl, 2000),
},
];

const nextCart: BusinessCart = {
...activeCart,
lines: nextLines,
};

updateCart(nextCart);

return {
kind: 'added',
cart: activeCart,
};
}

export function replaceBusinessCartWithProduct(
input: AddBusinessCartProductInput,
): BusinessCart {
const nextCart = createCart(input);
updateCart(nextCart);

return nextCart;
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

const nextLines = activeCart.lines
.map((line) => (
line.id === normalizedLineId
? {
...line,
quantity: normalizedQuantity,
}
: line
));

updateCart({
...activeCart,
lines: nextLines,
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

export function removeBusinessCartLine(
lineId: string,
): void {
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

updateCart({
...activeCart,
lines: nextLines,
});
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
    : details.requestedModality
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

  const deliveryFeeAmount = (
    !isDelivery
    ? null
    : normalizeDeliveryFeeAmount(
      details.deliveryFeeAmount === undefined
      ? activeCart.deliveryFeeAmount
      : details.deliveryFeeAmount,
      deliveryFeeMode,
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
      isDelivery
      ? (
        details.deliveryAddress === undefined
        ? activeCart.deliveryAddress
        : normalizeOptionalText(details.deliveryAddress, 1000)
      )
      : null
    ),
    deliveryReference: (
      isDelivery
      ? (
        details.deliveryReference === undefined
        ? activeCart.deliveryReference
        : normalizeOptionalText(details.deliveryReference, 1000)
      )
      : null
    ),
    deliveryFeeMode,
    deliveryFeeAmount,
  });
}
export function clearBusinessCart(): void {
const currentUserId = activeUserId;

activeCart = null;

if (currentUserId) {
removePersistedCart(currentUserId);
}

notify('cleared');
}


export function getOrCreateBusinessCartSubmissionIdempotencyKey(
createKey: () => string,
): string {
if (!activeCart) {
throw new Error(
'No hay una solicitud activa para enviar.',
);
}

const currentKey = String(
activeCart.submissionIdempotencyKey || '',
).trim();

if (currentKey) {
return currentKey;
}

const nextKey = String(createKey() || '').trim();

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
