import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '../supabase';

export class GatewayError extends Error {
    readonly status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'GatewayError';
        this.status = status;
    }
}

export type Json = Record<string, unknown>;

export const SIGNED_URL_SECONDS = 60 * 30;

export function asJson(value: unknown): Json {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Json;
    }

    return {};
}

export function asRows<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
        return value as T[];
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed as T[] : [];
        } catch {
            return [];
        }
    }

    return [];
}

export function pathOf(endpoint: string): string {
    const raw = endpoint.startsWith('/')
        ? endpoint
        : `/${endpoint}`;
    const withoutQuery = raw.split('?')[0] || '/';

    return withoutQuery.endsWith('/')
        ? withoutQuery
        : `${withoutQuery}/`;
}

export function queryOf(endpoint: string): URLSearchParams {
    const query = endpoint.split('?')[1] || '';
    return new URLSearchParams(query);
}

export function unwrap<T>(result: {
    data: T;
    error: { message: string } | null;
}): T {
    if (result.error) {
        throw new GatewayError(result.error.message, 400);
    }

    return result.data;
}

export async function requireClient(): Promise<{
    supabase: SupabaseClient;
    userId: string;
}> {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new GatewayError(
            'Tu sesión no es válida. Vuelve a iniciar sesión.',
            401,
        );
    }

    return {
        supabase,
        userId: data.user.id,
    };
}

export function createId(): string {
    const cryptoObject = globalThis.crypto;

    if (cryptoObject?.randomUUID) {
        return cryptoObject.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        const value = char === 'x' ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

export function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function headerValue(
    headers: Record<string, string> | undefined,
    name: string,
): string {
    if (!headers) {
        return '';
    }

    const match = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === name.toLowerCase(),
    );

    return match ? String(match[1] || '').trim() : '';
}

export async function readSettings(
    supabase: SupabaseClient,
    userId: string,
): Promise<Json> {
    const profile = unwrap(await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .maybeSingle());

    return asJson(profile?.settings);
}

export async function writeSetting(
    supabase: SupabaseClient,
    userId: string,
    key: string,
    value: unknown,
): Promise<void> {
    const settings = await readSettings(supabase, userId);
    settings[key] = value;
    unwrap(await supabase
        .from('profiles')
        .update({ settings })
        .eq('id', userId));
}

function isFileId(value: unknown): value is string {
    return typeof value === 'string' && isUuid(value);
}

export async function signedUrlsForFileIds(
    supabase: SupabaseClient,
    fileIds: Array<unknown>,
): Promise<Map<string, string>> {
    const ids = Array.from(new Set(fileIds.filter(isFileId))).slice(0, 100);
    const urls = new Map<string, string>();

    if (!ids.length) {
        return urls;
    }

    const locations = new Map<string, { bucket: string; path: string }>();
    const visible = unwrap(await supabase
        .from('files')
        .select('id, bucket, path')
        .in('id', ids)) ?? [];

    for (const row of visible as Json[]) {
        if (row.id && row.bucket && row.path) {
            locations.set(String(row.id), {
                bucket: String(row.bucket),
                path: String(row.path),
            });
        }
    }

    const missing = ids.filter((id) => !locations.has(id));

    if (missing.length) {
        const extra = await supabase.rpc('profile_avatar_locations', {
            p_file_ids: missing,
        });

        if (!extra.error) {
            for (const row of asRows<Json>(extra.data)) {
                const fileId = row.file_id || row.id;

                if (fileId && row.bucket && row.path) {
                    locations.set(String(fileId), {
                        bucket: String(row.bucket),
                        path: String(row.path),
                    });
                }
            }
        }
    }

    await Promise.all(Array.from(locations.entries()).map(async ([id, file]) => {
        const signed = await supabase.storage
            .from(file.bucket)
            .createSignedUrl(file.path, SIGNED_URL_SECONDS);

        if (!signed.error && signed.data?.signedUrl) {
            urls.set(id, signed.data.signedUrl);
        }
    }));

    return urls;
}

export async function searchProfiles(
    supabase: SupabaseClient,
    term: string,
    limit: number,
): Promise<Json[]> {
    const rows = unwrap(await supabase.rpc(
        'search_beeapp_users_for_invitation',
        {
            p_query: term,
            p_limit: limit,
        },
    ));

    return asRows<Json>(rows).map((row) => ({
        id: row.user_id,
        user_id: row.user_id,
        email: row.email ?? null,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        phone_dial_code: row.phone_dial_code ?? null,
        phone_number: row.phone_number ?? null,
    }));
}
