import type {
    Note,
    NoteBlock,
    NoteChecklistItem,
    NoteContent,
    NoteDateListItem,
    NoteFolder,
    NoteNumberListItem,
    NoteShare,
    NoteTag,
    NoteTemplate,
    } from '@beeapp/shared-types';

export type NotesHomeItemKind =
    | 'fixed'
    | 'folder'
    | 'tag'
    | 'template';

export type NotesFixedViewId =
    | 'all'
    | 'favorites'
    | 'pinned'
    | 'archived'
    | 'shared'
    | 'trash';

export interface NotesHomeItem {
    id: string;
    name: string;
    iconKey: string;
    color: string;
    kind: NotesHomeItemKind;
    isFixed?: boolean;
    folderId?: string;
    tagId?: string;
    templateId?: string;
}

export interface NoteListItem {
    id: string;
    title: string;
    preview: string;
    content: NoteContent;
    updatedAt: string;
    createdAt: string;
    isFavorite: boolean;
    isPinned: boolean;
    isArchived: boolean;
    colorTag: string;
    folderId: string | null;
    templateId: string | null;
    deletedAt: string | null;
    purgeAfter: string | null;
    lastOpenedAt: string | null;
    tagIds: string[];
    isShared: boolean;
    shareId?: string;
    sharedByName?: string;
    shareExpiresAt?: string | null;
}

const FIXED_NOTES_HOME_ITEMS: NotesHomeItem[] = [
    {
        id: 'all',
        name: 'Todas',
        iconKey: 'file-text',
        color: '#6025D2',
        kind: 'fixed',
        isFixed: true,
    },
    {
        id: 'favorites',
        name: 'Favoritas',
        iconKey: 'star',
        color: '#F59E0B',
        kind: 'fixed',
        isFixed: true,
    },
    {
        id: 'pinned',
        name: 'Fijadas',
        iconKey: 'pin',
        color: '#2563EB',
        kind: 'fixed',
        isFixed: true,
    },
    {
        id: 'archived',
        name: 'Archivadas',
        iconKey: 'archive',
        color: '#64748B',
        kind: 'fixed',
        isFixed: true,
    },
    {
        id: 'shared',
        name: 'Compartidas',
        iconKey: 'users',
        color: '#0F766E',
        kind: 'fixed',
        isFixed: true,
    },
    {
        id: 'trash',
        name: 'Papelera',
        iconKey: 'trash-2',
        color: '#DC2626',
        kind: 'fixed',
        isFixed: true,
    },
];

export function getFixedNotesHomeItems(): NotesHomeItem[] {
    return FIXED_NOTES_HOME_ITEMS;
}

export function createLocalId(
    prefix = 'block',
    ): string {
    const randomPart = Math.random()
        .toString(36)
        .slice(2, 10);

    return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function createEmptyNoteContent(): NoteContent {
    return {
        version: 1,
        blocks: [
        {
            id: createLocalId('textarea'),
            type: 'textarea',
            text: '',
        },
        ],
    };
}

function asRecord(
    value: unknown,
    ): Record<string, unknown> {
    if (
        value
        && typeof value === 'object'
        && !Array.isArray(value)
    ) {
        return value as Record<string, unknown>;
    }

    return {};
}

function asString(
    value: unknown,
    fallback = '',
    ): string {
    return typeof value === 'string'
        ? value
        : fallback;
}

function asNullableString(
    value: unknown,
    ): string | null {
    return typeof value === 'string'
        && value.trim().length > 0
        ? value
        : null;
}

function asFiniteNumberOrNull(
    value: unknown,
    ): number | null {
    if (
        typeof value === 'number'
        && Number.isFinite(value)
    ) {
        return value;
    }

    return null;
}

function asArray(
    value: unknown,
    ): unknown[] {
    return Array.isArray(value)
        ? value
        : [];
}

function normalizeChecklistItems(
    value: unknown,
    ): NoteChecklistItem[] {
    return asArray(value).map((rawItem) => {
        const item = asRecord(rawItem);

        return {
        id: asString(
            item.id,
            createLocalId('check'),
        ),
        text: asString(item.text),
        checked: Boolean(item.checked),
        };
    });
}

function normalizeStringItems(
    value: unknown,
    ): string[] {
    return asArray(value).map((item) =>
        typeof item === 'string'
        ? item
        : '',
    );
}

function normalizeDateListItems(
    value: unknown,
    ): NoteDateListItem[] {
    return asArray(value).map((rawItem) => {
        const item = asRecord(rawItem);

        return {
        id: asString(
            item.id,
            createLocalId('date-item'),
        ),
        label: asString(item.label),
        value: asNullableString(item.value),
        };
    });
}

function normalizeNumberListItems(
    value: unknown,
    ): NoteNumberListItem[] {
    return asArray(value).map((rawItem) => {
        const item = asRecord(rawItem);

        return {
        id: asString(
            item.id,
            createLocalId('number-item'),
        ),
        label: asString(item.label),
        value: asFiniteNumberOrNull(item.value),
        };
    });
}

function normalizeAttachments(
    value: unknown,
    ): Array<{
    attachment_id?: string;
    file_id?: string;
    caption?: string;
    }> {
    return asArray(value).map((rawAttachment) => {
        const attachment = asRecord(rawAttachment);

        return {
        attachment_id: asString(
            attachment.attachment_id,
        ) || undefined,
        file_id: asString(
            attachment.file_id,
        ) || undefined,
        caption: asString(
            attachment.caption,
        ) || undefined,
        };
    });
}

function normalizeNoteBlock(
    rawBlock: unknown,
    index: number,
    ): NoteBlock {
    const block = asRecord(rawBlock);

    const id = asString(
        block.id,
        `block-${index + 1}`,
    );

    const type = asString(
        block.type,
        'textarea',
    );

    switch (type) {
        case 'text':
        return {
            id,
            type: 'text',
            text: asString(
            block.text ?? block.value,
            ),
        };

        case 'textarea':
        return {
            id,
            type: 'textarea',
            text: asString(
            block.text ?? block.value,
            ),
        };

        case 'heading':
        return {
            id,
            type: 'heading',
            text: asString(
            block.text ?? block.value,
            ),
            level: block.level === 1 ? 1 : 2,
        };

        case 'field':
        return {
            id,
            type: 'field',
            label: asString(block.label),
            value: asString(block.value),
        };

        case 'checklist':
        return {
            id,
            type: 'checklist',
            items: normalizeChecklistItems(block.items),
        };

        case 'bulleted_list':
        return {
            id,
            type: 'bulleted_list',
            items: normalizeStringItems(block.items),
        };

        case 'numbered_list':
        return {
            id,
            type: 'numbered_list',
            items: normalizeStringItems(block.items),
        };

        case 'date':
        return {
            id,
            type: 'date',
            label: asString(block.label),
            value: asNullableString(block.value),
        };

        case 'date_list':
        return {
            id,
            type: 'date_list',
            items: normalizeDateListItems(block.items),
        };

        case 'number_list':
        return {
            id,
            type: 'number_list',
            items: normalizeNumberListItems(block.items),
        };

        case 'divider':
        return {
            id,
            type: 'divider',
        };

        case 'image':
        return {
            id,
            type: 'image',
            attachment_id: asString(
            block.attachment_id,
            ),
            file_id: asString(block.file_id),
            caption: asString(block.caption),
        };

        case 'file':
        return {
            id,
            type: 'file',
            attachment_id: asString(
            block.attachment_id,
            ),
            file_id: asString(block.file_id),
            caption: asString(block.caption),
        };

        case 'file_list':
        return {
            id,
            type: 'file_list',
            attachments: normalizeAttachments(
            block.attachments ?? block.items,
            ),
        };

        default:
        return {
            id,
            type: 'textarea',
            text: asString(
            block.text ?? block.value,
            ),
        };
    }
}

export function ensureNoteContent(
    content: NoteContent | null | undefined,
    ): NoteContent {
    const rawContent = asRecord(content);
    const rawBlocks = asArray(rawContent.blocks);

    if (rawBlocks.length === 0) {
        return createEmptyNoteContent();
    }

    return {
        version: (
        typeof rawContent.version === 'number'
        && Number.isInteger(rawContent.version)
        && rawContent.version >= 1
        )
        ? rawContent.version
        : 1,
        blocks: rawBlocks.map(normalizeNoteBlock),
    };
}

export function normalizeNoteTitle(
    title: string | null | undefined,
    ): string {
    return title?.trim() || 'Sin título';
}

export function getBlockPreviewText(
    block: NoteBlock,
    ): string {
    switch (block.type) {
        case 'text':
        case 'textarea':
        case 'heading':
        return block.text || '';

        case 'field':
        return [block.label, block.value]
            .filter(Boolean)
            .join(': ');

        case 'checklist':
        return (Array.isArray(block.items)
            ? block.items
            : [])
            .map((item) => item.text)
            .filter(Boolean)
            .join(' ');

        case 'bulleted_list':
        case 'numbered_list':
        return (Array.isArray(block.items)
            ? block.items
            : [])
            .filter(Boolean)
            .join(' ');

        case 'date':
        return [
            block.label,
            block.value,
        ]
            .filter(Boolean)
            .join(': ');

        case 'date_list':
        return (Array.isArray(block.items)
            ? block.items
            : [])
            .map((item) =>
            [item.label, item.value]
                .filter(Boolean)
                .join(': '),
            )
            .filter(Boolean)
            .join(' ');

        case 'number_list':
        return (Array.isArray(block.items)
            ? block.items
            : [])
            .map((item) =>
            [item.label, item.value]
                .filter(
                (value) =>
                    value !== null
                    && value !== undefined
                    && value !== '',
                )
                .join(': '),
            )
            .filter(Boolean)
            .join(' ');

        case 'image':
        return block.caption || 'Imagen adjunta';

        case 'file':
        return block.caption || 'Archivo adjunto';

        case 'file_list': {
        const attachments = Array.isArray(
            block.attachments,
        )
            ? block.attachments
            : [];

        return attachments.length === 1
            ? '1 archivo adjunto'
            : `${attachments.length} archivos adjuntos`;
        }

        case 'divider':
        return '';

        default:
        return '';
    }
}

export function getNotePreview(
    content: NoteContent | null | undefined,
    ): string {
    const normalizedContent = ensureNoteContent(content);

    return normalizedContent.blocks
        .map(getBlockPreviewText)
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function mapNoteToListItem(
    note: Note,
    options: {
        tagIds?: string[];
        share?: NoteShare;
    } = {},
    ): NoteListItem {
    const share = options.share;
    const sharedBy = share?.shared_by;

    return {
        id: note.id,
        title: normalizeNoteTitle(note.title),
        preview: getNotePreview(note.content),
        content: ensureNoteContent(note.content),
        updatedAt: note.updated_at,
        createdAt: note.created_at,
        isFavorite: note.is_favorite,
        isPinned: note.is_pinned,
        isArchived: note.is_archived,
        colorTag: note.color || '#6025D2',
        folderId: note.folder_id,
        templateId: note.template_id,
        deletedAt: note.deleted_at,
        purgeAfter: note.purge_after,
        lastOpenedAt: note.last_opened_at,
        tagIds: options.tagIds || [],
        isShared: Boolean(share),
        shareId: share?.id,
        sharedByName: sharedBy
        ? `${sharedBy.first_name} ${sharedBy.last_name}`.trim()
        : undefined,
        shareExpiresAt: share?.expires_at,
    };
}

export function mapFolderToHomeItem(
    folder: NoteFolder,
    ): NotesHomeItem {
    return {
        id: `folder:${folder.id}`,
        name: folder.name,
        iconKey: 'folder',
        color: '#F57C00',
        kind: 'folder',
        folderId: folder.id,
    };
}

export function mapTagToHomeItem(
    tag: NoteTag,
    ): NotesHomeItem {
    return {
        id: `tag:${tag.id}`,
        name: tag.name,
        iconKey: tag.icon || 'tag',
        color: tag.color || '#8B5CF6',
        kind: 'tag',
        tagId: tag.id,
    };
}

export function mapTemplateToHomeItem(
    template: NoteTemplate,
    ): NotesHomeItem {
    return {
        id: `template:${template.id}`,
        name: template.name,
        iconKey: template.icon || 'layout-template',
        color: template.color || '#6025D2',
        kind: 'template',
        templateId: template.id,
    };
}

export function getFixedViewNotes(
    viewId: NotesFixedViewId,
    notes: NoteListItem[],
    ): NoteListItem[] {
    switch (viewId) {
        case 'favorites':
        return notes.filter(
            (note) =>
            note.isFavorite
            && !note.deletedAt
            && !note.isShared,
        );

        case 'pinned':
        return notes.filter(
            (note) =>
            note.isPinned
            && !note.deletedAt
            && !note.isShared,
        );

        case 'archived':
        return notes.filter(
            (note) =>
            note.isArchived
            && !note.deletedAt
            && !note.isShared,
        );

        case 'trash':
        return notes.filter(
            (note) =>
            Boolean(note.deletedAt)
            && !note.isShared,
        );

        case 'shared':
        return notes.filter(
            (note) => note.isShared,
        );

        case 'all':
        default:
        return notes.filter(
            (note) =>
            !note.deletedAt
            && !note.isArchived
            && !note.isShared,
        );
    }
}

export function getHomeItemNoteCount(
    item: NotesHomeItem,
    notes: NoteListItem[],
    ): number {
    switch (item.kind) {
        case 'folder':
        return notes.filter(
            (note) =>
            note.folderId === item.folderId
            && !note.deletedAt
            && !note.isShared,
        ).length;

        case 'tag':
        return notes.filter(
            (note) =>
            note.tagIds.includes(item.tagId || '')
            && !note.deletedAt
            && !note.isShared,
        ).length;

        case 'template':
        return notes.filter(
            (note) =>
            note.templateId === item.templateId
            && !note.deletedAt
            && !note.isShared,
        ).length;

        case 'fixed':
        return getFixedViewNotes(
            item.id as NotesFixedViewId,
            notes,
        ).length;

        default:
        return 0;
    }
}

export function sortNotesByUpdatedAt(
    notes: NoteListItem[],
    ): NoteListItem[] {
    return [...notes].sort(
        (left, right) =>
        new Date(right.updatedAt).getTime()
        - new Date(left.updatedAt).getTime(),
    );
}

export function findFolderName(
    folderId: string | null,
    folders: NoteFolder[],
    ): string | null {
    if (!folderId) {
        return null;
    }

    return folders.find(
        (folder) => folder.id === folderId,
    )?.name || null;
}

export function getShareDisplayName(
    share: NoteShare,
    ): string {
    if (!share.shared_by) {
        return 'Usuario de BeeApp';
    }

    return (
        `${share.shared_by.first_name} `
        + `${share.shared_by.last_name}`
    ).trim();
}