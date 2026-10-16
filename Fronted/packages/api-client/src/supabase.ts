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

function getAuthStorage() {
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

export async function adoptSupabaseSession(session: {
    access_token: string;
    refresh_token: string;
}): Promise<void> {
    if (!session.access_token || !session.refresh_token) {
        return;
    }

    const supabase = getSupabase();
    const current = await supabase.auth.getSession();

    if (current.data.session?.access_token === session.access_token) {
        return;
    }

    await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    });
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
