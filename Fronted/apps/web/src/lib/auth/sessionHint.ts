export type AppRole = 'USER' | 'ADMIN' | 'SUPERADMIN';

export type AuthProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneDialCode: string;
  phoneNumber: string;
  role: AppRole;
};

export const AUTH_HINT_COOKIE_NAME = 'buddy_web_hint';
const AUTH_HINT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export function homePathForRole(role: AppRole | null | undefined): string {
  return isAdminRole(role) ? '/admin' : '/app';
}

export function normalizeRole(value: unknown): AppRole {
  if (
    value === 'ADMIN'
    || value === 'SUPERADMIN'
    || value === 'SUPER_ADMIN'
    || value === 'USER'
  ) {
    return value === 'SUPER_ADMIN' ? 'SUPERADMIN' : value;
  }

  return 'USER';
}

type AuthHintPayload = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AppRole;
};

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

/**
 * Serializa únicamente metadatos visuales no sensibles del perfil (sin tokens)
 * para que SSR pueda renderizar el AppBar y /login sin flash ni skeleton.
 */
export function serializeAuthHintCookie(profile: AuthProfile): string {
  const payload: AuthHintPayload = {
    id: sanitizeText(profile.id, 64),
    firstName: sanitizeText(profile.firstName, 60),
    lastName: sanitizeText(profile.lastName, 60),
    email: sanitizeText(profile.email, 120),
    role: normalizeRole(profile.role),
  };

  return encodeURIComponent(JSON.stringify(payload));
}

export function parseAuthHintCookie(
  raw: string | null | undefined,
): AuthProfile | null {
  if (!raw || raw.length > 2048) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as Partial<AuthHintPayload> | null;
    const id = sanitizeText(parsed?.id, 64);

    if (!id) {
      return null;
    }

    return {
      id,
      firstName: sanitizeText(parsed?.firstName, 60),
      lastName: sanitizeText(parsed?.lastName, 60),
      email: sanitizeText(parsed?.email, 120),
      phoneDialCode: '',
      phoneNumber: '',
      role: normalizeRole(parsed?.role),
    };
  } catch {
    return null;
  }
}

export function writeAuthHintCookie(profile: AuthProfile): void {
  if (typeof document === 'undefined' || !profile?.id) {
    return;
  }

  try {
    const encoded = serializeAuthHintCookie(profile);
    const secure =
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '; Secure'
        : '';
    document.cookie =
      `${AUTH_HINT_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${AUTH_HINT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  } catch {
    // Entornos restringidos pueden bloquear cookies no críticas.
  }
}

export function clearAuthHintCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    const secure =
      typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? '; Secure'
        : '';
    document.cookie =
      `${AUTH_HINT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  } catch {
    // Entornos restringidos pueden bloquear cookies no críticas.
  }
}
