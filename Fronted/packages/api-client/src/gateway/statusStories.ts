import type { SupabaseClient } from '@supabase/supabase-js';

import {
    asJson,
    asRows,
    type Json,
    SIGNED_URL_SECONDS,
    signedUrlsForFileIds,
    } from './runtime';

function finiteNumber(value: unknown, fallback: number): number {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function objectValue(value: unknown): Json {
    return asJson(value);
}

export function statusBackgroundRecord(input: {
    textBackgroundId?: unknown;
    editorMetadata?: unknown;
    commercialOfferLink?: unknown;
}): Json {
    const background: Json = {};
    const backgroundId = String(input.textBackgroundId || '').trim();
    const editorMetadata = objectValue(input.editorMetadata);
    const commercialOfferLink = objectValue(input.commercialOfferLink);

    if (backgroundId) background.id = backgroundId;
    if (Object.keys(editorMetadata).length > 0) {
        background.editor_metadata = editorMetadata;
    }
    if (Object.keys(commercialOfferLink).length > 0) {
        background.commercial_offer_link = commercialOfferLink;
    }

    return background;
}

export function statusLayersWithFileIds(value: unknown): Json[] {
    return asRows<unknown>(value).flatMap((item) => {
        const layer = objectValue(item);
        const fileId = String(layer.file_id || '').trim();
        if (!fileId) return [];

        return [{
            ...layer,
            file_id: fileId,
            x: finiteNumber(layer.x, 50),
            y: finiteNumber(layer.y, 50),
            scale: finiteNumber(layer.scale, 1),
            rotation: finiteNumber(layer.rotation, 0),
            size: finiteNumber(layer.size, 96),
            sort_order: finiteNumber(layer.sort_order, 0),
        }];
    });
}

function primaryMediaRecord(row: Json): Json | null {
    const media = row.media;

    if (Array.isArray(media)) {
        if (media.length !== 1) return null;
        const item = objectValue(media[0]);
        return item.file_id ? item : null;
    }

    const item = objectValue(media);
    return item.file_id ? item : null;
}

function storyKind(media: Json | null): string {
    if (!media) return 'text';

    const mime = String(media.mime_type || '').toLowerCase();
    const name = String(
        media.original_name || media.name || '',
    ).toLowerCase();

    if (mime.startsWith('video/') || name.endsWith('.mp4')) return 'video';
    if (mime === 'image/gif' || name.endsWith('.gif')) return 'gif';
    return 'image';
}

function mediaPayload(
    media: Json,
    url: string | null,
): Json {
    const fileId = String(media.file_id);

    return {
        id: fileId,
        file_id: fileId,
        bucket_id: String(media.bucket_id || media.bucket || ''),
        storage_path: String(media.storage_path || media.path || ''),
        original_name: String(media.original_name || media.name || 'estado'),
        mime_type: String(media.mime_type || 'application/octet-stream'),
        size_bytes: finiteNumber(media.size_bytes, 0),
        width: media.width ?? null,
        height: media.height ?? null,
        duration_seconds: media.duration_seconds ?? null,
        url,
        url_expires_in_seconds: url ? SIGNED_URL_SECONDS : null,
    };
}

export async function profileAvatarUrl(
    supabase: SupabaseClient,
    author: Json | null | undefined,
): Promise<string | null> {
    const fileId = author?.avatar_file_id;
    if (!fileId) return null;

    const urls = await signedUrlsForFileIds(supabase, [fileId]);
    return urls.get(String(fileId)) ?? null;
}

export async function mapStatusRowToStory(
    supabase: SupabaseClient,
    row: Json,
    author: Json | undefined,
    userId: string,
    avatarUrl: string | null = null,
): Promise<Json> {
    const background = objectValue(row.background);
    const storedMedia = primaryMediaRecord(row);
    const storedLayers = asRows<unknown>(row.layers).map(objectValue);
    const fileIds = [
        storedMedia?.file_id,
        ...storedLayers.map((layer) => layer.file_id),
    ];
    const urls = await signedUrlsForFileIds(supabase, fileIds);
    const kind = storyKind(storedMedia);
    const media = storedMedia
        ? mediaPayload(
            storedMedia,
            urls.get(String(storedMedia.file_id)) ?? null,
        )
        : null;
    const imageLayers = storedLayers.flatMap((layer) => {
        const fileId = String(layer.file_id || '').trim();
        const url = fileId ? urls.get(fileId) ?? null : null;
        if (!fileId || !url) return [];

        return [{
            id: String(layer.id || fileId),
            file_id: fileId,
            bucket_id: String(layer.bucket_id || layer.bucket || ''),
            storage_path: String(layer.storage_path || layer.path || ''),
            original_name: String(layer.original_name || layer.name || 'imagen-adjunta.jpg'),
            mime_type: String(layer.mime_type || 'image/jpeg'),
            size_bytes: finiteNumber(layer.size_bytes, 0),
            x: finiteNumber(layer.x, 50),
            y: finiteNumber(layer.y, 50),
            scale: finiteNumber(layer.scale, 1),
            rotation: finiteNumber(layer.rotation, 0),
            size: finiteNumber(layer.size, 96),
            sort_order: finiteNumber(layer.sort_order, 0),
            url,
            url_expires_in_seconds: SIGNED_URL_SECONDS,
        }];
    });
    const commercialOfferLink = objectValue(background.commercial_offer_link);
    const displayName = author
        ? `${author.first_name || ''} ${author.last_name || ''}`.trim() || 'Usuario'
        : 'Usuario';

    return {
        id: row.id,
        actor: {
            actor_type: 'profile',
            actor_id: row.author_id,
            profile_id: row.author_id,
            commercial_profile_id: null,
            display_name: displayName,
            avatar_file_id: author?.avatar_file_id ?? null,
            avatar_url: avatarUrl,
            avatar_url_expires_in_seconds: avatarUrl ? SIGNED_URL_SECONDS : null,
        },
        kind,
        caption: row.body ?? null,
        text_content: kind === 'text' ? row.body ?? null : null,
        text_background_id: background.id ?? null,
        editor_metadata: objectValue(background.editor_metadata),
        created_at: row.created_at,
        expires_at: row.expires_at,
        manually_archived_at: row.archived_at ?? null,
        deleted_at: null,
        is_owner: row.author_id === userId,
        is_viewed: false,
        media,
        image_layers: imageLayers,
        commercial_offer_link: Object.keys(commercialOfferLink).length > 0
            ? commercialOfferLink
            : null,
    };
}
