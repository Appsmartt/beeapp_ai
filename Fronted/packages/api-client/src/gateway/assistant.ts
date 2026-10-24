import type { SupabaseClient } from '@supabase/supabase-js';

import {
    asJson,
    asRows,
    GatewayError,
    type Json,
    requireClient,
    unwrap,
    } from './runtime';

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const TONES = ['formal', 'cercano', 'neutro'];
const LEVELS = ['sugerir', 'confirmar', 'automatico'];
const LANGUAGES = ['es', 'en', 'pt'];

function inboxPreferencesOf(value: unknown): Json {
    const source = asJson(value);
    return {
        inbox_pinned: source.inbox_pinned !== false,
        inbox_muted: source.inbox_muted === true,
    };
}

function permissionsOf(value: unknown): Json {
    const source = asJson(value);
    return {
        calendar: source.calendar !== false,
        notes: source.notes !== false,
        mail: source.mail !== false,
        marketplace: source.marketplace !== false,
        send_messages: source.send_messages !== false,
    };
}

function toneOf(value: unknown): string {
    const tone = String(value || '').toLowerCase();
    if (['formal', 'profesional', 'professional'].includes(tone)) return 'formal';
    if (['cercano', 'amigable', 'friendly'].includes(tone)) return 'cercano';
    return 'neutro';
}

function mapSettings(row: Json): Json {
    const inbox = inboxPreferencesOf(row.permissions);
    return {
        user_id: row.user_id,
        name: row.name || 'Buddy AI',
        tone: toneOf(row.tone),
        voice: VOICES.includes(String(row.voice)) ? row.voice : 'alloy',
        voice_activation: row.voice_activation === true,
        assistance_level: LEVELS.includes(String(row.assistance_level))
            ? row.assistance_level
            : 'confirmar',
        memory_enabled: row.memory_enabled !== false,
        permissions: permissionsOf(row.permissions),
        inbox_pinned: inbox.inbox_pinned !== false,
        inbox_muted: inbox.inbox_muted === true,
        language: LANGUAGES.includes(String(row.language)) ? row.language : 'es',
        updated_at: row.updated_at || null,
    };
}

function mapMessage(row: Json): Json {
    return {
        id: row.id,
        role: row.role,
        content: row.content || '',
        cards: asRows<Json>(row.cards),
        created_at: row.created_at,
    };
}

export async function mergeAssistantInboxPreference(
    supabase: SupabaseClient,
    userId: string,
    patch: {
        inbox_pinned?: boolean;
        inbox_muted?: boolean;
    },
): Promise<Json> {
    await loadOrCreateSettings(supabase, userId);
    const currentRow = (unwrap(await supabase
        .from('assistant_settings')
        .select('permissions')
        .eq('user_id', userId)
        .single()) || {}) as Json;
    const currentPermissions = asJson(currentRow.permissions);
    const nextPermissions: Json = { ...currentPermissions };
    if (patch.inbox_pinned !== undefined) {
        nextPermissions.inbox_pinned = patch.inbox_pinned === true;
    }
    if (patch.inbox_muted !== undefined) {
        nextPermissions.inbox_muted = patch.inbox_muted === true;
    }
    const updated = unwrap(await supabase
        .from('assistant_settings')
        .update({
            permissions: nextPermissions,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('*')
        .single());
    return mapSettings(updated as Json);
}

export function buildAssistantChatConversation(
    settings: Json,
    isPinned: boolean,
    notificationsEnabled: boolean,
): Json {
    const timestamp = String(
        settings.updated_at
        || new Date().toISOString(),
    );
    const userId = String(settings.user_id || '');
    const displayName = String(settings.name || 'Buddy AI');

    return {
        id: 'assistant',
        conversation_type: 'ai',
        direct_key: null,
        created_by_identity_id: userId || null,
        posting_identity_id: null,
        posting_policy: null,
        name: displayName,
        description: null,
        image_file_id: null,
        last_message_id: null,
        last_message_at: null,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp,
        is_pinned: isPinned,
        is_muted: !notificationsEnabled,
        own_participant: {
            id: 'assistant-participant',
            conversation_id: 'assistant',
            identity_id: userId,
            role: 'owner',
            joined_at: timestamp,
            left_at: null,
            removed_at: null,
            removed_by_identity_id: null,
            cleared_at: null,
            cleared_before_message_id: null,
            last_read_message_id: null,
            last_read_at: null,
            last_delivered_message_id: null,
            last_delivered_at: null,
            unread_count: 0,
            notifications_enabled: notificationsEnabled,
            is_pinned: isPinned,
            created_at: timestamp,
            updated_at: timestamp,
            identity: {
                id: userId,
                identity_type: 'profile',
                profile_id: userId,
                commercial_profile_id: null,
                display_name: displayName,
                avatar_file_id: null,
                is_active: true,
                is_available: true,
            },
        },
    };
}

async function loadOrCreateSettings(
    supabase: SupabaseClient,
    userId: string,
): Promise<Json> {
    const current = unwrap(await supabase
        .from('assistant_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle());
    if (current) return mapSettings(current as Json);

    const profile = unwrap(await supabase
        .from('profiles')
        .select('assistant_name, assistant_tone')
        .eq('id', userId)
        .maybeSingle()) as Json | null;
    const created = unwrap(await supabase
        .from('assistant_settings')
        .insert({
            user_id: userId,
            name: String(profile?.assistant_name || 'Buddy AI').trim().slice(0, 40) || 'Buddy AI',
            tone: toneOf(profile?.assistant_tone),
        })
        .select('*')
        .single());
    return mapSettings(created as Json);
}

async function invokeAssistant(
    supabase: SupabaseClient,
    body: Json,
): Promise<Json> {
    const invoked = await supabase.functions.invoke('assistant', { body });
    const data = asJson(invoked.data);
    if (invoked.error || data.error) {
        throw new GatewayError(
            String(data.message || 'No se pudo usar el asistente.'),
            400,
        );
    }
    return data;
}

export async function handleAssistant(
    method: string,
    path: string,
    body: unknown,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);

    if (method === 'GET' && path === '/assistant/settings/') {
        return { settings: await loadOrCreateSettings(supabase, userId) };
    }

    if (method === 'PATCH' && path === '/assistant/settings/') {
        const patch: Json = { updated_at: new Date().toISOString() };
        if (payload.name !== undefined) {
            const name = String(payload.name).trim().slice(0, 40);
            if (!name) throw new GatewayError('Escribe un nombre para el asistente.', 400);
            patch.name = name;
        }
        if (payload.tone !== undefined) {
            if (!TONES.includes(String(payload.tone))) {
                throw new GatewayError('El tono no es válido.', 400);
            }
            patch.tone = payload.tone;
        }
        if (payload.voice !== undefined) {
            if (!VOICES.includes(String(payload.voice))) {
                throw new GatewayError('La voz no es válida.', 400);
            }
            patch.voice = payload.voice;
        }
        if (payload.voice_activation !== undefined) {
            patch.voice_activation = payload.voice_activation === true;
        }
        if (payload.assistance_level !== undefined) {
            if (!LEVELS.includes(String(payload.assistance_level))) {
                throw new GatewayError('El nivel de asistencia no es válido.', 400);
            }
            patch.assistance_level = payload.assistance_level;
        }
        if (payload.memory_enabled !== undefined) {
            patch.memory_enabled = payload.memory_enabled === true;
        }
        if (payload.language !== undefined) {
            if (!LANGUAGES.includes(String(payload.language))) {
                throw new GatewayError('El idioma no es válido.', 400);
            }
            patch.language = payload.language;
        }
        if (payload.permissions !== undefined) {
            const currentRow = (unwrap(await supabase
                .from('assistant_settings')
                .select('permissions')
                .eq('user_id', userId)
                .maybeSingle()) || {}) as Json;
            patch.permissions = {
                ...asJson(currentRow.permissions),
                ...permissionsOf(payload.permissions),
            };
        }
        await loadOrCreateSettings(supabase, userId);
        const updated = unwrap(await supabase
            .from('assistant_settings')
            .update(patch)
            .eq('user_id', userId)
            .select('*')
            .single());
        if (patch.name || patch.tone) {
            unwrap(await supabase
                .from('profiles')
                .update({
                    ...(patch.name ? { assistant_name: patch.name } : {}),
                    ...(patch.tone ? { assistant_tone: patch.tone } : {}),
                })
                .eq('id', userId));
        }
        return { settings: mapSettings(updated as Json) };
    }

    if (method === 'GET' && path === '/assistant/messages/') {
        const messages = (unwrap(await supabase
            .from('assistant_messages')
            .select('id, role, content, cards, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(80)) ?? []) as Json[];
        return { messages: messages.map(mapMessage) };
    }

    if (method === 'POST' && path === '/assistant/messages/') {
        const data = await invokeAssistant(supabase, {
            action: 'chat',
            message: payload.message,
            speak: payload.speak === true,
        });
        return {
            message: mapMessage(asJson(data.message)),
            cards: asRows<Json>(data.cards),
            audio_base64: data.audio_base64,
            audio_mime: data.audio_mime,
        };
    }

    const actionMatch = path.match(/^\/assistant\/actions\/([0-9a-f-]{36})\/(confirm|cancel)\/$/i);
    if (actionMatch && method === 'POST') {
        const data = await invokeAssistant(supabase, {
            action: actionMatch[2].toLowerCase(),
            action_id: actionMatch[1],
        });
        return {
            cancelled: data.cancelled === true,
            message: data.message ? mapMessage(asJson(data.message)) : null,
            cards: asRows<Json>(data.cards),
        };
    }

    if (method === 'POST' && path === '/assistant/voice/transcribe/') {
        return invokeAssistant(supabase, {
            action: 'transcribe',
            audio_base64: payload.audio_base64,
            mime: payload.mime || 'audio/m4a',
        });
    }

    if (method === 'POST' && path === '/assistant/voice/speak/') {
        return invokeAssistant(supabase, {
            action: 'speak',
            text: payload.text,
            voice: payload.voice,
        });
    }

    const mailMatch = path.match(/^\/assistant\/mail\/(draft|summarize|translate|suggest_reply)\/$/);
    if (mailMatch && method === 'POST') {
        return invokeAssistant(supabase, {
            action: 'mail',
            operation: mailMatch[1],
            subject: payload.subject,
            from: payload.from,
            text: payload.text,
            prompt: payload.prompt,
            language: payload.language,
        });
    }

    if (method === 'DELETE' && path === '/assistant/memories/') {
        unwrap(await supabase
            .from('assistant_memories')
            .delete()
            .eq('user_id', userId));
        return { cleared: true };
    }

    throw new GatewayError(`Ruta del asistente aún no disponible: ${path}`, 501);
}
