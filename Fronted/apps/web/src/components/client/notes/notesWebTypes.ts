import type {
    Note,
    NoteBlock,
    NoteContent,
    } from '@beeapp/shared-types';

export type NotesViewId =
    | 'all'
    | 'favorites'
    | 'pinned'
    | 'archived'
    | 'trash'
    | 'shared'
    | `folder:${string}`
    | `tag:${string}`;

export interface NotesView {
    id: NotesViewId;
    label: string;
    kind: 'system' | 'folder' | 'tag';
    entityId?: string;
}

export const EMPTY_NOTE_CONTENT: NoteContent = {
    version: 1,
    blocks: [
        {
        id: 'block-initial',
        type: 'text',
        text: '',
        },
    ],
};

export const NOTE_COLORS = [
    '#7C3AED',
    '#2563EB',
    '#0891B2',
    '#059669',
    '#CA8A04',
    '#EA580C',
    '#DC2626',
    '#DB2777',
];

export function createBlockId(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyTextBlock(): NoteBlock {
    return {
        id: createBlockId(),
        type: 'text',
        text: '',
    };
}

export function normalizeNoteContent(
    content?: NoteContent | null,
    ): NoteContent {
    if (!content || !Array.isArray(content.blocks)) {
        return {
        version: 1,
        blocks: [createEmptyTextBlock()],
        };
    }

    return {
        version: content.version || 1,
        blocks:
        content.blocks.length > 0
            ? content.blocks
            : [createEmptyTextBlock()],
    };
}

export function getNotePreview(note: Note): string {
    const content = note.content ?? note.template_snapshot;

    if (!content?.blocks?.length) {
        return 'Sin contenido';
    }

    const parts = content.blocks.flatMap((block) => {
        switch (block.type) {
        case 'text':
        case 'textarea':
        case 'heading':
            return [block.text];

        case 'field':
            return [block.label, block.value];

        case 'checklist':
            return block.items.map((item) => item.text);

        case 'bulleted_list':
        case 'numbered_list':
            return block.items;

        case 'date':
            return [block.label || '', block.value || ''];

        case 'date_list':
            return block.items.flatMap((item) => [
            item.label,
            item.value || '',
            ]);

        case 'number_list':
            return block.items.flatMap((item) => [
            item.label,
            item.value === null ? '' : String(item.value),
            ]);

        case 'image':
        case 'file':
            return [block.caption || 'Archivo adjunto'];

        case 'file_list':
            return block.attachments.map(
            (attachment) => attachment.caption || 'Archivo adjunto',
            );

        case 'divider':
        default:
            return [];
        }
    });

    const preview = parts.join(' ').replace(/\s+/g, ' ').trim();

    return preview || 'Sin contenido';
}

export function getNoteTimestamp(note: Note): string {
    const date = new Date(note.updated_at);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        });
    }

    return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
    });
}

export function getNoteColor(note: Note): string {
    return note.color || NOTE_COLORS[0];
}

function cloneBlock(block: NoteBlock): NoteBlock {
    switch (block.type) {
        case 'text':
        return {
            id: createBlockId(),
            type: 'text',
            text: block.text,
        };

        case 'textarea':
        return {
            id: createBlockId(),
            type: 'textarea',
            text: block.text,
        };

        case 'heading':
        return {
            id: createBlockId(),
            type: 'heading',
            text: block.text,
            level: block.level,
        };

        case 'field':
        return {
            id: createBlockId(),
            type: 'field',
            label: block.label,
            value: block.value,
        };

        case 'checklist':
        return {
            id: createBlockId(),
            type: 'checklist',
            items: block.items.map((item) => ({
            id: createBlockId(),
            text: item.text,
            checked: item.checked,
            })),
        };

        case 'bulleted_list':
        return {
            id: createBlockId(),
            type: 'bulleted_list',
            items: [...block.items],
        };

        case 'numbered_list':
        return {
            id: createBlockId(),
            type: 'numbered_list',
            items: [...block.items],
        };

        case 'date':
        return {
            id: createBlockId(),
            type: 'date',
            label: block.label,
            value: block.value,
        };

        case 'date_list':
        return {
            id: createBlockId(),
            type: 'date_list',
            items: block.items.map((item) => ({
            id: createBlockId(),
            label: item.label,
            value: item.value,
            })),
        };

        case 'number_list':
        return {
            id: createBlockId(),
            type: 'number_list',
            items: block.items.map((item) => ({
            id: createBlockId(),
            label: item.label,
            value: item.value,
            })),
        };

        case 'image':
        return {
            id: createBlockId(),
            type: 'image',
            attachment_id: block.attachment_id,
            file_id: block.file_id,
            caption: block.caption,
        };

        case 'file':
        return {
            id: createBlockId(),
            type: 'file',
            attachment_id: block.attachment_id,
            file_id: block.file_id,
            caption: block.caption,
        };

        case 'file_list':
        return {
            id: createBlockId(),
            type: 'file_list',
            attachments: block.attachments.map((attachment) => ({
            attachment_id: attachment.attachment_id,
            file_id: attachment.file_id,
            caption: attachment.caption,
            })),
        };

        case 'divider':
        return {
            id: createBlockId(),
            type: 'divider',
        };
    }
}

export function cloneTemplateContent(content: NoteContent): NoteContent {
    return {
        version: content.version || 1,
        blocks: content.blocks.map(cloneBlock),
    };
}