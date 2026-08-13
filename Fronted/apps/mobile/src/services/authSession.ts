import * as SecureStore from 'expo-secure-store';
import type {
    AuthCredentials,
    AuthSession,
    AuthenticatedUser,
    } from '@beeapp/shared-types';


const AUTH_SESSION_KEY = 'beeapp.auth.session';


export interface PersistedAuthSession {
    session: AuthSession;
    user: AuthenticatedUser;
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
        return JSON.parse(storedSession) as PersistedAuthSession;
    } catch {
        await clearAuthSession();
        return null;
    }
}


export async function clearAuthSession(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}


export function getSessionCredentials(
    authSession: PersistedAuthSession,
    ): AuthCredentials {
    if ('token' in authSession.session) {
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