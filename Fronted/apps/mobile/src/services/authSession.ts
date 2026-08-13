import * as SecureStore from 'expo-secure-store';
import {
    ApiRequestError,
    refreshSession,
    } from '@beeapp/api-client';
import type {
    AuthCredentials,
    AuthSession,
    AuthenticatedUser,
    } from '@beeapp/shared-types';

import {
    clearAppLockConfig,
    } from '../stores/appLockStore';

const AUTH_SESSION_KEY = 'beeapp.auth.session';

const REFRESH_MARGIN_MS = 60_000;

export interface PersistedAuthSession {
    session: AuthSession;
    user: AuthenticatedUser;
}

function isMobileSession(
    session: AuthSession,
    ): session is Extract<AuthSession, { token: string }> {
    return 'token' in session;
}

function getExpirationTime(
    session: AuthSession,
    ): number | null {
    if (isMobileSession(session)) {
        const expiration = Date.parse(session.expires_at);

        return Number.isNaN(expiration)
        ? null
        : expiration;
    }

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
    await SecureStore.setItemAsync(
        AUTH_SESSION_KEY,
        JSON.stringify(authSession),
    );
}

export async function getAuthSession(): Promise<PersistedAuthSession | null> {
    const storedSession = await SecureStore.getItemAsync(
        AUTH_SESSION_KEY,
    );

    if (!storedSession) {
        return null;
    }

    try {
        return JSON.parse(
        storedSession,
        ) as PersistedAuthSession;
    } catch {
        await clearAuthSession();
        return null;
    }
}

export async function refreshAuthSession(): Promise<PersistedAuthSession | null> {
    const persistedSession = await getAuthSession();

    if (!persistedSession) {
        return null;
    }

    const currentSession =
        persistedSession.session;

    try {
        const refreshedResponse = isMobileSession(currentSession)
        ? await refreshSession({
            session_token: currentSession.token,
            })
        : await refreshSession({
            refresh_token: currentSession.refresh_token,
            });

        const refreshedSession: PersistedAuthSession = {
        session: refreshedResponse.session,
        user: persistedSession.user,
        };

        await saveAuthSession(refreshedSession);

        return refreshedSession;
    } catch (error) {
        if (
        error instanceof ApiRequestError
        && error.status === 401
        ) {
        await clearAuthSession();
        return null;
        }

        throw error;
    }
}

export async function getValidAuthSession(): Promise<PersistedAuthSession | null> {
    const persistedSession = await getAuthSession();

    if (!persistedSession) {
        return null;
    }

    if (!shouldRefreshSession(persistedSession.session)) {
        return persistedSession;
    }

    return refreshAuthSession();
}

export async function getValidSessionCredentials(): Promise<AuthCredentials | null> {
    const authSession = await getValidAuthSession();

    if (!authSession) {
        return null;
    }

    return getSessionCredentials(authSession);
}

export async function clearAuthSession(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(AUTH_SESSION_KEY),
        clearAppLockConfig(),
    ]);
}

export function getSessionCredentials(
    authSession: PersistedAuthSession,
    ): AuthCredentials {
    if (isMobileSession(authSession.session)) {
        return {
        token: authSession.session.token,
        scheme: 'Session',
        };
    }

    return {
        token: authSession.session.access_token,
        scheme: 'Bearer',
    };
}