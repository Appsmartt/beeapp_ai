import type { SupabaseClient } from '@supabase/supabase-js';

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

type StorageTag = {
    id: string;
    owner_id: string;
    name: string;
    icon: string;
    color: string;
    is_default: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

function mimeKind(mime: string): string {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') {
        return 'spreadsheet';
    }
    if (mime.includes('presentation') || mime.includes('powerpoint')) {
        return 'presentation';
    }
    if (
        mime.includes('pdf')
        || mime.startsWith('text/')
        || mime.includes('word')
        || mime.includes('document')
    ) {
        return 'document';
    }
    if (
        mime.includes('zip')
        || mime.includes('rar')
        || mime.includes('7z')
        || mime.includes('compressed')
    ) {
        return 'archive';
    }
    return 'other';
}

function extensionOf(name: string): string | null {
    const parts = name.split('.');
    if (parts.length < 2) return null;
    return parts[parts.length - 1].toLowerCase();
}

export function mapStorageFile(row: Json | null): Json {
    const file = row || {};
    const name = String(file.name || 'archivo');
    const trashedAt = file.trashed_at ? String(file.trashed_at) : null;
    const uploadStatus = String(file.upload_status || 'ready');
    const status = trashedAt
        ? 'trashed'
        : uploadStatus === 'pending'
            ? 'uploading'
            : uploadStatus === 'failed'
                ? 'failed'
                : 'ready';
    const purgeAfter = trashedAt
        ? new Date(new Date(trashedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    return {
        id: file.id,
        owner_id: file.owner_id,
        folder_id: file.parent_id ?? null,
        bucket_id: file.bucket ?? null,
        storage_path: file.path ?? null,
        original_name: name,
        display_name: name,
        extension: extensionOf(name),
        mime_type: String(file.mime_type || 'application/octet-stream'),
        kind: mimeKind(String(file.mime_type || '')),
        size_bytes: Number(file.size_bytes || 0),
        status,
        is_starred: file.is_starred === true,
        trashed_at: trashedAt,
        purge_after: purgeAfter,
        created_at: file.created_at,
        updated_at: file.updated_at,
        bucket: file.bucket ?? null,
        path: file.path ?? null,
    };
}

function mapFolder(row: Json): Json {
    return {
        id: row.id,
        owner_id: row.owner_id,
        parent_id: row.parent_id ?? null,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

function catalogTags(settings: Json, userId: string): StorageTag[] {
    return asRows<StorageTag>(settings.storage_tags).map((tag, index) => ({
        id: String(tag.id || tag.name),
        owner_id: userId,
        name: String(tag.name || 'Etiqueta'),
        icon: String(tag.icon || 'Tag'),
        color: String(tag.color || '#6025D2'),
        is_default: tag.is_default === true,
        sort_order: Number(tag.sort_order ?? index),
        created_at: String(tag.created_at || new Date().toISOString()),
        updated_at: String(tag.updated_at || new Date().toISOString()),
    }));
}

async function saveTags(
    supabase: SupabaseClient,
    userId: string,
    tags: StorageTag[],
): Promise<void> {
    await writeSetting(supabase, userId, 'storage_tags', tags);
}

function tagNames(tags: StorageTag[], ids: string[]): string[] {
    return ids.map((id) => {
        const found = tags.find((tag) => tag.id === id || tag.name === id);
        return found ? found.name : id;
    });
}

function hiddenTag(tags: unknown): boolean {
    return Array.isArray(tags) && tags.some((tag) => (
        String(tag).startsWith('system:')
    ));
}

async function loadOwnedFile(
    supabase: SupabaseClient,
    userId: string,
    fileId: string,
): Promise<Json> {
    const file = unwrap(await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('owner_id', userId)
        .maybeSingle());

    if (!file) {
        throw new GatewayError('No encontramos el archivo.', 404);
    }

    return file as Json;
}

export async function handleStorage(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);
    const limit = Number(query.get('limit') || 50);
    const offset = Number(query.get('offset') || 0);

    if (method === 'GET' && path === '/storage/summary/') {
        const profile = unwrap(await supabase
            .from('profiles')
            .select('storage_quota_bytes, storage_used_bytes, updated_at')
            .eq('id', userId)
            .maybeSingle());
        const quotaBytes = Number(profile?.storage_quota_bytes ?? 5368709120);
        const usedBytes = Number(profile?.storage_used_bytes ?? 0);

        return {
            storage: {
                quota_bytes: quotaBytes,
                used_bytes: usedBytes,
                reserved_bytes: 0,
                available_bytes: Math.max(0, quotaBytes - usedBytes),
                usage_percentage: quotaBytes
                    ? Math.round((usedBytes / quotaBytes) * 100)
                    : 0,
                updated_at: profile?.updated_at ?? null,
            },
        };
    }

    if (method === 'GET' && path === '/storage/files/') {
        const rows = (unwrap(await supabase
            .from('files')
            .select('*')
            .eq('owner_id', userId)
            .eq('kind', 'file')
            .order('created_at', { ascending: false })) ?? []) as Json[];
        const folderId = query.get('folder_id');
        const status = query.get('status') || 'ready';
        const scope = query.get('scope') || 'all';
        const kind = query.get('kind');
        const tagId = query.get('tag_id');
        const search = (query.get('search') || '').trim().toLowerCase();
        const settings = await readSettings(supabase, userId);
        const tags = catalogTags(settings, userId);
        const tagName = tagId
            ? tags.find((tag) => tag.id === tagId)?.name || tagId
            : null;

        const files = rows
            .filter((row) => !hiddenTag(row.tags))
            .filter((row) => {
                if (folderId) return String(row.parent_id || '') === folderId;
                return true;
            })
            .filter((row) => (
                status === 'trashed'
                    ? Boolean(row.trashed_at)
                    : !row.trashed_at && row.upload_status === 'ready'
            ))
            .filter((row) => {
                const mime = String(row.mime_type || '');
                const fileKind = mimeKind(mime);
                if (kind && fileKind !== kind) return false;
                if (scope === 'documents') {
                    return fileKind === 'document'
                        || fileKind === 'spreadsheet'
                        || fileKind === 'presentation';
                }
                if (scope === 'media') {
                    return fileKind === 'image'
                        || fileKind === 'video'
                        || fileKind === 'audio';
                }
                return true;
            })
            .filter((row) => {
                if (!tagName) return true;
                const names = Array.isArray(row.tags) ? row.tags.map(String) : [];
                return names.includes(tagName);
            })
            .filter((row) => (
                !search || String(row.name || '').toLowerCase().includes(search)
            ))
            .slice(offset, offset + limit)
            .map(mapStorageFile);

        return { files, count: files.length, limit, offset };
    }

    if (method === 'GET' && path === '/storage/folders/') {
        const parentId = query.get('parent_id');
        const rows = (unwrap(await supabase
            .from('files')
            .select('*')
            .eq('owner_id', userId)
            .eq('kind', 'folder')
            .is('trashed_at', null)
            .order('name')) ?? []) as Json[];
        const folders = rows
            .filter((row) => (
                parentId
                    ? String(row.parent_id || '') === parentId
                    : true
            ))
            .map(mapFolder);

        return { folders };
    }

    if (method === 'POST' && path === '/storage/folders/') {
        const folder = mapFolder(unwrap(await supabase
            .from('files')
            .insert({
                owner_id: userId,
                parent_id: payload.parent_id ?? null,
                name: String(payload.name || 'Carpeta'),
                kind: 'folder',
                upload_status: 'ready',
            })
            .select('*')
            .single()) as Json);

        return { folder };
    }

    const folderMatch = path.match(new RegExp(`^/storage/folders/(${UUID})/$`, 'i'));

    if (folderMatch && method === 'PATCH') {
        const patch: Json = {};
        if (typeof payload.name === 'string') patch.name = payload.name;
        if ('parent_id' in payload) patch.parent_id = payload.parent_id;
        const folder = mapFolder(unwrap(await supabase
            .from('files')
            .update(patch)
            .eq('id', folderMatch[1])
            .eq('owner_id', userId)
            .eq('kind', 'folder')
            .select('*')
            .single()) as Json);

        return { folder };
    }

    if (folderMatch && method === 'DELETE') {
        unwrap(await supabase
            .from('files')
            .delete()
            .eq('id', folderMatch[1])
            .eq('owner_id', userId)
            .eq('kind', 'folder'));
        return undefined;
    }

    if (method === 'GET' && path === '/storage/tags/') {
        const settings = await readSettings(supabase, userId);
        return { tags: catalogTags(settings, userId) };
    }

    if (method === 'POST' && path === '/storage/tags/') {
        const settings = await readSettings(supabase, userId);
        const tags = catalogTags(settings, userId);
        const now = new Date().toISOString();
        const tag: StorageTag = {
            id: createId(),
            owner_id: userId,
            name: String(payload.name || 'Etiqueta'),
            icon: String(payload.icon || 'Tag'),
            color: String(payload.color || '#6025D2'),
            is_default: false,
            sort_order: Number(payload.sort_order ?? tags.length),
            created_at: now,
            updated_at: now,
        };
        tags.push(tag);
        await saveTags(supabase, userId, tags);
        return { tag };
    }

    const tagMatch = path.match(new RegExp(`^/storage/tags/(${UUID})/$`, 'i'));

    if (tagMatch && method === 'PATCH') {
        const settings = await readSettings(supabase, userId);
        const tags = catalogTags(settings, userId);
        const current = tags.find((tag) => tag.id === tagMatch[1]);
        if (!current) throw new GatewayError('No encontramos la etiqueta.', 404);
        const previousName = current.name;
        if (typeof payload.name === 'string') current.name = payload.name;
        if (typeof payload.icon === 'string') current.icon = payload.icon;
        if (typeof payload.color === 'string') current.color = payload.color;
        if (payload.sort_order !== undefined) {
            current.sort_order = Number(payload.sort_order);
        }
        current.updated_at = new Date().toISOString();
        await saveTags(supabase, userId, tags);
        if (previousName !== current.name) {
            const files = (unwrap(await supabase
                .from('files')
                .select('id, tags')
                .eq('owner_id', userId)
                .contains('tags', [previousName])) ?? []) as Json[];
            for (const file of files) {
                const names = Array.isArray(file.tags) ? file.tags.map(String) : [];
                unwrap(await supabase
                    .from('files')
                    .update({
                        tags: names.map((name) => (
                            name === previousName ? current.name : name
                        )),
                    })
                    .eq('id', file.id));
            }
        }
        return { tag: current };
    }

    if (tagMatch && method === 'DELETE') {
        const settings = await readSettings(supabase, userId);
        const tags = catalogTags(settings, userId);
        const current = tags.find((tag) => tag.id === tagMatch[1]);
        if (!current) return undefined;
        await saveTags(
            supabase,
            userId,
            tags.filter((tag) => tag.id !== current.id),
        );
        const files = (unwrap(await supabase
            .from('files')
            .select('id, tags')
            .eq('owner_id', userId)
            .contains('tags', [current.name])) ?? []) as Json[];
        for (const file of files) {
            const names = Array.isArray(file.tags) ? file.tags.map(String) : [];
            unwrap(await supabase
                .from('files')
                .update({ tags: names.filter((name) => name !== current.name) })
                .eq('id', file.id));
        }
        return undefined;
    }

    const fileTags = path.match(new RegExp(`^/storage/files/(${UUID})/tags/$`, 'i'));

    if (fileTags && method === 'GET') {
        const file = await loadOwnedFile(supabase, userId, fileTags[1]);
        const settings = await readSettings(supabase, userId);
        const catalog = catalogTags(settings, userId);
        const names = Array.isArray(file.tags) ? file.tags.map(String) : [];
        const tags = names.map((name) => (
            catalog.find((tag) => tag.name === name) || {
                id: name,
                owner_id: userId,
                name,
                icon: 'Tag',
                color: '#6025D2',
                is_default: false,
                sort_order: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
        ));
        return { tags };
    }

    if (fileTags && (method === 'PUT' || method === 'POST')) {
        const settings = await readSettings(supabase, userId);
        const catalog = catalogTags(settings, userId);
        const ids = Array.isArray(payload.tag_ids) ? payload.tag_ids.map(String) : [];
        const names = tagNames(catalog, ids);
        const file = unwrap(await supabase
            .from('files')
            .update({ tags: names })
            .eq('id', fileTags[1])
            .eq('owner_id', userId)
            .select('*')
            .single()) as Json;
        const applied = (Array.isArray(file.tags) ? file.tags.map(String) : [])
            .map((name) => catalog.find((tag) => tag.name === name))
            .filter((tag): tag is StorageTag => Boolean(tag));
        return { tags: applied };
    }

    const accessMatch = path.match(new RegExp(`^/storage/files/(${UUID})/access/$`, 'i'));

    if (method === 'GET' && accessMatch) {
        const visible = await supabase
            .from('files')
            .select('*')
            .eq('id', accessMatch[1])
            .maybeSingle();

        if (visible.error) throw new GatewayError(visible.error.message, 400);

        let file = visible.data as Json | null;

        if (!file) {
            const located = await supabase.rpc('profile_avatar_locations', {
                p_file_ids: [accessMatch[1]],
            });
            const location = asRows<Json>(located.data)[0];
            if (located.error || !location?.bucket || !location.path) {
                throw new GatewayError('No fue posible abrir el archivo.', 404);
            }
            file = {
                id: location.file_id || accessMatch[1],
                bucket: location.bucket,
                path: location.path,
            };
        }

        const signed = await supabase.storage
            .from(String(file.bucket || file.bucket_id))
            .createSignedUrl(
                String(file.path || file.storage_path),
                SIGNED_URL_SECONDS,
            );

        if (signed.error || !signed.data) {
            throw new GatewayError(
                signed.error?.message || 'No fue posible abrir el archivo.',
                400,
            );
        }

        return {
            file: mapStorageFile(file),
            url: signed.data.signedUrl,
            expires_in_seconds: SIGNED_URL_SECONDS,
            download: query.get('download') === 'true',
        };
    }

    const fileMatch = path.match(new RegExp(`^/storage/files/(${UUID})/$`, 'i'));

    if (fileMatch && method === 'PATCH') {
        const patch: Json = {};
        if (typeof payload.display_name === 'string') patch.name = payload.display_name;
        if (typeof payload.name === 'string') patch.name = payload.name;
        if ('folder_id' in payload) patch.parent_id = payload.folder_id;
        if ('parent_id' in payload) patch.parent_id = payload.parent_id;
        if ('is_starred' in payload) patch.is_starred = payload.is_starred === true;
        const file = mapStorageFile(unwrap(await supabase
            .from('files')
            .update(patch)
            .eq('id', fileMatch[1])
            .eq('owner_id', userId)
            .select('*')
            .single()) as Json);
        return { file };
    }

    if (fileMatch && method === 'DELETE') {
        const current = await loadOwnedFile(supabase, userId, fileMatch[1]);
        if (current.bucket && current.path) {
            await supabase.storage
                .from(String(current.bucket))
                .remove([String(current.path)]);
        }
        if (current.upload_status === 'ready') {
            const profile = unwrap(await supabase
                .from('profiles')
                .select('storage_used_bytes')
                .eq('id', userId)
                .maybeSingle());
            const used = Math.max(
                0,
                Number(profile?.storage_used_bytes || 0) - Number(current.size_bytes || 0),
            );
            unwrap(await supabase
                .from('profiles')
                .update({ storage_used_bytes: used })
                .eq('id', userId));
        }
        unwrap(await supabase
            .from('files')
            .delete()
            .eq('id', fileMatch[1])
            .eq('owner_id', userId));
        return undefined;
    }

    const trashMatch = path.match(new RegExp(`^/storage/files/(${UUID})/trash/$`, 'i'));
    if (trashMatch && method === 'POST') {
        unwrap(await supabase
            .from('files')
            .update({ trashed_at: new Date().toISOString() })
            .eq('id', trashMatch[1])
            .eq('owner_id', userId));
        return undefined;
    }

    const restoreMatch = path.match(new RegExp(`^/storage/files/(${UUID})/restore/$`, 'i'));
    if (restoreMatch && method === 'POST') {
        const file = mapStorageFile(unwrap(await supabase
            .from('files')
            .update({ trashed_at: null })
            .eq('id', restoreMatch[1])
            .eq('owner_id', userId)
            .select('*')
            .single()) as Json);
        return { file };
    }

    if (method === 'GET' && path === '/storage/share-recipients/') {
        const recipients = await searchProfiles(
            supabase,
            query.get('q') || '',
            limit,
        );
        return { recipients };
    }

    const sharesMatch = path.match(new RegExp(`^/storage/files/(${UUID})/shares/$`, 'i'));
    if (sharesMatch && method === 'POST') {
        const file = await loadOwnedFile(supabase, userId, sharesMatch[1]);
        const now = new Date().toISOString();
        const recipientId = String(payload.recipient_id || '');
        const share = {
            id: createId(),
            file_id: file.id,
            shared_by_user_id: userId,
            shared_with_user_id: recipientId,
            permission: payload.permission === 'editor' ? 'editor' : 'viewer',
            accepted_at: now,
            revoked_at: null,
            expires_at: payload.expires_at ?? null,
            hidden_at: null,
            shared_with_displayed_at: null,
            created_at: now,
            updated_at: now,
        };
        const shares = asRows<Json>(file.shares);
        const sharedWith = Array.isArray(file.shared_with)
            ? file.shared_with.map(String)
            : [];
        if (!sharedWith.includes(recipientId)) sharedWith.push(recipientId);
        unwrap(await supabase
            .from('files')
            .update({
                shares: [...shares, share],
                shared_with: sharedWith,
            })
            .eq('id', file.id)
            .eq('owner_id', userId));
        return { share };
    }

    if (method === 'GET' && path === '/storage/shares/received/') {
        const includeHidden = query.get('include_hidden') === 'true';
        const rows = (unwrap(await supabase
            .from('files')
            .select('*')
            .contains('shared_with', [userId])
            .order('updated_at', { ascending: false })) ?? []) as Json[];
        const shares = rows.flatMap((row) => (
            asRows<Json>(row.shares)
                .filter((share) => (
                    String(share.shared_with_user_id || '') === userId
                    && !share.revoked_at
                    && (includeHidden || !share.hidden_at)
                ))
                .map((share) => ({
                    ...share,
                    file: mapStorageFile(row),
                }))
        )).slice(offset, offset + limit);

        return { shares, count: shares.length, limit, offset };
    }

    const hideShare = path.match(new RegExp(`^/storage/shares/(${UUID})/hide/$`, 'i'));
    if (hideShare && method === 'POST') {
        unwrap(await supabase.rpc('hide_file_share', { p_share_id: hideShare[1] }));
        return { share: { id: hideShare[1], hidden_at: new Date().toISOString() } };
    }

    const revokeShare = path.match(new RegExp(`^/storage/shares/(${UUID})/revoke/$`, 'i'));
    if (revokeShare && method === 'POST') {
        unwrap(await supabase.rpc('revoke_file_share', { p_share_id: revokeShare[1] }));
        return { share: { id: revokeShare[1], revoked_at: new Date().toISOString() } };
    }

    throw new GatewayError(
        `Ruta de archivos aún no disponible en Supabase: ${path}`,
        501,
    );
}
