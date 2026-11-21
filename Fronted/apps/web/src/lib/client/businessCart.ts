import type {
  CommercialDeliveryFeeMode,
  CommercialModality,
} from '@beeapp/shared-types';

export interface WebCartLine {
  offerId: string;
  title: string;
  unitPrice: number | null;
  quantity: number;
  kind: 'product' | 'service';
  requiresBooking: boolean;
  lineComment?: string;
  requestedModality?: CommercialModality | null;
  requestedStartsAt?: string | null;
  requestedEndsAt?: string | null;
  timezone?: string | null;
  durationMinutes?: number | null;
  modalities?: CommercialModality[];
}

export interface WebBusinessCart {
  profileId: string;
  profileName: string;
  deliveryFeeMode?: CommercialDeliveryFeeMode | null;
  deliveryFeeAmount?: number | null;
  modalities?: CommercialModality[];
  idempotencyKey?: string;
  lines: WebCartLine[];
}

const BASE_STORAGE_KEY = 'beeapp.web.business-cart.v1';
const ACTIVE_USER_KEY = 'beeapp.web.business-cart.user-id';

function currentStorageKey(userId?: string | null): string {
  if (typeof window === 'undefined') return BASE_STORAGE_KEY;
  const resolved = userId ?? window.localStorage.getItem(ACTIVE_USER_KEY);
  return resolved ? `${BASE_STORAGE_KEY}.${resolved}` : BASE_STORAGE_KEY;
}

export function setActiveBusinessCartUserId(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      window.localStorage.setItem(ACTIVE_USER_KEY, userId);
    } else {
      window.localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function readBusinessCart(userId?: string | null): WebBusinessCart | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = currentStorageKey(userId);
    const raw = window.localStorage.getItem(key) ?? window.localStorage.getItem(BASE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebBusinessCart;
    if (!parsed?.profileId || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBusinessCart(cart: WebBusinessCart | null, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  const key = currentStorageKey(userId);
  try {
    if (!cart || cart.lines.length === 0) {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(BASE_STORAGE_KEY);
      return;
    }
    const serialized = JSON.stringify(cart);
    window.localStorage.setItem(key, serialized);
    window.localStorage.setItem(BASE_STORAGE_KEY, serialized);
  } catch {
    // ignore storage errors
  }
}

export function addCartLine(
  profile: {
    id: string;
    name: string;
    deliveryFeeMode?: CommercialDeliveryFeeMode | null;
    deliveryFeeAmount?: number | null;
    modalities?: CommercialModality[];
  },
  line: WebCartLine,
): WebBusinessCart {
  const current = readBusinessCart();
  const base: WebBusinessCart = current && current.profileId === profile.id
    ? current
    : {
        profileId: profile.id,
        profileName: profile.name,
        deliveryFeeMode: profile.deliveryFeeMode ?? null,
        deliveryFeeAmount: profile.deliveryFeeAmount ?? null,
        modalities: profile.modalities,
        lines: [],
      };
  const existing = base.lines.find((item) => item.offerId === line.offerId);
  const lines = existing
    ? base.lines.map((item) => (
      item.offerId === line.offerId
        ? {
            ...item,
            quantity: item.quantity + line.quantity,
            lineComment: line.lineComment ?? item.lineComment,
            requestedModality: line.requestedModality ?? item.requestedModality,
            requestedStartsAt: line.requestedStartsAt ?? item.requestedStartsAt,
            requestedEndsAt: line.requestedEndsAt ?? item.requestedEndsAt,
            timezone: line.timezone ?? item.timezone,
          }
        : item
    ))
    : [...base.lines, line];
  const next: WebBusinessCart = {
    ...base,
    profileName: profile.name,
    deliveryFeeMode: profile.deliveryFeeMode ?? base.deliveryFeeMode ?? null,
    deliveryFeeAmount: profile.deliveryFeeAmount ?? base.deliveryFeeAmount ?? null,
    modalities: profile.modalities ?? base.modalities,
    idempotencyKey: undefined,
    lines,
  };
  writeBusinessCart(next);
  return next;
}

export function updateCartLineQuantity(offerId: string, delta: number): WebBusinessCart | null {
  const current = readBusinessCart();
  if (!current) return null;
  const lines = current.lines
    .map((line) =>
      line.offerId === offerId
        ? { ...line, quantity: Math.max(0, line.quantity + delta) }
        : line,
    )
    .filter((line) => line.quantity > 0);
  const next = lines.length > 0 ? { ...current, idempotencyKey: undefined, lines } : null;
  writeBusinessCart(next);
  return next;
}

export function updateCartLine(
  offerId: string,
  patch: Partial<WebCartLine>,
): WebBusinessCart | null {
  const current = readBusinessCart();
  if (!current) return null;
  const lines = current.lines.map((line) =>
    line.offerId === offerId ? { ...line, ...patch } : line,
  );
  const next = { ...current, idempotencyKey: undefined, lines };
  writeBusinessCart(next);
  return next;
}

export function removeCartLine(offerId: string): WebBusinessCart | null {
  const current = readBusinessCart();
  if (!current) return null;
  const lines = current.lines.filter((line) => line.offerId !== offerId);
  const next = lines.length > 0 ? { ...current, idempotencyKey: undefined, lines } : null;
  writeBusinessCart(next);
  return next;
}

export function getOrCreateCartIdempotencyKey(): string {
  const current = readBusinessCart();
  if (current?.idempotencyKey) return current.idempotencyKey;
  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  if (current) {
    writeBusinessCart({ ...current, idempotencyKey: generated });
  }
  return generated;
}

export function resetCartIdempotencyKey(): void {
  const current = readBusinessCart();
  if (!current) return;
  writeBusinessCart({ ...current, idempotencyKey: undefined });
}

export function getCartTotalQuantity(cart?: WebBusinessCart | null): number {
  const resolved = cart === undefined ? readBusinessCart() : cart;
  if (!resolved) return 0;
  return resolved.lines.reduce((sum, line) => sum + line.quantity, 0);
}
