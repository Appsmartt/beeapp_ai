import type {
    NoteBlock,
    NoteChecklistBlock,
    NoteChecklistItem,
    NoteContent,
    NoteDateBlock,
    NoteDateListBlock,
    NoteDateListItem,
    NoteFieldBlock,
    NoteHeadingBlock,
    NoteNumberListBlock,
    NoteNumberListItem,
    NoteTextBlock,
    } from '@beeapp/shared-types';

import {
    createEmptyNoteContent,
    createLocalId,
    ensureNoteContent,
    } from '../../services/notesService';


export type CreatableNoteBlockType =
    | 'text'
    | 'heading'
    | 'textarea'
    | 'checklist'
    | 'bulleted_list'
    | 'numbered_list'
    | 'field'
    | 'date'
    | 'date_list'
    | 'number_list'
    | 'divider';


export interface BlockTypeOption {
    type: CreatableNoteBlockType;
    label: string;
    description: string;
}


export const NOTE_BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
    {
        type: 'text',
        label: 'Texto',
        description: 'Párrafo corto',
    },
    {
        type: 'heading',
        label: 'Encabezado',
        description: 'Título o sección',
    },
    {
        type: 'textarea',
        label: 'Texto largo',
        description: 'Contenido extenso',
    },
    {
        type: 'checklist',
        label: 'Lista de tareas',
        description: 'Elementos para marcar',
    },
    {
        type: 'bulleted_list',
        label: 'Viñetas',
        description: 'Lista no ordenada',
    },
    {
        type: 'numbered_list',
        label: 'Lista numerada',
        description: 'Lista ordenada',
    },
    {
        type: 'field',
        label: 'Campo',
        description: 'Etiqueta y valor',
    },
    {
        type: 'date',
        label: 'Fecha',
        description: 'Fecha relevante',
    },
    {
        type: 'date_list',
        label: 'Lista de fechas',
        description: 'Varias fechas',
    },
    {
        type: 'number_list',
        label: 'Lista numérica',
        description: 'Conceptos y valores',
    },
    {
        type: 'divider',
        label: 'Separador',
        description: 'División visual',
    },
];


export function createNoteBlock(
    type: CreatableNoteBlockType,
    ): NoteBlock {
    switch (type) {
        case 'text':
        return {
            id: createLocalId('text'),
            type: 'text',
            text: '',
        };

        case 'heading':
        return {
            id: createLocalId('heading'),
            type: 'heading',
            text: '',
            level: 2,
        };

        case 'textarea':
        return {
            id: createLocalId('textarea'),
            type: 'textarea',
            text: '',
        };

        case 'checklist':
        return {
            id: createLocalId('checklist'),
            type: 'checklist',
            items: [
            createChecklistItem(),
            ],
        };

        case 'bulleted_list':
        return {
            id: createLocalId('bullets'),
            type: 'bulleted_list',
            items: [''],
        };

        case 'numbered_list':
        return {
            id: createLocalId('numbers'),
            type: 'numbered_list',
            items: [''],
        };

        case 'field':
        return {
            id: createLocalId('field'),
            type: 'field',
            label: '',
            value: '',
        };

        case 'date':
        return {
            id: createLocalId('date'),
            type: 'date',
            label: '',
            value: null,
        };

        case 'date_list':
        return {
            id: createLocalId('date-list'),
            type: 'date_list',
            items: [
            createDateListItem(),
            ],
        };

        case 'number_list':
        return {
            id: createLocalId('number-list'),
            type: 'number_list',
            items: [
            createNumberListItem(),
            ],
        };

        case 'divider':
        return {
            id: createLocalId('divider'),
            type: 'divider',
        };

        default:
        return {
            id: createLocalId('textarea'),
            type: 'textarea',
            text: '',
        };
    }
}


export function createChecklistItem(): NoteChecklistItem {
    return {
        id: createLocalId('check'),
        text: '',
        checked: false,
    };
}


export function createDateListItem(): NoteDateListItem {
    return {
        id: createLocalId('date-item'),
        label: '',
        value: null,
    };
}


export function createNumberListItem(): NoteNumberListItem {
    return {
        id: createLocalId('number-item'),
        label: '',
        value: null,
    };
}


export function normalizeEditableContent(
    content: NoteContent | null | undefined,
    ): NoteContent {
    const normalized = ensureNoteContent(content);

    if (normalized.blocks.length > 0) {
        return normalized;
    }

    return createEmptyNoteContent();
}


export function updateBlockText(
    block: NoteTextBlock | NoteHeadingBlock,
    text: string,
    ): NoteTextBlock | NoteHeadingBlock {
    return {
        ...block,
        text,
    };
}


export function updateFieldBlock(
    block: NoteFieldBlock,
    field: 'label' | 'value',
    value: string,
    ): NoteFieldBlock {
    return {
        ...block,
        [field]: value,
    };
}


export function updateDateBlock(
    block: NoteDateBlock,
    field: 'label' | 'value',
    value: string,
    ): NoteDateBlock {
    return {
        ...block,
        [field]: field === 'value'
        ? value || null
        : value,
    };
}


export function updateChecklistBlockItem(
    block: NoteChecklistBlock,
    itemId: string,
    patch: Partial<NoteChecklistItem>,
    ): NoteChecklistBlock {
    return {
        ...block,
        items: block.items.map((item) =>
        item.id === itemId
            ? {
            ...item,
            ...patch,
            }
            : item,
        ),
    };
}


export function updateDateListBlockItem(
    block: NoteDateListBlock,
    itemId: string,
    patch: Partial<NoteDateListItem>,
    ): NoteDateListBlock {
    return {
        ...block,
        items: block.items.map((item) =>
        item.id === itemId
            ? {
            ...item,
            ...patch,
            }
            : item,
        ),
    };
}


export function updateNumberListBlockItem(
    block: NoteNumberListBlock,
    itemId: string,
    patch: Partial<NoteNumberListItem>,
    ): NoteNumberListBlock {
    return {
        ...block,
        items: block.items.map((item) =>
        item.id === itemId
            ? {
            ...item,
            ...patch,
            }
            : item,
        ),
    };
}


export function updateStringListBlockItem(
    block: Extract<
        NoteBlock,
        {
        type:
            | 'bulleted_list'
            | 'numbered_list';
        }
    >,
    index: number,
    value: string,
    ): Extract<
    NoteBlock,
    {
        type:
        | 'bulleted_list'
        | 'numbered_list';
    }
    > {
    return {
        ...block,
        items: block.items.map((item, itemIndex) =>
        itemIndex === index
            ? value
            : item,
        ),
    };
}


export function addStringListItem(
    block: Extract<
        NoteBlock,
        {
        type:
            | 'bulleted_list'
            | 'numbered_list';
        }
    >,
    ): Extract<
    NoteBlock,
    {
        type:
        | 'bulleted_list'
        | 'numbered_list';
    }
    > {
    return {
        ...block,
        items: [
        ...block.items,
        '',
        ],
    };
}


export function removeStringListItem(
    block: Extract<
        NoteBlock,
        {
        type:
            | 'bulleted_list'
            | 'numbered_list';
        }
    >,
    index: number,
    ): Extract<
    NoteBlock,
    {
        type:
        | 'bulleted_list'
        | 'numbered_list';
    }
    > {
    return {
        ...block,
        items: block.items.filter(
        (_, itemIndex) =>
            itemIndex !== index,
        ),
    };
}


export function moveBlock(
    blocks: NoteBlock[],
    fromIndex: number,
    toIndex: number,
    ): NoteBlock[] {
    if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= blocks.length
        || toIndex >= blocks.length
        || fromIndex === toIndex
    ) {
        return blocks;
    }

    const nextBlocks = [...blocks];
    const [movedBlock] = nextBlocks.splice(
        fromIndex,
        1,
    );

    nextBlocks.splice(
        toIndex,
        0,
        movedBlock,
    );

    return nextBlocks;
}


export function sanitizeNoteContent(
    content: NoteContent,
    ): NoteContent {
    const normalized = normalizeEditableContent(content);

    return {
        version: 1,
        blocks: normalized.blocks.map((block) => {
        switch (block.type) {
            case 'text':
            case 'textarea':
            case 'heading':
            return {
                ...block,
                text: block.text || '',
            };

            case 'field':
            return {
                ...block,
                label: block.label || '',
                value: block.value || '',
            };

            case 'checklist':
            return {
                ...block,
                items: block.items.map((item) => ({
                id: item.id || createLocalId('check'),
                text: item.text || '',
                checked: Boolean(item.checked),
                })),
            };

            case 'bulleted_list':
            case 'numbered_list':
            return {
                ...block,
                items: block.items.map(
                (item) => item || '',
                ),
            };

            case 'date':
            return {
                ...block,
                label: block.label || '',
                value: block.value || null,
            };

            case 'date_list':
            return {
                ...block,
                items: block.items.map((item) => ({
                id: item.id || createLocalId('date-item'),
                label: item.label || '',
                value: item.value || null,
                })),
            };

            case 'number_list':
            return {
                ...block,
                items: block.items.map((item) => ({
                id: item.id || createLocalId('number-item'),
                label: item.label || '',
                value: Number.isFinite(item.value)
                    ? item.value
                    : null,
                })),
            };

            default:
            return block;
        }
        }),
    };
}