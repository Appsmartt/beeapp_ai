export interface WebCartLine {
  offerId: string;
  title: string;
  unitPrice: number | null;
  quantity: number;
  kind: 'product' | 'service';
  requiresBooking: boolean;
}

export interface WebBusinessCart {
  profileId: string;
  profileName: string;
  lines: WebCartLine[];
}

const STORAGE_KEY = 'beeapp.web.business-cart.v1';

export function readBusinessCart(): WebBusinessCart | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebBusinessCart;
    if (!parsed?.profileId || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBusinessCart(cart: WebBusinessCart | null): void {
  if (typeof window === 'undefined') return;
  if (!cart || cart.lines.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

export function addCartLine(
  profile: { id: string; name: string },
  line: WebCartLine,
): WebBusinessCart {
  const current = readBusinessCart();
  const base: WebBusinessCart = current && current.profileId === profile.id
    ? current
    : { profileId: profile.id, profileName: profile.name, lines: [] };
  const existing = base.lines.find((item) => item.offerId === line.offerId);
  const lines = existing
    ? base.lines.map((item) => (
      item.offerId === line.offerId
        ? { ...item, quantity: item.quantity + line.quantity }
        : item
    ))
    : [...base.lines, line];
  const next = { ...base, profileName: profile.name, lines };
  writeBusinessCart(next);
  return next;
}
