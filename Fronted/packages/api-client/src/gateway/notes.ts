import type { SupabaseClient } from '@supabase/supabase-js';

import { mapStorageFile } from './storage';
import {
    asJson,
    asRows,
    createId,
    GatewayError,
    type Json,
    readSettings,
    requireClient,
    searchProfiles,
    SIGNED_URL_SECONDS,
    unwrap,
    writeSetting,
    } from './runtime';

const UUID = '[0-9a-f-]{36}';

const BUILTIN_TEMPLATES = [
    {
        id: 'blank',
        slug: 'blank',
        name: 'Nota en blanco',
        description: 'Empieza desde cero.',
        icon: 'FileText',
        color: '#6025D2',
        content: { version: 1, blocks: [] },
        is_active: true,
        display_order: 0,
        created_by: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
        id: 'checklist',
        slug: 'checklist',
        name: 'Lista',
        description: 'Pendientes con casillas.',
        icon: 'ListChecks',
        color: '#0F766E',
        content: {
            version: 1,
            blocks: [{
                id: 'check-1',
                type: 'checklist',
                items: [{ id: 'item-1', text: '', checked: false }],
            }],
        },
        is_active: true,
        display_order: 1,
        created_by: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
    },
];

function mapNote(row: Json | null): Json {
    const note = row || {};
    const body = note.body;
    const content = body && typeof body === 'object'
        ? body
        : { version: 1, blocks: [] };

    return {
        id: note.id,
        owner_id: note.owner_id,
        folder_id: note.folder ?? null,
        template_id: note.template_id ?? null,
        title: note.title ?? null,
        content,
        template_snapshot: null,
        color: note.color ?? null,
        is_favorite: note.is_favorite === true,
        is_pinned: note.is_pinned === true,
        is_archived: Boolean(note.archived_at),
        position: note.position ?? null,
        deleted_at: note.trashed_at ?? null,
        purge_after: note.purge_after ?? null,
        last_opened_at: note.last_opened_at ?? null,
        created_at: note.created_at,
        updated_at: note.updated_at,
        tags: Array.isArray(note.tags) ? note.tags : [],
    };
}

function notePatch(payload: Json): Json {
    const patch: Json = {};
    if ('title' in payload) patch.title = payload.title;
    if ('content' in payload) patch.body = payload.content;
    if ('body' in payload) patch.body = payload.body;
    if ('folder_id' in payload) patch.folder = payload.folder_id;
    if ('color' in payload) patch.color = payload.color;
    if ('is_favorite' in payload) patch.is_favorite = payload.is_favorite === true;
    if ('is_pinned' in payload) patch.is_pinned = payload.is_pinned === true;
    if ('is_archived' in payload) {
        patch.archived_at = payload.is_archived ? new Date().toISOString() : null;
    }
    if ('position' in payload) patch.position = payload.position == null
        ? null
        : String(payload.position);
    if ('last_opened_at' in payload) patch.last_opened_at = payload.last_opened_at;
    if ('template_id' in payload) patch.template_id = payload.template_id;
    return patch;
}

async function foldersOf(
    supabase: SupabaseClient,
    userId: string,
): Promise<Json[]> {
    const settings = await readSettings(supabase, userId);
    return asRows<Json>(settings.note_folders);
}

async function tagsOf(
    supabase: SupabaseClient,
    userId: string,
): Promise<Json[]> {
    const settings = await readSettings(supabase, userId);
    return asRows<Json>(settings.note_tags);
}

function sharesOf(note: Json): Json[] {
    return asRows<Json>(note.shared_with);
}

export async function handleNotes(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);
    const limit = Number(query.get('limit') || 50);
    const offset = Number(query.get('offset') || 0);

    if (method === 'GET' && path === '/notes/') {
        const rows = (unwrap(await supabase
            .from('notes')
            .select('*')
            .eq('owner_id', userId)
            .eq('is_template', false)
            .order('updated_at', { ascending: false })) ?? []) as Json[];
        const deleted = query.get('deleted') === 'true';
        const folderId = query.get('folder_id');
        const search = (query.get('search') || '').trim().toLowerCase();
        const notes = rows
            .filter((row) => (deleted ? Boolean(row.trashed_at) : !row.trashed_at))
            .filter((row) => (folderId ? String(row.folder || '') === folderId : true))
            .filter((row) => (
                query.get('is_favorite') === 'true' ? row.is_favorite === true : true
            ))
            .filter((row) => (
                query.get('is_pinned') === 'true' ? row.is_pinned === true : true
            ))
            .filter((row) => (
                query.get('is_archived') === 'true' ? Boolean(row.archived_at) : true
            ))
            .filter((row) => (
                !search || String(row.title || '').toLowerCase().includes(search)
            ))
            .slice(offset, offset + limit)
            .map(mapNote);

        return { notes, count: notes.length, limit, offset };
    }

    if (method === 'POST' && path === '/notes/') {
        const template = BUILTIN_TEMPLATES.find(
            (item) => item.id === payload.template_id || item.slug === payload.template_id,
        );
        const note = mapNote(unwrap(await supabase
            .from('notes')
            .insert({
                owner_id: userId,
                title: payload.title ?? template?.name ?? '',
                body: payload.content ?? template?.content ?? { version: 1, blocks: [] },
                folder: payload.folder_id ?? null,
                template_id: template ? null : payload.template_id ?? null,
                is_template: false,
            })
            .select('*')
            .single()) as Json);

        return { note };
    }

    if (method === 'GET' && path === '/notes/folders/') {
        const parentId = query.get('parent_id');
        const folders = (await foldersOf(supabase, userId))
            .filter((folder) => (
                parentId
                    ? String(folder.parent_id || '') === parentId
                    : !folder.parent_id
            ));
        return { folders };
    }

    if (method === 'POST' && path === '/notes/folders/') {
        const folders = await foldersOf(supabase, userId);
        const now = new Date().toISOString();
        const folder = {
            id: createId(),
            owner_id: userId,
            parent_id: payload.parent_id ?? null,
            name: String(payload.name || 'Carpeta'),
            created_at: now,
            updated_at: now,
        };
        folders.push(folder);
        await writeSetting(supabase, userId, 'note_folders', folders);
        return { folder };
    }

    const folderMatch = path.match(new RegExp(`^/notes/folders/(${UUID})/$`, 'i'));

    if (folderMatch && method === 'PATCH') {
        const folders = await foldersOf(supabase, userId);
        const folder = folders.find((item) => item.id === folderMatch[1]);
        if (!folder) throw new GatewayError('No encontramos la carpeta.', 404);
        if (typeof payload.name === 'string') folder.name = payload.name;
        if ('parent_id' in payload) folder.parent_id = payload.parent_id;
        folder.updated_at = new Date().toISOString();
        await writeSetting(supabase, userId, 'note_folders', folders);
        return { folder };
    }

    if (folderMatch && method === 'DELETE') {
        const folders = await foldersOf(supabase, userId);
        await writeSetting(
            supabase,
            userId,
            'note_folders',
            folders.filter((folder) => folder.id !== folderMatch[1]),
        );
        unwrap(await supabase
            .from('notes')
            .update({ folder: null })
            .eq('owner_id', userId)
            .eq('folder', folderMatch[1]));
        return undefined;
    }

    if (method === 'GET' && path === '/notes/tags/') {
        return { tags: await tagsOf(supabase, userId) };
    }

    if (method === 'POST' && path === '/notes/tags/') {
        const tags = await tagsOf(supabase, userId);
        const now = new Date().toISOString();
        const tag = {
            id: createId(),
            owner_id: userId,
            name: String(payload.name || 'Etiqueta'),
            color: String(payload.color || '#6025D2'),
            icon: String(payload.icon || 'Tag'),
            sort_order: Number(payload.sort_order ?? tags.length),
            created_at: now,
            updated_at: now,
        };
        tags.push(tag);
        await writeSetting(supabase, userId, 'note_tags', tags);
        return { tag };
    }

    const tagMatch = path.match(new RegExp(`^/notes/tags/(${UUID})/$`, 'i'));

    if (tagMatch && method === 'PATCH') {
        const tags = await tagsOf(supabase, userId);
        const tag = tags.find((item) => item.id === tagMatch[1]);
        if (!tag) throw new GatewayError('No encontramos la etiqueta.', 404);
        if (typeof payload.name === 'string') tag.name = payload.name;
        if (typeof payload.color === 'string') tag.color = payload.color;
        if (typeof payload.icon === 'string') tag.icon = payload.icon;
        if (payload.sort_order !== undefined) tag.sort_order = Number(payload.sort_order);
        tag.updated_at = new Date().toISOString();
        await writeSetting(supabase, userId, 'note_tags', tags);
        return { tag };
    }

    if (tagMatch && method === 'DELETE') {
        const tags = await tagsOf(supabase, userId);
        await writeSetting(
            supabase,
            userId,
            'note_tags',
            tags.filter((tag) => tag.id !== tagMatch[1]),
        );
        return undefined;
    }

    if (method === 'GET' && path === '/notes/templates/') {
        const includeInactive = query.get('include_inactive') === 'true';
        const custom = ((unwrap(await supabase
            .from('notes')
            .select('*')
            .eq('owner_id', userId)
            .eq('is_template', true)) ?? []) as Json[])
            .map((row) => ({
                id: row.id,
                slug: String(row.id),
                name: row.title || 'Plantilla',
                description: null,
                icon: 'FileText',
                color: row.color || '#6025D2',
                content: row.body,
                is_active: !row.archived_at,
                display_order: 100,
                created_by: userId,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
        const templates = [...BUILTIN_TEMPLATES, ...custom]
            .filter((template) => includeInactive || template.is_active);

        return { templates };
    }

    if (
        method === 'GET'
        && (path === '/notes/shares/recipients/' || path === '/notes/share-recipients/')
    ) {
        return {
            recipients: await searchProfiles(
                supabase,
                query.get('q') || '',
                limit,
            ),
        };
    }

    if (method === 'GET' && path === '/notes/shares/received/') {
        const includeHidden = query.get('include_hidden') === 'true';
        const rows = (unwrap(await supabase
            .from('notes')
            .select('*')
            .neq('owner_id', userId)
            .order('updated_at', { ascending: false })) ?? []) as Json[];
        const shares = rows.flatMap((row) => (
            sharesOf(row)
                .filter((share) => (
                    String(share.shared_with_user_id || '') === userId
                    && !share.revoked_at
                    && (includeHidden || !share.hidden_at)
                ))
                .map((share) => ({
                    ...share,
                    note: mapNote(row),
                }))
        )).slice(offset, offset + limit);

        return { shares, count: shares.length, limit, offset };
    }

    if (method === 'GET' && path === '/notes/shares/sent/') {
        const rows = (unwrap(await supabase
            .from('notes')
            .select('*')
            .eq('owner_id', userId)) ?? []) as Json[];
        const shares = rows.flatMap((row) => (
            sharesOf(row)
                .filter((share) => !share.revoked_at)
                .map((share) => ({ ...share, note: mapNote(row) }))
        )).slice(offset, offset + limit);

        return { shares, count: shares.length, limit, offset };
    }

    const hideShare = path.match(new RegExp(`^/notes/shares/(${UUID})/hide/$`, 'i'));
    if (hideShare && method === 'POST') {
        unwrap(await supabase.rpc('hide_note_share', { p_share_id: hideShare[1] }));
        return { share: { id: hideShare[1], hidden_at: new Date().toISOString() } };
    }

    const revokeShare = path.match(new RegExp(`^/notes/shares/(${UUID})/revoke/$`, 'i'));
    if (revokeShare && method === 'POST') {
        unwrap(await supabase.rpc('revoke_note_share', { p_share_id: revokeShare[1] }));
        return { share: { id: revokeShare[1], revoked_at: new Date().toISOString() } };
    }

    const noteTags = path.match(new RegExp(`^/notes/(${UUID})/tags/$`, 'i'));

    if (noteTags && method === 'GET') {
        const note = unwrap(await supabase
            .from('notes')
            .select('tags')
            .eq('id', noteTags[1])
            .maybeSingle()) as Json | null;
        const names = Array.isArray(note?.tags) ? note.tags.map(String) : [];
        const catalog = await tagsOf(supabase, userId);
        const tags = names.map((name) => (
            catalog.find((tag) => tag.id === name || tag.name === name) || {
                id: name,
                owner_id: userId,
                name,
                color: '#6025D2',
                icon: 'Tag',
                sort_order: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
        ));
        return { tags };
    }

    if (noteTags && (method === 'PUT' || method === 'POST')) {
        const ids = Array.isArray(payload.tag_ids) ? payload.tag_ids.map(String) : [];
        const catalog = await tagsOf(supabase, userId);
        const names = ids.map((id) => (
            catalog.find((tag) => tag.id === id)?.name || id
        ));
        unwrap(await supabase
            .from('notes')
            .update({ tags: names })
            .eq('id', noteTags[1])
            .eq('owner_id', userId));
        return {
            tags: names.map((name) => (
                catalog.find((tag) => tag.name === name) || { id: name, name, owner_id: userId }
            )),
        };
    }

    const attachments = path.match(new RegExp(`^/notes/(${UUID})/attachments/$`, 'i'));

    if (attachments && method === 'GET') {
        const note = unwrap(await supabase
            .from('notes')
            .select('attachments')
            .eq('id', attachments[1])
            .maybeSingle()) as Json | null;
        const items = asRows<Json>(note?.attachments);
        const files = items.length
            ? (unwrap(await supabase
                .from('files')
                .select('*')
                .in('id', items.map((item) => String(item.file_id)))) ?? []) as Json[]
            : [];
        const byId = new Map(files.map((file) => [String(file.id), file]));

        return {
            attachments: items.map((item) => ({
                ...item,
                note_id: attachments[1],
                file: mapStorageFile(byId.get(String(item.file_id)) || {}),
            })),
        };
    }

    if (attachments && method === 'POST') {
        const note = unwrap(await supabase
            .from('notes')
            .select('attachments')
            .eq('id', attachments[1])
            .eq('owner_id', userId)
            .single()) as Json;
        const current = asRows<Json>(note.attachments);
        const file = unwrap(await supabase
            .from('files')
            .select('*')
            .eq('id', String(payload.file_id || ''))
            .single()) as Json;
        const attachment = {
            id: createId(),
            note_id: attachments[1],
            file_id: file.id,
            attachment_type: payload.attachment_type || 'attachment',
            display_order: Number(payload.display_order ?? current.length),
            created_at: new Date().toISOString(),
            file: mapStorageFile(file),
        };
        unwrap(await supabase
            .from('notes')
            .update({ attachments: [...current, attachment] })
            .eq('id', attachments[1]));
        return { attachment };
    }

    const attachment = path.match(
        new RegExp(`^/notes/(${UUID})/attachments/(${UUID})/$`, 'i'),
    );

    if (attachment && method === 'PATCH') {
        const note = unwrap(await supabase
            .from('notes')
            .select('attachments')
            .eq('id', attachment[1])
            .eq('owner_id', userId)
            .single()) as Json;
        const items = asRows<Json>(note.attachments).map((item) => (
            item.id === attachment[2] ? { ...item, ...payload } : item
        ));
        unwrap(await supabase
            .from('notes')
            .update({ attachments: items })
            .eq('id', attachment[1]));
        return { attachment: items.find((item) => item.id === attachment[2]) };
    }

    if (attachment && method === 'DELETE') {
        const note = unwrap(await supabase
            .from('notes')
            .select('attachments')
            .eq('id', attachment[1])
            .eq('owner_id', userId)
            .single()) as Json;
        unwrap(await supabase
            .from('notes')
            .update({
                attachments: asRows<Json>(note.attachments)
                    .filter((item) => item.id !== attachment[2]),
            })
            .eq('id', attachment[1]));
        return undefined;
    }

    const attachmentAccess = path.match(
        new RegExp(`^/notes/(${UUID})/attachments/(${UUID})/access/$`, 'i'),
    );

    if (attachmentAccess && method === 'GET') {
        const note = unwrap(await supabase
            .from('notes')
            .select('attachments')
            .eq('id', attachmentAccess[1])
            .maybeSingle()) as Json;
        const item = asRows<Json>(note.attachments)
            .find((entry) => entry.id === attachmentAccess[2]);
        if (!item?.file_id) {
            throw new GatewayError('No encontramos el adjunto.', 404);
        }
        const file = unwrap(await supabase
            .from('files')
            .select('*')
            .eq('id', item.file_id)
            .single()) as Json;
        const signed = await supabase.storage
            .from(String(file.bucket))
            .createSignedUrl(String(file.path), SIGNED_URL_SECONDS);
        if (signed.error || !signed.data) {
            throw new GatewayError(
                signed.error?.message || 'No fue posible abrir el adjunto.',
                400,
            );
        }

        return {
            attachment: { ...item, file: mapStorageFile(file) },
            url: signed.data.signedUrl,
            expires_in_seconds: SIGNED_URL_SECONDS,
            download: query.get('download') === 'true',
        };
    }

    const noteShares = path.match(new RegExp(`^/notes/(${UUID})/shares/$`, 'i'));

    if (noteShares && method === 'POST') {
        const note = unwrap(await supabase
            .from('notes')
            .select('*')
            .eq('id', noteShares[1])
            .eq('owner_id', userId)
            .single()) as Json;
        const now = new Date().toISOString();
        const share = {
            id: createId(),
            note_id: note.id,
            shared_by_user_id: userId,
            shared_with_user_id: String(payload.recipient_id || payload.shared_with_user_id || ''),
            permission: payload.permission || 'viewer',
            accepted_at: now,
            revoked_at: null,
            expires_at: payload.expires_at ?? null,
            hidden_at: null,
            shared_with_displayed_at: null,
            created_at: now,
            updated_at: now,
        };
        unwrap(await supabase
            .from('notes')
            .update({ shared_with: [...sharesOf(note), share] })
            .eq('id', note.id));
        return { share };
    }

    const trash = path.match(new RegExp(`^/notes/(${UUID})/trash/$`, 'i'));
    if (trash && method === 'POST') {
        unwrap(await supabase
            .from('notes')
            .update({
                trashed_at: new Date().toISOString(),
                purge_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', trash[1])
            .eq('owner_id', userId));
        return undefined;
    }

    const restore = path.match(new RegExp(`^/notes/(${UUID})/restore/$`, 'i'));
    if (restore && method === 'POST') {
        const note = mapNote(unwrap(await supabase
            .from('notes')
            .update({ trashed_at: null, purge_after: null })
            .eq('id', restore[1])
            .eq('owner_id', userId)
            .select('*')
            .single()) as Json);
        return { note };
    }

    const noteMatch = path.match(new RegExp(`^/notes/(${UUID})/$`, 'i'));

    if (noteMatch && method === 'GET') {
        return {
            note: mapNote(unwrap(await supabase
                .from('notes')
                .select('*')
                .eq('id', noteMatch[1])
                .single()) as Json),
        };
    }

    if (noteMatch && method === 'PATCH') {
        const note = mapNote(unwrap(await supabase
            .from('notes')
            .update(notePatch(payload))
            .eq('id', noteMatch[1])
            .eq('owner_id', userId)
            .select('*')
            .single()) as Json);
        return { note };
    }

    if (noteMatch && method === 'DELETE') {
        unwrap(await supabase
            .from('notes')
            .delete()
            .eq('id', noteMatch[1])
            .eq('owner_id', userId));
        return undefined;
    }

    throw new GatewayError(
        `Ruta de notas aún no disponible en Supabase: ${path}`,
        501,
    );
}
