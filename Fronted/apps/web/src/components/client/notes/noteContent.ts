import type {
    NoteBlock,
    NoteChecklistItem,
    NoteContent,
    NoteDateListItem,
    NoteNumberListItem,
    } from '@beeapp/shared-types';

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

function asArray(
    value: unknown,
    ): unknown[] {
    return Array.isArray(value)
        ? value
        : [];
}

function asFiniteNumberOrNull(
    value: unknown,
    ): number | null {
    return (
        typeof value === 'number'
        && Number.isFinite(value)
    )
        ? value
        : null;
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

function normalizeStringItems(
    value: unknown,
    ): string[] {
    return asArray(value).map((item) =>
        typeof item === 'string'
        ? item
        : '',
    );
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

function normalizeBlock(
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
            ) || undefined,
            file_id: asString(
            block.file_id,
            ) || undefined,
            caption: asString(
            block.caption,
            ) || undefined,
        };

        case 'file':
        return {
            id,
            type: 'file',
            attachment_id: asString(
            block.attachment_id,
            ) || undefined,
            file_id: asString(
            block.file_id,
            ) || undefined,
            caption: asString(
            block.caption,
            ) || undefined,
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
        blocks: rawBlocks.map(normalizeBlock),
    };
}

export function cloneNoteContent(
    content: NoteContent | null | undefined,
    ): NoteContent {
    return JSON.parse(
        JSON.stringify(ensureNoteContent(content)),
    ) as NoteContent;
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
        return block.items
            .map((item) => item.text)
            .filter(Boolean)
            .join(' ');

        case 'bulleted_list':
        case 'numbered_list':
        return block.items
            .filter(Boolean)
            .join(' ');

        case 'date':
        return [block.label, block.value]
            .filter(Boolean)
            .join(': ');

        case 'date_list':
        return block.items
            .map((item) =>
            [item.label, item.value]
                .filter(Boolean)
                .join(': '),
            )
            .filter(Boolean)
            .join(' ');

        case 'number_list':
        return block.items
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

        case 'file_list':
        return block.attachments.length === 1
            ? '1 archivo adjunto'
            : block.attachments.length > 1
            ? `${block.attachments.length} archivos adjuntos`
            : '';

        case 'divider':
        return '';

        default:
        return '';
    }
}

export function getNotePreview(
    content: NoteContent | null | undefined,
    ): string {
    return ensureNoteContent(content)
        .blocks
        .map(getBlockPreviewText)
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeNoteTitle(
    title: string | null | undefined,
    ): string {
    return title?.trim() || 'Sin título';
}