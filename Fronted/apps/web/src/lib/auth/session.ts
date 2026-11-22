import { getSupabase } from '@beeapp/api-client';
import {
  clearAuthHintCookie,
  homePathForRole,
  isAdminRole,
  normalizeRole,
  writeAuthHintCookie,
  type AppRole,
  type AuthProfile,
} from './sessionHint';

export {
  homePathForRole,
  isAdminRole,
  normalizeRole,
  type AppRole,
  type AuthProfile,
};

const DEVICE_SESSION_KEY = 'beeapp.web.deviceSessionId';
const PROFILE_CACHE_KEY = 'beeapp.web.authProfile';

function configuredSupabaseStorageKey(): string | null {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.EXPO_PUBLIC_SUPABASE_URL
    || ''
  ).trim();
  const match = /^https?:\/\/([a-z0-9-]+)\.supabase\./i.exec(url);
  return match?.[1] ? `sb-${match[1]}-auth-token` : null;
}

export function rememberWebDeviceSession(deviceSessionId: string): void {
  if (typeof window === 'undefined' || !deviceSessionId) {
    return;
  }

  try {
    window.localStorage.setItem(DEVICE_SESSION_KEY, deviceSessionId);
  } catch {
    // Almacenamiento bloqueado por el navegador.
  }
}

export function readCachedAuthProfile(): AuthProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthProfile;
    if (!parsed?.id) {
      return null;
    }
    return { ...parsed, role: normalizeRole(parsed.role) };
  } catch {
    return null;
  }
}

export function rememberAuthProfile(profile: AuthProfile): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Almacenamiento bloqueado por el navegador.
  }

  writeAuthHintCookie(profile);
}

export function forgetAuthProfile(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Almacenamiento bloqueado por el navegador.
  }

  clearAuthHintCookie();
}

type SupabaseLikeUser = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

export type StoredSupabaseSessionHint = {
  userId: string;
  fallbackProfile: AuthProfile;
};

export function profileFromSupabaseUser(
  user: SupabaseLikeUser | null | undefined,
): AuthProfile | null {
  const id = typeof user?.id === 'string' ? user.id.trim() : '';
  if (!id) {
    return null;
  }

  const meta = (user?.user_metadata && typeof user.user_metadata === 'object')
    ? user.user_metadata
    : {};
  const fullName = typeof meta.full_name === 'string'
    ? meta.full_name.trim()
    : typeof meta.name === 'string'
      ? meta.name.trim()
      : '';
  const nameParts = fullName ? fullName.split(/\s+/) : [];
  const firstName = typeof meta.first_name === 'string' && meta.first_name.trim()
    ? meta.first_name.trim()
    : (nameParts[0] || '');
  const lastName = typeof meta.last_name === 'string' && meta.last_name.trim()
    ? meta.last_name.trim()
    : nameParts.slice(1).join(' ');

  return {
    id,
    firstName,
    lastName,
    email: typeof user?.email === 'string' ? user.email : '',
    phoneDialCode: typeof meta.phone_dial_code === 'string' ? meta.phone_dial_code : '',
    phoneNumber: typeof meta.phone_number === 'string'
      ? meta.phone_number
      : (typeof user?.phone === 'string' ? user.phone : ''),
    role: 'USER',
  };
}

function parseStoredSupabaseSessionRaw(
  raw: string | null,
): StoredSupabaseSessionHint | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
      user?: SupabaseLikeUser;
      currentSession?: {
        access_token?: string;
        refresh_token?: string;
        user?: SupabaseLikeUser;
      };
    };
    const candidate = parsed?.currentSession ?? parsed;
    const fallbackProfile = profileFromSupabaseUser(candidate?.user);
    if (
      fallbackProfile
      && (candidate?.access_token || candidate?.refresh_token)
    ) {
      return {
        userId: fallbackProfile.id,
        fallbackProfile,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readStoredSupabaseSession(): StoredSupabaseSessionHint | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const preferredKey = configuredSupabaseStorageKey();
    if (preferredKey) {
      const preferred = parseStoredSupabaseSessionRaw(
        window.localStorage.getItem(preferredKey),
      );
      if (preferred) {
        return preferred;
      }
    }

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (
        !key
        || key === preferredKey
        || !key.startsWith('sb-')
        || !key.endsWith('-auth-token')
      ) {
        continue;
      }
      const parsed = parseStoredSupabaseSessionRaw(
        window.localStorage.getItem(key),
      );
      if (parsed) {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
}

let deviceRegistration: Promise<string | null> | null = null;

async function registerWebDevice(): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('register_device_session', {
    p_device_name: 'Buddy AI Web',
    p_platform: 'web',
    p_device_type: 'WEB',
    p_user_agent: typeof navigator === 'undefined'
      ? 'buddy-ai-web'
      : navigator.userAgent,
  });

  if (error || !data) {
    const message = error?.message || '';
    if (/esta sesión fue cerrada/i.test(message)) {
      throw new Error('Esta sesión fue cerrada');
    }
    return null;
  }

  const deviceSessionId = String(data);
  rememberWebDeviceSession(deviceSessionId);
  return deviceSessionId;
}

export async function ensureWebDeviceSession(): Promise<string | null> {
  if (!deviceRegistration) {
    deviceRegistration = registerWebDevice().finally(() => {
      deviceRegistration = null;
    });
  }

  return deviceRegistration;
}

export async function fetchAuthProfile(
  userId: string,
): Promise<AuthProfile | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_dial_code, phone_number, role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: String(data.id),
      firstName: String(data.first_name || ''),
      lastName: String(data.last_name || ''),
      email: String(data.email || ''),
      phoneDialCode: String(data.phone_dial_code || ''),
      phoneNumber: String(data.phone_number || ''),
      role: normalizeRole(data.role),
    };
  } catch {
    return null;
  }
}

export async function signOutWeb(): Promise<void> {
  if (typeof window !== 'undefined') {
    let deviceSessionId: string | null = null;
    try {
      deviceSessionId = window.localStorage.getItem(DEVICE_SESSION_KEY);
    } catch {
      deviceSessionId = null;
    }

    if (deviceSessionId) {
      try {
        const { api } = await import('@beeapp/api-client');
        await api.delete(
          `/accounts/me/devices/${deviceSessionId}/`,
        );
      } catch {
        // La sesión local se cierra aunque la revocación falle.
      }

      try {
        window.localStorage.removeItem(DEVICE_SESSION_KEY);
      } catch {
        // Ignorar si localStorage no está disponible.
      }
    }

    forgetAuthProfile();
  }

  // Solo este navegador. No revoca el teléfono ni otras sesiones abiertas.
  await getSupabase().auth.signOut({ scope: 'local' });
}

export function isClosedDeviceSession(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /esta sesión fue cerrada/i.test(message);
}

export async function leaveClosedWebSession(): Promise<void> {
  try {
    await signOutWeb();
  } catch {
    await getSupabase().auth.signOut({ scope: 'local' });
  }
}
