import { api, getSupabase, signOutSupabase } from '@beeapp/api-client';

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

const DEVICE_SESSION_KEY = 'beeapp.web.deviceSessionId';

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export function homePathForRole(role: AppRole | null | undefined): string {
  return isAdminRole(role) ? '/admin' : '/app';
}

export function normalizeRole(value: unknown): AppRole {
  if (value === 'ADMIN' || value === 'SUPERADMIN' || value === 'SUPER_ADMIN' || value === 'USER') {
    return value === 'SUPER_ADMIN' ? 'SUPERADMIN' : value;
  }

  return 'USER';
}

export function rememberWebDeviceSession(deviceSessionId: string): void {
  if (typeof window === 'undefined' || !deviceSessionId) {
    return;
  }

  window.localStorage.setItem(DEVICE_SESSION_KEY, deviceSessionId);
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
}

export async function signOutWeb(): Promise<void> {
  if (typeof window !== 'undefined') {
    const deviceSessionId = window.localStorage.getItem(DEVICE_SESSION_KEY);

    if (deviceSessionId) {
      try {
        await api.delete(
          `/accounts/me/devices/${deviceSessionId}/`,
        );
      } catch {
        // La sesión local se cierra aunque la revocación falle.
      }

      window.localStorage.removeItem(DEVICE_SESSION_KEY);
    }
  }

  await signOutSupabase();
}
