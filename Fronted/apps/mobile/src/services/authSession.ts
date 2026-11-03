import * as SecureStore from 'expo-secure-store';
import {
  adoptSupabaseSession,
  ApiRequestError,
  clearRequestCache,
  getCurrentProfile,
  getSupabase,
  mapAuthSession,
  notifyUnauthorizedAuthenticatedRequest,
  readLiveSupabaseSession,
  refreshSession,
  revokeDeviceSession,
  signOutSupabase,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  AuthSession,
  AuthenticatedUser,
} from '@beeapp/shared-types';

import {
  clearAppLockConfig,
} from '../stores/appLockStore';
import { clearChatInboxCache } from './chatInboxCache';
import { clearChatMessageSnapshots } from './chatMessageSnapshotCache';
import { clearChatAvatarCache } from './chatAvatarCache';
import { clearImageDiskCache } from './imageDiskCache';
import { clearSideMenuProfileSnapshot } from './sideMenuProfileCache';
import { clearChatConversationsCache } from '../stores/chatStore';
import { clearNotesStore } from '../stores/notesStore';
import { clearStorageStore } from '../stores/storageStore';
import { clearCalendarStore } from '../stores/calendarStore';

let cachedAuthUserId: string | null = null;

export function getCachedAuthUserId(): string | null {
  return cachedAuthUserId;
}

function rememberAuthUserId(userId: string | null): void {
  cachedAuthUserId = userId?.trim() || null;
}

async function clearListCaches(): Promise<void> {
  await Promise.all([
    clearRequestCache(),
    clearNotesStore(),
    clearStorageStore(),
    clearCalendarStore(),
    clearImageDiskCache(),
    clearSideMenuProfileSnapshot(),
  ]);
}

const AUTH_SESSION_KEY = 'beeapp.auth.session';

/** Renueva la sesión unos minutos antes de que venza el access token. */
const REFRESH_MARGIN_MS = 5 * 60_000;

function isDefinitiveRefreshFailure(
  error: unknown,
): boolean {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }

  return error.status === 401 || error.status === 403;
}

async function refreshSessionWithSupabase(
  refreshToken: string,
): Promise<PersistedAuthSession['session'] | null> {
  try {
    const response = await getSupabase().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (response.error || !response.data.session) {
      return null;
    }

    return mapAuthSession(response.data.session);
  } catch {
    return null;
  }
}

export interface PersistedAuthSession {
  session: AuthSession;
  user: AuthenticatedUser;
  deviceSessionId: string | null;
}

function getExpirationTime(
  session: AuthSession,
): number | null {
  if (session.expires_at === null) {
    return null;
  }

  return session.expires_at * 1000;
}

function shouldRefreshSession(
  session: AuthSession,
): boolean {
  const expirationTime = getExpirationTime(session);

  if (expirationTime === null) {
    return false;
  }

  return (
    expirationTime
    <= Date.now() + REFRESH_MARGIN_MS
  );
}

export async function saveAuthSession(
  authSession: PersistedAuthSession,
): Promise<void> {
  const previous = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  let previousUserId: string | null = null;

  if (previous) {
    try {
      const parsed = JSON.parse(previous) as Partial<PersistedAuthSession>;
      previousUserId = parsed.user?.id || null;
    } catch {
      previousUserId = null;
    }
  }

  if (previousUserId !== authSession.user.id) {
    await clearChatConversationsCache();
    await Promise.all([
      clearChatInboxCache(),
      clearChatAvatarCache(),
      clearImageDiskCache(),
      clearSideMenuProfileSnapshot(),
      clearChatMessageSnapshots(),
      clearListCaches(),
    ]);
  }

  rememberAuthUserId(authSession.user.id);

  await SecureStore.setItemAsync(
    AUTH_SESSION_KEY,
    JSON.stringify(authSession),
  );

  try {
    await adoptSupabaseSession(authSession.session);
  } catch {
    // La sesión local sigue válida si Supabase todavía no está listo.
  }
}

/**
 * La sesión guardada por la app y la del cliente de Supabase se renuevan
 * por separado. Si difieren, gana la de Supabase, que es la que rotó el
 * refresh token más recientemente.
 */
async function reconcileWithLiveSession(
  persisted: PersistedAuthSession,
): Promise<PersistedAuthSession> {
  let live: Awaited<ReturnType<typeof readLiveSupabaseSession>> = null;

  try {
    live = await readLiveSupabaseSession();
  } catch {
    return persisted;
  }

  if (!live?.refresh_token) {
    return persisted;
  }

  const storedExpiresAt = persisted.session.expires_at ?? 0;
  const liveExpiresAt = live.expires_at ?? 0;
  const differs = (
    live.refresh_token !== persisted.session.refresh_token
    || live.access_token !== persisted.session.access_token
  );

  if (!differs || liveExpiresAt < storedExpiresAt) {
    return persisted;
  }

  const reconciled: PersistedAuthSession = {
    session: live,
    user: persisted.user,
    deviceSessionId: persisted.deviceSessionId ?? null,
  };

  await saveAuthSession(reconciled);

  return reconciled;
}

export async function getAuthSession(): Promise<
  PersistedAuthSession | null
> {
  const storedSession = await SecureStore.getItemAsync(
    AUTH_SESSION_KEY,
  );

  if (!storedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(
      storedSession,
    ) as Partial<PersistedAuthSession>;

    if (
      !parsedSession.session
      || !parsedSession.user
    ) {
      await clearAuthSession();
      return null;
    }

    const restored = {
      session: parsedSession.session,
      user: parsedSession.user,
      deviceSessionId: (
        typeof parsedSession.deviceSessionId === 'string'
        && parsedSession.deviceSessionId.trim()
      )
        ? parsedSession.deviceSessionId.trim()
        : null,
    };

    rememberAuthUserId(restored.user.id);

    return reconcileWithLiveSession(restored);
  } catch {
    await clearAuthSession();
    return null;
  }
}

export async function refreshAuthSession(): Promise<
  PersistedAuthSession | null
> {
  const persistedSession = await getAuthSession();

  if (!persistedSession) {
    return null;
  }

  const refreshToken = persistedSession.session.refresh_token;

  try {
    const refreshedResponse = await refreshSession({
      refresh_token: refreshToken,
    });

    const refreshedSession: PersistedAuthSession = {
      session: refreshedResponse.session,
      user: persistedSession.user,
      deviceSessionId: persistedSession.deviceSessionId ?? null,
    };

    await saveAuthSession(refreshedSession);

    return refreshedSession;
  } catch (error) {
    if (!isDefinitiveRefreshFailure(error)) {
      return persistedSession;
    }

    const fallbackSession = await refreshSessionWithSupabase(
      refreshToken,
    );

    if (fallbackSession) {
      const refreshedSession: PersistedAuthSession = {
        session: fallbackSession,
        user: persistedSession.user,
        deviceSessionId: persistedSession.deviceSessionId ?? null,
      };

      await saveAuthSession(refreshedSession);

      return refreshedSession;
    }

    await clearAuthSession();

    if (error instanceof ApiRequestError) {
      notifyUnauthorizedAuthenticatedRequest(error);
    }

    return null;
  }
}

export async function getValidAuthSession(): Promise<
  PersistedAuthSession | null
> {
  const persistedSession = await getAuthSession();

  if (!persistedSession) {
    return null;
  }

  if (!shouldRefreshSession(persistedSession.session)) {
    return persistedSession;
  }

  return refreshAuthSession();
}

export async function validateStoredAuthSession(): Promise<
  'valid' | 'revoked' | 'unknown'
> {
  const authSession = await getValidAuthSession();

  if (!authSession) {
    return 'unknown';
  }

  try {
    await getCurrentProfile(
      getSessionCredentials(authSession),
    );

    return 'valid';
  } catch (error) {
    if (
      error instanceof ApiRequestError
      && error.status === 401
    ) {
      const refreshed = await refreshAuthSession();

      if (refreshed) {
        try {
          await getCurrentProfile(
            getSessionCredentials(refreshed),
          );

          return 'valid';
        } catch (retryError) {
          if (
            retryError instanceof ApiRequestError
            && retryError.status === 401
          ) {
            return 'revoked';
          }

          return 'unknown';
        }
      }

      if (await getAuthSession()) {
        return 'unknown';
      }

      return 'revoked';
    }

    // Red caída, timeout, DNS, 5xx o cualquier error incierto:
    // conservar la sesión local y no expulsar al usuario.
    return 'unknown';
  }
}

export async function recoverAuthSessionAfterUnauthorized(): Promise<
  boolean
> {
  const refreshed = await refreshAuthSession();

  if (refreshed) {
    return true;
  }

  const stillStored = await getAuthSession();

  return Boolean(stillStored);
}


export async function getValidSessionCredentials(): Promise<
  AuthCredentials | null
> {
  const authSession = await getValidAuthSession();

  if (!authSession) {
    return null;
  }

  return getSessionCredentials(authSession);
}

export async function signOutCurrentDevice(): Promise<void> {
  const session = await getValidAuthSession();

  if (!session) {
    if (!await getAuthSession()) {
      return;
    }

    throw new Error(
      'No se pudo validar la sesión. '
      + 'Comprueba la conexión e inténtalo de nuevo.',
    );
  }

  if (!session.deviceSessionId) {
    throw new Error(
      'No se pudo identificar la sesión del dispositivo. '
      + 'Comprueba la conexión e inténtalo de nuevo.',
    );
  }

  await revokeDeviceSession(
    getSessionCredentials(session),
    session.deviceSessionId,
  );

  await clearAuthSession();
}

export async function clearAuthSession(): Promise<void> {
  try {
    const { logoutPush } = await import('./pushNotifications');
    logoutPush();
  } catch {
    // El cierre de sesión local no depende de OneSignal.
  }

  try {
    await signOutSupabase();
  } catch {
    // Cerrar la sesión local aunque Supabase no responda.
  }

  rememberAuthUserId(null);
  await clearChatConversationsCache();
  const results = await Promise.allSettled([
    SecureStore.deleteItemAsync(AUTH_SESSION_KEY),
    clearAppLockConfig(),
    clearChatInboxCache(),
    clearChatAvatarCache(),
    clearImageDiskCache(),
    clearSideMenuProfileSnapshot(),
    clearChatMessageSnapshots(),
    clearListCaches(),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
  }
}

export function getSessionCredentials(
  authSession: PersistedAuthSession,
): AuthCredentials {
  return {
    token: authSession.session.access_token,
    scheme: 'Bearer',
  };
}
