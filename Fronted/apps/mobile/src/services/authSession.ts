import * as SecureStore from 'expo-secure-store';
import {
  ApiRequestError,
  getCurrentProfile,
  notifyUnauthorizedAuthenticatedRequest,
  refreshSession,
  revokeDeviceSession,
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
import { clearChatConversationsCache } from '../stores/chatStore';

const AUTH_SESSION_KEY = 'beeapp.auth.session';

const REFRESH_MARGIN_MS = 60_000;

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
      clearChatMessageSnapshots(),
    ]);
  }

  await SecureStore.setItemAsync(
    AUTH_SESSION_KEY,
    JSON.stringify(authSession),
  );
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

    return {
      session: parsedSession.session,
      user: parsedSession.user,
      deviceSessionId: (
        typeof parsedSession.deviceSessionId === 'string'
        && parsedSession.deviceSessionId.trim()
      )
        ? parsedSession.deviceSessionId.trim()
        : null,
    };
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

  try {
    const refreshedResponse = await refreshSession({
      refresh_token: persistedSession.session.refresh_token,
    });

    const refreshedSession: PersistedAuthSession = {
      session: refreshedResponse.session,
      user: persistedSession.user,
      deviceSessionId: persistedSession.deviceSessionId ?? null,
    };

    await saveAuthSession(refreshedSession);

    return refreshedSession;
  } catch (error) {
    if (
      error instanceof ApiRequestError
      && (
        error.status === 400
        || error.status === 401
        || error.status === 403
      )
    ) {
      await clearAuthSession();
      notifyUnauthorizedAuthenticatedRequest(error);
      return null;
    }

    throw error;
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
      return 'revoked';
    }

    // Red caída, timeout, DNS, 5xx o cualquier error incierto:
    // conservar la sesión local y no expulsar al usuario.
    return 'unknown';
  }
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
  await clearChatConversationsCache();
  const results = await Promise.allSettled([
    SecureStore.deleteItemAsync(AUTH_SESSION_KEY),
    clearAppLockConfig(),
    clearChatInboxCache(),
    clearChatAvatarCache(),
    clearChatMessageSnapshots(),
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
