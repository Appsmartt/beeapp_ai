import type { SupabaseClient } from '@supabase/supabase-js';

import {
    asJson,
    asRows,
    GatewayError,
    type Json,
    requireClient,
    SIGNED_URL_SECONDS,
    unwrap,
    } from './runtime';

const UUID = '[0-9a-f-]{36}';

const CATALOG = [
    {
        id: 'google',
        name: 'Google',
        status: 'available',
        capabilities: ['mail', 'calendar'],
    },
    {
        id: 'microsoft',
        name: 'Microsoft',
        status: 'available',
        capabilities: ['mail', 'calendar'],
    },
];

function syncState(row: Json): Json {
    return asJson(row.sync_state);
}

export function mapConnection(row: Json): Json {
    const state = syncState(row);
    const configured = state.configured !== false;

    return {
        id: row.id,
        user_id: row.user_id,
        provider: row.provider,
        provider_account_id: row.provider_account_id || row.provider_email || row.id,
        provider_tenant_id: state.tenant_id ?? null,
        provider_email: row.provider_email ?? null,
        provider_display_name: row.provider_display_name ?? null,
        provider_avatar_url: state.avatar_url ?? null,
        status: row.status,
        granted_scopes: Array.isArray(row.granted_scopes) ? row.granted_scopes : [],
        capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
        token_expires_at: row.token_expires_at ?? null,
        last_token_refresh_at: state.last_token_refresh_at ?? null,
        last_successful_auth_at: row.connected_at ?? null,
        reauth_required_at: state.reauth_required_at ?? null,
        disconnected_at: state.disconnected_at ?? null,
        last_error_code: state.last_error_code ?? null,
        last_error_message: state.last_error_message ?? (
            configured ? null : 'Conexión no configurada'
        ),
        metadata: {},
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

function mapCapabilityIntegration(row: Json): Json {
    const state = syncState(row);
    const active = row.status === 'active' && Boolean(row.access_token_ciphertext);
    const needsReauth = row.status !== 'active' || !row.access_token_ciphertext;

    return {
        ...mapConnection(row),
        connected_at: row.connected_at ?? null,
        last_successful_sync_at: state.last_successful_sync_at ?? null,
        last_attempted_sync_at: state.last_attempted_sync_at ?? null,
        next_sync_at: state.next_sync_at ?? null,
        initial_sync_completed_at: state.initial_sync_completed_at ?? null,
        initial_sync_started_at: state.initial_sync_started_at ?? null,
        sync_cursor: state.sync_cursor ?? null,
        sync_cursor_updated_at: state.sync_cursor_updated_at ?? null,
        integration_connection_id: row.id,
        integration_connection: mapConnection(row),
        sync_status: active ? 'ready' : 'reauthorize',
        can_sync: active,
        requires_reauthorization: needsReauth,
        status_reason: needsReauth
            ? String(state.message || state.last_error_message || 'Conexión no configurada')
            : null,
    };
}

export async function integrationById(
    supabase: SupabaseClient,
    userId: string,
    integrationId: string,
    capability: 'mail' | 'calendar',
): Promise<Json> {
    const row = unwrap(await supabase
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('user_id', userId)
        .single()) as Json;
    const mapped = mapCapabilityIntegration(row);
    if (!asRows<string>(row.capabilities).includes(capability) && capability === 'mail') {
        mapped.provider = row.provider;
    }
    return mapped;
}

export async function handleCalendarIntegrations(
    supabase: SupabaseClient,
    userId: string,
): Promise<{ integrations: Json[] }> {
    const rows = (unwrap(await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .contains('capabilities', ['calendar'])) ?? []) as Json[];

    return { integrations: rows.map(mapCapabilityIntegration) };
}

function mapMessage(row: Json, provider = 'google'): Json {
    const attachments = asRows<Json>(row.attachments);
    const recipients = asJson(row.recipients);
    const folder = String(row.folder || 'inbox');

    return {
        id: row.id,
        mail_integration_id: row.integration_id,
        provider: provider || 'google',
        provider_message_id: row.external_id ?? null,
        provider_thread_id: null,
        provider_conversation_id: null,
        direction: folder === 'sent' || folder === 'drafts' ? 'outbound' : 'inbound',
        status: row.is_draft ? 'draft' : 'received',
        folder,
        is_read: row.is_read === true,
        is_starred: row.is_starred === true,
        is_archived: folder === 'archived',
        is_spam: folder === 'spam',
        is_trashed: folder === 'trash',
        subject: row.subject ?? null,
        body_preview: row.snippet ?? null,
        snippet: row.snippet ?? null,
        body_text: row.body ?? null,
        body_html: null,
        sent_at: row.received_at ?? null,
        received_at: row.received_at ?? null,
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length,
        sender: {
            email: row.from_address ?? null,
            display_name: row.from_address ?? null,
        },
        recipients,
        attachments,
        created_at: row.created_at,
        updated_at: row.created_at,
        last_synced_at: row.created_at,
    };
}

function recipientsOf(payload: Json): Json {
    const pack = (key: string) => (
        Array.isArray(payload[key]) ? payload[key] : []
    );

    return {
        to: pack('to'),
        cc: pack('cc'),
        bcc: pack('bcc'),
    };
}

async function notConfiguredMessage(
    supabase: SupabaseClient,
    body: Json,
): Promise<Json> {
    const invoked = await supabase.functions.invoke(
        body.provider === 'microsoft' ? 'oauth-microsoft' : 'oauth-google',
        { body },
    );
    const data = asJson(invoked.data);

    if (invoked.error || data.error) {
        const message = String(
            data.message
            || invoked.error?.message
            || 'Conexión no configurada. Carga las credenciales del proveedor en Supabase.',
        );
        throw new GatewayError(message, 400);
    }

    return {
        request_id: data.request_id || data.state,
        authorization_url: data.authorization_url,
        expires_at: data.expires_at || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
}

export async function handleIntegrations(
    method: string,
    path: string,
    body: unknown,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);

    if (method === 'GET' && path === '/integrations/catalog/') {
        return { providers: CATALOG };
    }

    if (method === 'GET' && path === '/integrations/connections/') {
        const rows = (unwrap(await supabase
            .from('integrations')
            .select('id, user_id, provider, provider_account_id, provider_email, provider_display_name, status, granted_scopes, capabilities, token_expires_at, connected_at, sync_state, created_at, updated_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })) ?? []) as Json[];
        return { connections: rows.map(mapConnection) };
    }

    const authorize = path.match(/^\/integrations\/connections\/(google|microsoft)\/authorize\/$/i);
    if (authorize && method === 'POST') {
        return notConfiguredMessage(supabase, {
            ...payload,
            provider: authorize[1].toLowerCase(),
            action: 'start',
        });
    }

    const reauthorize = path.match(new RegExp(`^/integrations/connections/(${UUID})/reauthorize/$`, 'i'));
    if (reauthorize && method === 'POST') {
        const row = unwrap(await supabase
            .from('integrations')
            .select('provider')
            .eq('id', reauthorize[1])
            .eq('user_id', userId)
            .single()) as Json;
        return notConfiguredMessage(supabase, {
            ...payload,
            provider: row.provider,
            connection_id: reauthorize[1],
            action: 'start',
        });
    }

    const record = path.match(new RegExp(`^/integrations/connections/(${UUID})/record/$`, 'i'));
    if (record && method === 'DELETE') {
        unwrap(await supabase
            .from('integrations')
            .delete()
            .eq('id', record[1])
            .eq('user_id', userId));
        return undefined;
    }

    const connection = path.match(new RegExp(`^/integrations/connections/(${UUID})/$`, 'i'));
    if (connection && method === 'GET') {
        const row = unwrap(await supabase
            .from('integrations')
            .select('id, user_id, provider, provider_account_id, provider_email, provider_display_name, status, granted_scopes, capabilities, token_expires_at, connected_at, sync_state, created_at, updated_at')
            .eq('id', connection[1])
            .eq('user_id', userId)
            .single()) as Json;
        return { connection: mapConnection(row) };
    }

    if (connection && method === 'DELETE') {
        unwrap(await supabase
            .from('integrations')
            .update({
                status: 'disconnected',
                access_token_ciphertext: null,
                refresh_token_ciphertext: null,
                sync_state: { disconnected_at: new Date().toISOString() },
            })
            .eq('id', connection[1])
            .eq('user_id', userId));
        return undefined;
    }

    if (method === 'POST' && path === '/integrations/connections/') {
        return notConfiguredMessage(supabase, {
            ...payload,
            provider: payload.provider || 'google',
            action: 'start',
        });
    }

    throw new GatewayError(
        `Ruta de integraciones aún no disponible en Supabase: ${path}`,
        501,
    );
}

export async function handleMail(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);
    const limit = Number(query.get('limit') || 50);
    const offset = Number(query.get('offset') || 0);

    if (method === 'GET' && path === '/mail/integrations/') {
        const rows = (unwrap(await supabase
            .from('integrations')
            .select('*')
            .eq('user_id', userId)
            .contains('capabilities', ['mail'])) ?? []) as Json[];
        return { integrations: rows.map(mapCapabilityIntegration) };
    }

    const integration = path.match(new RegExp(`^/mail/integrations/(${UUID})/$`, 'i'));
    if (integration && method === 'GET') {
        return {
            integration: await integrationById(supabase, userId, integration[1], 'mail'),
        };
    }

    if (method === 'GET' && path === '/mail/messages/') {
        let request = supabase
            .from('mail_messages')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('received_at', { ascending: false });
        if (query.get('integration_id')) {
            request = request.eq('integration_id', query.get('integration_id'));
        }
        if (query.get('folder')) request = request.eq('folder', query.get('folder'));
        if (query.get('unread_only') === 'true') request = request.eq('is_read', false);
        if (query.get('starred_only') === 'true') request = request.eq('is_starred', true);
        if (query.get('search')) {
            request = request.ilike('subject', `%${query.get('search')}%`);
        }
        const result = await request.range(offset, offset + limit - 1);
        if (result.error) throw new GatewayError(result.error.message, 400);
        const messages = ((result.data ?? []) as Json[]).map((row) => mapMessage(row));
        const total = result.count ?? messages.length;

        return {
            messages,
            count: messages.length,
            pagination: {
                limit,
                offset,
                count: messages.length,
                total_count: total,
                has_more: offset + messages.length < total,
                next_offset: offset + messages.length < total ? offset + limit : null,
            },
        };
    }

    if (method === 'POST' && path === '/mail/drafts/') {
        const message = mapMessage(unwrap(await supabase
            .from('mail_messages')
            .insert({
                user_id: userId,
                integration_id: payload.integration_id || null,
                folder: 'drafts',
                subject: payload.subject ?? null,
                body: payload.body ?? '',
                snippet: String(payload.body || '').slice(0, 160),
                recipients: recipientsOf(payload),
                attachments: Array.isArray(payload.file_ids)
                    ? payload.file_ids.map((id) => ({ file_id: id }))
                    : [],
                is_draft: true,
                is_read: true,
            })
            .select('*')
            .single()) as Json);
        return { message };
    }

    if (method === 'POST' && path === '/mail/sync/') {
        const invoked = await supabase.functions.invoke('mail-sync', { body: payload });
        const data = asJson(invoked.data);
        if (invoked.error && !data.failures) {
            return {
                requested_integration_count: 0,
                synced_integration_count: 0,
                failed_integration_count: 1,
                results: [],
                failures: [{
                    detail: invoked.error.message,
                    error_code: 'MAIL_SYNC_FAILED',
                }],
            };
        }
        return {
            requested_integration_count: Number(data.requested_integration_count || 0),
            synced_integration_count: Number(data.synced_integration_count || 0),
            failed_integration_count: Number(data.failed_integration_count || 0),
            results: Array.isArray(data.results) ? data.results : [],
            failures: Array.isArray(data.failures) ? data.failures : [],
        };
    }

    const state = path.match(new RegExp(`^/mail/messages/(${UUID})/state/$`, 'i'));
    if (state && method === 'PATCH') {
        const patch: Json = {};
        if ('is_read' in payload) patch.is_read = payload.is_read === true;
        if ('is_starred' in payload) patch.is_starred = payload.is_starred === true;
        const message = mapMessage(unwrap(await supabase
            .from('mail_messages')
            .update(patch)
            .eq('id', state[1])
            .eq('user_id', userId)
            .select('*')
            .single()) as Json);
        return { message };
    }

    const move = path.match(new RegExp(`^/mail/messages/(${UUID})/move/$`, 'i'));
    if (move && method === 'POST') {
        const folder = payload.folder === 'archived'
            ? 'archived'
            : payload.folder === 'spam'
                ? 'spam'
                : payload.folder === 'trash'
                    ? 'trash'
                    : 'inbox';
        const message = mapMessage(unwrap(await supabase
            .from('mail_messages')
            .update({ folder, is_draft: false })
            .eq('id', move[1])
            .eq('user_id', userId)
            .select('*')
            .single()) as Json);
        return { message };
    }

    const draft = path.match(new RegExp(`^/mail/messages/(${UUID})/draft/$`, 'i'));
    if (draft && method === 'PATCH') {
        const message = mapMessage(unwrap(await supabase
            .from('mail_messages')
            .update({
                integration_id: payload.integration_id,
                subject: payload.subject ?? null,
                body: payload.body ?? '',
                snippet: String(payload.body || '').slice(0, 160),
                recipients: recipientsOf(payload),
                attachments: Array.isArray(payload.file_ids)
                    ? payload.file_ids.map((id) => ({ file_id: id }))
                    : [],
            })
            .eq('id', draft[1])
            .eq('user_id', userId)
            .select('*')
            .single()) as Json);
        return { message };
    }

    if (draft && method === 'DELETE') {
        unwrap(await supabase
            .from('mail_messages')
            .delete()
            .eq('id', draft[1])
            .eq('user_id', userId)
            .eq('is_draft', true));
        return undefined;
    }

    const send = path.match(new RegExp(`^/mail/messages/(${UUID})/send/$`, 'i'));
    if (send && method === 'POST') {
        const current = unwrap(await supabase
            .from('mail_messages')
            .select('*')
            .eq('id', send[1])
            .eq('user_id', userId)
            .single()) as Json;
        const invoked = await supabase.functions.invoke('mail-sync', {
            body: {
                action: 'send',
                message_id: send[1],
                integration_id: current.integration_id,
            },
        });
        const data = asJson(invoked.data);
        if (data.status === 'reconnect_required' || data.error) {
            throw new GatewayError(
                String(data.message || 'Conexión no configurada. Vuelve a conectar la cuenta.'),
                400,
            );
        }
        const message = mapMessage(unwrap(await supabase
            .from('mail_messages')
            .update({
                folder: 'sent',
                is_draft: false,
                is_read: true,
                received_at: new Date().toISOString(),
            })
            .eq('id', send[1])
            .select('*')
            .single()) as Json);
        return { message };
    }

    const download = path.match(
        new RegExp(`^/mail/messages/(${UUID})/attachments/([^/]+)/download/$`, 'i'),
    );
    if (download && method === 'GET') {
        const message = unwrap(await supabase
            .from('mail_messages')
            .select('attachments')
            .eq('id', download[1])
            .eq('user_id', userId)
            .single()) as Json;
        const attachment = asRows<Json>(message.attachments)
            .find((item) => item.id === decodeURIComponent(download[2]) || item.file_id === download[2]);
        const fileId = attachment?.file_id;
        if (!fileId) {
            throw new GatewayError('Ese adjunto todavía no está guardado en Buddy AI.', 404);
        }
        const file = unwrap(await supabase
            .from('files')
            .select('bucket, path')
            .eq('id', fileId)
            .single()) as Json;
        const signed = await supabase.storage
            .from(String(file.bucket))
            .createSignedUrl(String(file.path), SIGNED_URL_SECONDS);
        if (signed.error || !signed.data) {
            throw new GatewayError(signed.error?.message || 'No fue posible descargar el adjunto.', 400);
        }
        return { url: signed.data.signedUrl };
    }

    const messageMatch = path.match(new RegExp(`^/mail/messages/(${UUID})/$`, 'i'));
    if (messageMatch && method === 'GET') {
        const message = mapMessage(unwrap(await supabase
            .from('mail_messages')
            .select('*')
            .eq('id', messageMatch[1])
            .eq('user_id', userId)
            .single()) as Json);
        return { message };
    }

    if (messageMatch && method === 'DELETE') {
        unwrap(await supabase
            .from('mail_messages')
            .delete()
            .eq('id', messageMatch[1])
            .eq('user_id', userId));
        return undefined;
    }

    throw new GatewayError(
        `Ruta de correo aún no disponible en Supabase: ${path}`,
        501,
    );
}
