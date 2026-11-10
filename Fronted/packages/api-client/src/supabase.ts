import {
    createClient,
    type Session,
    type SupabaseClient,
    } from '@supabase/supabase-js';

const supabaseUrl = (
    process.env.EXPO_PUBLIC_SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || ''
).trim();

const supabaseAnonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || ''
).trim();

const memory = new Map<string, string>();

type AuthStorageAdapter = {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
};

let configuredAuthStorage: AuthStorageAdapter | null = null;

export function configureSupabaseAuthStorage(
    storage: AuthStorageAdapter,
): void {
    configuredAuthStorage = storage;

    if (client) {
        client = null;
    }
}

function getAuthStorage(): AuthStorageAdapter {
    if (configuredAuthStorage) {
        return configuredAuthStorage;
    }

    if (typeof localStorage !== 'undefined') {
        return localStorage;
    }

    return {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
            memory.set(key, value);
        },
        removeItem: (key: string) => {
            memory.delete(key);
        },
    };
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Faltan EXPO_PUBLIC_SUPABASE_URL y '
            + 'EXPO_PUBLIC_SUPABASE_ANON_KEY.',
        );
    }

    if (!client) {
        client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: getAuthStorage(),
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    }

    return client;
}

export function getSupabaseUrl(): string {
    return supabaseUrl;
}

export async function invokeAnonFunction(
    name: string,
    body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Faltan las credenciales de Supabase.');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

    if (!response.ok) {
        const message = typeof payload.message === 'string'
            ? payload.message
            : typeof payload.error === 'string'
                ? payload.error
                : 'No fue posible completar la solicitud.';
        throw new Error(message);
    }

    return payload;
}

export async function adoptSupabaseSession(session: {
    access_token: string;
    refresh_token: string;
}): Promise<void> {
    if (!session.access_token || !session.refresh_token) {
        return;
    }

    const supabase = getSupabase();
    const current = await supabase.auth.getSession();
    const stored = current.data.session;

    // El cliente de Supabase rota el refresh token por su cuenta. Si la
    // sesión guardada por la app trae uno anterior, setSession lo reenvía y
    // Supabase lo rechaza como ya usado, borrando la sesión local.
    if (
        stored?.refresh_token
        && stored.refresh_token !== session.refresh_token
        && stored.expires_at
        && stored.expires_at * 1000 > Date.now() + 60_000
    ) {
        return;
    }

    if (
        stored?.access_token === session.access_token
        && stored.refresh_token === session.refresh_token
    ) {
        return;
    }

    await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    });
}

/**
 * Sesión vigente del cliente de Supabase, que rota sus tokens aunque la
 * app no lo pida. Sirve para no reutilizar un refresh token ya gastado.
 */
export async function readLiveSupabaseSession(): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number | null;
    expires_in: number | null;
    token_type: string;
} | null> {
    const current = await getSupabase().auth.getSession();
    const stored = current.data.session;

    if (!stored?.access_token || !stored.refresh_token) {
        return null;
    }

    return mapAuthSession(stored);
}

export async function signOutSupabase(): Promise<void> {
    if (!supabaseUrl || !supabaseAnonKey || !client) {
        return;
    }

    await client.auth.signOut();
}

export function mapAuthSession(session: Session) {
    return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at ?? null,
        expires_in: session.expires_in ?? null,
        token_type: session.token_type || 'bearer',
    };
}
