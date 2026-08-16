import type { Note, NoteBlock, NoteContent } from '@beeapp/shared-types';

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
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    return `block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyTextBlock(): NoteBlock {
    return {
        id: createBlockId(),
        type: 'text',
        text: '',
    };
}

export function normalizeNoteContent(content?: NoteContent | null): NoteContent {
    if (!content || !Array.isArray(content.blocks)) {
        return {
        version: 1,
        blocks: [createEmptyTextBlock()],
        };
    }

    return {
        version: content.version || 1,
        blocks:
        content.blocks.length > 0 ? content.blocks : [createEmptyTextBlock()],
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
            return [block.label ?? '', block.value ?? ''];
        case 'date_list':
            return block.items.flatMap((item) => [item.label, item.value ?? '']);
        case 'number_list':
            return block.items.flatMap((item) => [
            item.label,
            item.value === null ? '' : String(item.value),
            ]);
        default:
            return [];
        }
    });

    const preview = parts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    return preview || 'Sin contenido';
}

export function getNoteTimestamp(note: Note): string {
    const date = new Date(note.updated_at);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
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

export function cloneTemplateContent(content: NoteContent): NoteContent {
    return {
        version: content.version || 1,
        blocks: content.blocks.map((block) => ({
        ...block,
        id: createBlockId(),
        ...(block.type === 'checklist'
            ? {
                items: block.items.map((item) => ({
                ...item,
                id: createBlockId(),
                })),
            }
            : {}),
        ...(block.type === 'date_list'
            ? {
                items: block.items.map((item) => ({
                ...item,
                id: createBlockId(),
                })),
            }
            : {}),
        ...(block.type === 'number_list'
            ? {
                items: block.items.map((item) => ({
                ...item,
                id: createBlockId(),
                })),
            }
            : {}),
        })),
    };
}