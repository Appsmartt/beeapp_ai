import type { SupabaseClient } from '@supabase/supabase-js';

import {
    getNativeFileSize,
    getNativeUploader,
    } from '../nativeUpload';
import { mapStatusRowToStory, profileAvatarUrl, statusBackgroundRecord } from './statusStories';
import { mapStorageFile } from './storage';
import {
    asJson,
    asRows,
    createId,
    GatewayError,
    type Json,
    pathOf,
    requireClient,
    unwrap,
    } from './runtime';

type UploadFile = {
    name: string;
    type: string;
    uri?: string;
    blob?: Blob;
};

type NamedUpload = {
    key: string;
    file: UploadFile;
};

type PreparedUpload = {
    upload_id: string;
    file_id: string;
    storage_path: string;
    bucket_id: string;
};

function supabaseConfig(): { url: string; anonKey: string } {
    return {
        url: (
            process.env.EXPO_PUBLIC_SUPABASE_URL
            || process.env.NEXT_PUBLIC_SUPABASE_URL
            || ''
        ).replace(/\/$/, ''),
        anonKey: (
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
            || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            || ''
        ).trim(),
    };
}

function readForm(formData: FormData): {
    files: UploadFile[];
    namedFiles: NamedUpload[];
    fields: Record<string, string>;
} {
    const files: UploadFile[] = [];
    const namedFiles: NamedUpload[] = [];
    const fields: Record<string, string> = {};

    const push = (key: string, value: unknown) => {
        if (typeof value === 'string') {
            fields[key] = value;
            return;
        }

        if (!value || typeof value !== 'object') return;

        const file = value as {
            name?: string;
            type?: string;
            uri?: string;
        };

        if (file.uri || 'arrayBuffer' in value) {
            const upload = {
                name: file.name || 'archivo',
                type: file.type || 'application/octet-stream',
                uri: file.uri,
                blob: 'arrayBuffer' in value ? value as Blob : undefined,
            };
            files.push(upload);
            namedFiles.push({
                key,
                file: upload,
            });
        }
    };

    const parts = (formData as FormData & {
        _parts?: Array<[string, unknown]>;
    })._parts;

    if (Array.isArray(parts)) {
        for (const [key, value] of parts) push(key, value);
        return { files, namedFiles, fields };
    }

    formData.forEach((value, key) => push(key, value));
    return { files, namedFiles, fields };
}

function uploadErrorMessage(body: string, status: number): string {
    try {
        const parsed = JSON.parse(body) as Json;
        const message = parsed.message || parsed.error || parsed.detail;
        if (typeof message === 'string' && message.trim()) return message;
    } catch {
        // El storage a veces responde texto plano.
    }

    const text = body.trim();
    return text.slice(0, 240) || `No se pudo subir el archivo (${status}).`;
}

async function putObject(
    supabase: SupabaseClient,
    bucket: string,
    storagePath: string,
    file: UploadFile,
    contentType: string,
): Promise<void> {
    const native = getNativeUploader();

    if (file.uri && native) {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token || '';
        const { url, anonKey } = supabaseConfig();
        const encoded = storagePath
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');
        const result = await native({
            url: `${url}/storage/v1/object/${bucket}/${encoded}`,
            headers: {
                Authorization: `Bearer ${token}`,
                apikey: anonKey,
                'Content-Type': contentType,
                'x-upsert': 'true',
            },
            fileUri: file.uri,
        });

        if (result.status >= 300) {
            throw new Error(uploadErrorMessage(result.body, result.status));
        }

        return;
    }

    const body = file.blob
        ?? (file.uri ? await readFileUri(file.uri) : null);

    if (!body || bodySize(body) === 0) {
        throw new Error(
            'No se pudo leer el archivo. Vuelve a seleccionarlo.',
        );
    }

    const stored = await supabase.storage.from(bucket).upload(storagePath, body, {
        contentType,
        upsert: true,
    });

    if (stored.error) {
        throw new Error(stored.error.message);
    }
}

function bodySize(body: Blob | ArrayBuffer): number {
    return body instanceof ArrayBuffer ? body.byteLength : body.size;
}

async function readFileUri(uri: string): Promise<ArrayBuffer> {
    const response = await fetch(uri);

    if (!response.ok) {
        throw new Error('No se pudo leer el archivo.');
    }

    return response.arrayBuffer();
}

async function fileSize(file: UploadFile): Promise<number> {
    const nativeSize = getNativeFileSize();

    if (file.uri && nativeSize) {
        return nativeSize(file.uri);
    }

    if (file.blob) return file.blob.size;
    return 0;
}

async function prepareFile(
    supabase: SupabaseClient,
    userId: string,
    file: UploadFile,
    folderId: string | null,
    bucket: string,
): Promise<PreparedUpload> {
    const prepared = unwrap(await supabase.rpc('prepare_storage_upload', {
        p_user_id: userId,
        p_original_name: file.name,
        p_mime_type: file.type,
        p_size_bytes: await fileSize(file),
        p_folder_id: folderId,
        p_bucket_id: bucket,
    })) as PreparedUpload | PreparedUpload[];

    return Array.isArray(prepared) ? prepared[0] : prepared;
}

async function failFile(
    supabase: SupabaseClient,
    fileId: string,
): Promise<void> {
    await supabase
        .from('files')
        .update({ upload_status: 'failed' })
        .eq('id', fileId);
}

function jsonObject(value: string | undefined): Json {
    if (!value) return {};

    try {
        return asJson(JSON.parse(value));
    } catch {
        return {};
    }
}

function jsonArray(value: string | undefined): Json[] {
    if (!value) return [];

    try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? parsed.map((item) => asJson(item)) : [];
    } catch {
        return [];
    }
}

function layerSortOrder(layer: Json, index: number): number {
    const sortOrder = Number(layer.sort_order);
    return Number.isFinite(sortOrder) ? sortOrder : index;
}

function mapMessage(row: Json): Json {
    const attachments = asRows<Json>(row.attachments);

    return {
        ...row,
        sender_identity_id: row.sender_id ?? null,
        sender_user_id: row.sender_id ?? null,
        message_type: row.kind || 'text',
        body: row.body ?? '',
        attachment_file_id: attachments[0]?.file_id ?? null,
        sequence_number: Number(row.seq || 0),
        attachments,
        reactions: asRows(row.reactions),
    };
}

async function storeUploadedFile(
    supabase: SupabaseClient,
    userId: string,
    file: UploadFile,
    bucket: string,
): Promise<Json> {
    const prepared = await prepareFile(
        supabase,
        userId,
        file,
        null,
        bucket,
    );

    try {
        await putObject(
            supabase,
            prepared.bucket_id,
            prepared.storage_path,
            file,
            file.type,
        );
        unwrap(await supabase.rpc('complete_storage_upload', {
            p_user_id: userId,
            p_upload_id: prepared.upload_id,
        }));
        unwrap(await supabase
            .from('files')
            .update({ tags: ['system:status'] })
            .eq('id', prepared.file_id));

        return unwrap(await supabase
            .from('files')
            .select('*')
            .eq('id', prepared.file_id)
            .single()) as Json;
    } catch (error) {
        await failFile(supabase, prepared.file_id);
        throw error;
    }
}

function storedMediaRecord(
    file: Json,
    durationSeconds: number | null,
): Json {
    return {
        file_id: file.id,
        bucket_id: file.bucket,
        storage_path: file.path,
        original_name: file.name,
        name: file.name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        duration_seconds: durationSeconds,
    };
}

async function createUploadedStatus(
    supabase: SupabaseClient,
    userId: string,
    namedFiles: NamedUpload[],
    fields: Record<string, string>,
): Promise<unknown> {
    const primary = namedFiles.find((item) => item.key === 'file');
    const layerFiles = namedFiles.filter((item) => (
        item.key.startsWith('image_layer_file_')
    ));
    const metadata = jsonArray(fields.image_layers_metadata);
    const durationSeconds = Number(fields.duration_seconds);
    const primaryFile = primary
        ? await storeUploadedFile(
            supabase,
            userId,
            primary.file,
            'beeapp-statuses',
        )
        : null;
    const uploadedLayers = await Promise.all(layerFiles.map(async (item) => ({
        key: item.key,
        file: await storeUploadedFile(
            supabase,
            userId,
            item.file,
            'beeapp-statuses',
        ),
    })));
    const layerSources = metadata.length > 0
        ? metadata
        : uploadedLayers.map((item, index) => ({
            id: String(item.file.id),
            x: 50,
            y: 30 + (index * 12),
            scale: 1,
            rotation: 0,
            size: 96,
            sort_order: index,
        }));
    const layers = layerSources.flatMap((layer, index) => {
        const sortOrder = layerSortOrder(layer, index);
        const uploaded = uploadedLayers.find((item) => (
            item.key === `image_layer_file_${sortOrder}`
        )) || uploadedLayers[index];

        if (!uploaded) return [];

        return [{
            id: String(layer.id || uploaded.file.id),
            x: Number(layer.x ?? 50),
            y: Number(layer.y ?? 50),
            scale: Number(layer.scale ?? 1),
            rotation: Number(layer.rotation ?? 0),
            size: Number(layer.size ?? 96),
            sort_order: sortOrder,
            file_id: uploaded.file.id,
            bucket_id: uploaded.file.bucket,
            storage_path: uploaded.file.path,
            original_name: uploaded.file.name,
            mime_type: uploaded.file.mime_type,
            size_bytes: uploaded.file.size_bytes,
        }];
    });
    const created = unwrap(await supabase
        .from('statuses')
        .insert({
            author_id: userId,
            body: fields.text_content || fields.caption || '',
            background: statusBackgroundRecord({
                textBackgroundId: fields.text_background_id,
                editorMetadata: jsonObject(fields.editor_metadata),
                commercialOfferLink: jsonObject(fields.commercial_offer_link),
            }),
            media: primaryFile
                ? storedMediaRecord(
                    primaryFile,
                    Number.isFinite(durationSeconds) && durationSeconds > 0
                        ? durationSeconds
                        : null,
                )
                : null,
            layers,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('*')
        .single()) as Json;
    const profile = unwrap(await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_file_id')
        .eq('id', userId)
        .maybeSingle()) as Json | null;

    return {
        status: await mapStatusRowToStory(
            supabase,
            created,
            profile || undefined,
            userId,
            await profileAvatarUrl(supabase, profile),
        ),
    };
}

export async function dispatchUpload(
    endpoint: string,
    formData: FormData,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const path = pathOf(endpoint);
    const { files, namedFiles, fields } = readForm(formData);
    const folderId = fields.folder_id || null;
    const bucket = path.includes('commercial')
        ? 'beeapp-commercial-images'
        : path.includes('status')
            ? 'beeapp-statuses'
            : 'beeapp-files';
    const systemTag = path.includes('/chat/')
        ? 'system:chat'
        : path.includes('status')
            ? 'system:status'
            : path.includes('public-images')
                ? 'system:commercial'
                : null;
    const uploaded: Json[] = [];
    const failed: Json[] = [];

    if (path === '/statuses/' || path.startsWith('/statuses/')) {
        return createUploadedStatus(
            supabase,
            userId,
            namedFiles,
            fields,
        );
    }

    for (const file of files) {
        let prepared: PreparedUpload | null = null;

        try {
            prepared = await prepareFile(
                supabase,
                userId,
                file,
                folderId,
                bucket,
            );
            await putObject(
                supabase,
                prepared.bucket_id,
                prepared.storage_path,
                file,
                file.type,
            );
            unwrap(await supabase.rpc('complete_storage_upload', {
                p_user_id: userId,
                p_upload_id: prepared.upload_id,
            }));

            if (systemTag) {
                unwrap(await supabase
                    .from('files')
                    .update({ tags: [systemTag] })
                    .eq('id', prepared.file_id));
            }

            const saved = unwrap(await supabase
                .from('files')
                .select('*')
                .eq('id', prepared.file_id)
                .single()) as Json;
            uploaded.push(saved);
        } catch (error) {
            if (prepared?.file_id) {
                await failFile(supabase, prepared.file_id);
            }

            const message = error instanceof Error
                ? error.message
                : 'No se pudo subir el archivo.';
            failed.push({
                name: file.name,
                detail: message,
                error: message,
                code: message.toLowerCase().includes('quota')
                    ? 'quota_exceeded'
                    : 'upload_failed',
            });
        }
    }

    const noteUpload = path.match(
        /^\/notes\/([0-9a-f-]{36})\/attachments\/upload\/$/i,
    );

    if (noteUpload) {
        const note = unwrap(await supabase
            .from('notes')
            .select('attachments')
            .eq('id', noteUpload[1])
            .eq('owner_id', userId)
            .single()) as Json;
        const current = asRows<Json>(note.attachments);
        const attachments = uploaded.map((file, index) => ({
            id: createId(),
            note_id: noteUpload[1],
            file_id: file.id,
            attachment_type: String(file.mime_type || '').startsWith('image/')
                ? 'image'
                : 'attachment',
            display_order: current.length + index,
            created_at: new Date().toISOString(),
            file: mapStorageFile(file),
        }));
        unwrap(await supabase
            .from('notes')
            .update({ attachments: [...current, ...attachments] })
            .eq('id', noteUpload[1])
            .eq('owner_id', userId));

        return {
            attachments,
            failed_files: failed,
            success_count: attachments.length,
            failure_count: failed.length,
        };
    }

    const chatUpload = path.match(
        /^\/chat\/conversations\/([0-9a-f-]{36})\/attachments\/$/i,
    );

    if (chatUpload) {
        const file = uploaded[0];
        if (!file) {
            throw new GatewayError(
                String(failed[0]?.detail || 'No se pudo subir el adjunto.'),
                400,
            );
        }

        const message = mapMessage(unwrap(await supabase
            .from('messages')
            .insert({
                conversation_id: chatUpload[1],
                sender_id: userId,
                body: fields.body || '',
                kind: fields.message_type || 'file',
                attachments: [{
                    file_id: file.id,
                    name: file.name,
                    mime_type: file.mime_type,
                    size_bytes: file.size_bytes,
                }],
            })
            .select('*')
            .single()) as Json);

        return {
            message,
            file: mapStorageFile(file),
        };
    }

    return {
        files: uploaded.map(mapStorageFile),
        failed_files: failed,
        success_count: uploaded.length,
        failure_count: failed.length,
    };
}
