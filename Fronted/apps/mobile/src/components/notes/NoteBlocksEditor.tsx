import {
    useMemo,
    useState,
    } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    } from 'react-native';
import {
    Check,
    ChevronDown,
    GripVertical,
    Paperclip,
    Plus,
    Trash2,
    X,
    } from 'lucide-react-native';
import {
    colors,
    radii,
    spacing,
    } from '@beeapp/design-system';
import type {
    NoteBlock,
    NoteContent,
    } from '@beeapp/shared-types';

import {
    createChecklistItem,
    createDateListItem,
    createNoteBlock,
    createNumberListItem,
    NOTE_BLOCK_TYPE_OPTIONS,
    normalizeEditableContent,
    updateBlockText,
    updateChecklistBlockItem,
    updateDateBlock,
    updateDateListBlockItem,
    updateFieldBlock,
    updateNumberListBlockItem,
    updateStringListBlockItem,
    } from './noteBlocks';


interface NoteBlocksEditorProps {
    value: NoteContent;
    onChange: (content: NoteContent) => void;
}


export default function NoteBlocksEditor({
    value,
    onChange,
    }: NoteBlocksEditorProps) {
    const [pickerVisible, setPickerVisible] =
        useState(false);

    const content = useMemo(
        () => normalizeEditableContent(value),
        [value],
    );


    const updateBlock = (
        blockId: string,
        nextBlock: NoteBlock,
    ) => {
        onChange({
        ...content,
        blocks: content.blocks.map((block) =>
            block.id === blockId
            ? nextBlock
            : block,
        ),
        });
    };


    const removeBlock = (
        blockId: string,
    ) => {
        const nextBlocks = content.blocks.filter(
        (block) => block.id !== blockId,
        );

        onChange({
        ...content,
        blocks: nextBlocks.length > 0
            ? nextBlocks
            : [
            createNoteBlock('textarea'),
            ],
        });
    };


    const addBlock = (
        type: Parameters<
        typeof createNoteBlock
        >[0],
    ) => {
        onChange({
        ...content,
        blocks: [
            ...content.blocks,
            createNoteBlock(type),
        ],
        });

        setPickerVisible(false);
    };


    const moveBlockBy = (
        blockIndex: number,
        offset: -1 | 1,
    ) => {
        const targetIndex = blockIndex + offset;

        if (
        targetIndex < 0
        || targetIndex >= content.blocks.length
        ) {
        return;
        }

        const nextBlocks = [...content.blocks];
        const [movedBlock] = nextBlocks.splice(
        blockIndex,
        1,
        );

        nextBlocks.splice(
        targetIndex,
        0,
        movedBlock,
        );

        onChange({
        ...content,
        blocks: nextBlocks,
        });
    };


    return (
        <View style={styles.container}>
        {content.blocks.map((block, index) => (
            <EditableBlock
            key={block.id}
            block={block}
            index={index}
            totalBlocks={content.blocks.length}
            onUpdate={(nextBlock) =>
                updateBlock(block.id, nextBlock)
            }
            onRemove={() => removeBlock(block.id)}
            onMoveUp={() => moveBlockBy(index, -1)}
            onMoveDown={() => moveBlockBy(index, 1)}
            />
        ))}

        <TouchableOpacity
            style={styles.addBlockButton}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
        >
            <Plus
            size={18}
            color={colors.brand.primary}
            />

            <Text style={styles.addBlockText}>
            Agregar bloque
            </Text>
        </TouchableOpacity>

        <View style={styles.attachmentsHint}>
            <Paperclip
            size={14}
            color={colors.neutral.gray600}
            />

            <Text style={styles.attachmentsHintText}>
            Los archivos e imágenes se agregan desde la
            sección Adjuntos al final de la nota.
            </Text>
        </View>

        <BlockTypePicker
            visible={pickerVisible}
            onClose={() => setPickerVisible(false)}
            onSelect={addBlock}
        />
        </View>
    );
}


interface EditableBlockProps {
    block: NoteBlock;
    index: number;
    totalBlocks: number;
    onUpdate: (block: NoteBlock) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}


function EditableBlock({
    block,
    index,
    totalBlocks,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
    }: EditableBlockProps) {
    return (
        <View style={styles.blockCard}>
        <View style={styles.blockToolbar}>
            <View style={styles.blockTypeChip}>
            <GripVertical
                size={15}
                color={colors.neutral.gray500}
            />

            <Text style={styles.blockTypeText}>
                {getBlockLabel(block.type)}
            </Text>
            </View>

            <View style={styles.blockActions}>
            <TouchableOpacity
                style={styles.smallAction}
                onPress={onMoveUp}
                disabled={index === 0}
                activeOpacity={0.7}
            >
                <Text
                style={[
                    styles.moveArrow,
                    index === 0
                    && styles.disabledAction,
                ]}
                >
                ↑
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.smallAction}
                onPress={onMoveDown}
                disabled={index === totalBlocks - 1}
                activeOpacity={0.7}
            >
                <Text
                style={[
                    styles.moveArrow,
                    index === totalBlocks - 1
                    && styles.disabledAction,
                ]}
                >
                ↓
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.deleteAction}
                onPress={onRemove}
                activeOpacity={0.7}
            >
                <Trash2
                size={15}
                color={colors.semantic.error}
                />
            </TouchableOpacity>
            </View>
        </View>

        <BlockInput
            block={block}
            onUpdate={onUpdate}
        />
        </View>
    );
}


function BlockInput({
    block,
    onUpdate,
    }: {
    block: NoteBlock;
    onUpdate: (block: NoteBlock) => void;
    }) {
    switch (block.type) {
        case 'text':
        return (
            <TextInput
            style={styles.textInput}
            placeholder="Escribe un párrafo..."
            placeholderTextColor={
                colors.neutral.gray500
            }
            value={block.text}
            onChangeText={(text) =>
                onUpdate(
                updateBlockText(block, text),
                )
            }
            multiline
            />
        );

        case 'textarea':
        return (
            <TextInput
            style={[
                styles.textInput,
                styles.textAreaInput,
            ]}
            placeholder="Escribe el contenido de la nota..."
            placeholderTextColor={
                colors.neutral.gray500
            }
            value={block.text}
            onChangeText={(text) =>
                onUpdate(
                updateBlockText(block, text),
                )
            }
            multiline
            textAlignVertical="top"
            />
        );

        case 'heading':
        return (
            <View style={styles.headingEditor}>
            <TextInput
                style={styles.headingInput}
                placeholder="Título de sección"
                placeholderTextColor={
                colors.neutral.gray500
                }
                value={block.text}
                onChangeText={(text) =>
                onUpdate(
                    updateBlockText(block, text),
                )
                }
            />

            <TouchableOpacity
                style={styles.levelButton}
                onPress={() =>
                onUpdate({
                    ...block,
                    level: block.level === 1
                    ? 2
                    : 1,
                })
                }
                activeOpacity={0.7}
            >
                <Text style={styles.levelButtonText}>
                H{block.level === 1 ? '1' : '2'}
                </Text>
            </TouchableOpacity>
            </View>
        );

        case 'field':
        return (
            <View style={styles.twoColumns}>
            <TextInput
                style={[
                styles.textInput,
                styles.compactInput,
                ]}
                placeholder="Campo"
                placeholderTextColor={
                colors.neutral.gray500
                }
                value={block.label}
                onChangeText={(label) =>
                onUpdate(
                    updateFieldBlock(
                    block,
                    'label',
                    label,
                    ),
                )
                }
            />

            <TextInput
                style={[
                styles.textInput,
                styles.compactInput,
                ]}
                placeholder="Valor"
                placeholderTextColor={
                colors.neutral.gray500
                }
                value={block.value}
                onChangeText={(value) =>
                onUpdate(
                    updateFieldBlock(
                    block,
                    'value',
                    value,
                    ),
                )
                }
            />
            </View>
        );

        case 'checklist':
        return (
            <View style={styles.itemsContainer}>
            {block.items.map((item) => (
                <View
                key={item.id}
                style={styles.checklistEditorRow}
                >
                <TouchableOpacity
                    style={[
                    styles.checkBox,
                    item.checked
                        && styles.checkBoxChecked,
                    ]}
                    onPress={() =>
                    onUpdate(
                        updateChecklistBlockItem(
                        block,
                        item.id,
                        {
                            checked: !item.checked,
                        },
                        ),
                    )
                    }
                    activeOpacity={0.7}
                >
                    {item.checked && (
                    <Check
                        size={13}
                        color={colors.neutral.white}
                    />
                    )}
                </TouchableOpacity>

                <TextInput
                    style={[
                    styles.textInput,
                    styles.itemInput,
                    item.checked
                        && styles.checkedItemInput,
                    ]}
                    placeholder="Tarea"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={item.text}
                    onChangeText={(text) =>
                    onUpdate(
                        updateChecklistBlockItem(
                        block,
                        item.id,
                        { text },
                        ),
                    )
                    }
                />

                <TouchableOpacity
                    style={styles.itemDeleteButton}
                    onPress={() =>
                    onUpdate({
                        ...block,
                        items: block.items.filter(
                        (currentItem) =>
                            currentItem.id !== item.id,
                        ),
                    })
                    }
                    activeOpacity={0.7}
                >
                    <X
                    size={16}
                    color={colors.neutral.gray500}
                    />
                </TouchableOpacity>
                </View>
            ))}

            <TouchableOpacity
                style={styles.addItemButton}
                onPress={() =>
                onUpdate({
                    ...block,
                    items: [
                    ...block.items,
                    createChecklistItem(),
                    ],
                })
                }
                activeOpacity={0.7}
            >
                <Plus
                size={15}
                color={colors.brand.primary}
                />

                <Text style={styles.addItemText}>
                Agregar tarea
                </Text>
            </TouchableOpacity>
            </View>
        );

        case 'bulleted_list':
        case 'numbered_list':
        return (
            <View style={styles.itemsContainer}>
            {block.items.map((item, itemIndex) => (
                <View
                key={`${block.id}-${itemIndex}`}
                style={styles.listEditorRow}
                >
                <Text style={styles.listMarker}>
                    {block.type === 'bulleted_list'
                    ? '•'
                    : `${itemIndex + 1}.`}
                </Text>

                <TextInput
                    style={[
                    styles.textInput,
                    styles.itemInput,
                    ]}
                    placeholder="Elemento"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={item}
                    onChangeText={(text) =>
                    onUpdate(
                        updateStringListBlockItem(
                        block,
                        itemIndex,
                        text,
                        ),
                    )
                    }
                />

                <TouchableOpacity
                    style={styles.itemDeleteButton}
                    onPress={() =>
                    onUpdate({
                        ...block,
                        items: block.items.filter(
                        (_, currentIndex) =>
                            currentIndex !== itemIndex,
                        ),
                    })
                    }
                    activeOpacity={0.7}
                >
                    <X
                    size={16}
                    color={colors.neutral.gray500}
                    />
                </TouchableOpacity>
                </View>
            ))}

            <TouchableOpacity
                style={styles.addItemButton}
                onPress={() =>
                onUpdate({
                    ...block,
                    items: [
                    ...block.items,
                    '',
                    ],
                })
                }
                activeOpacity={0.7}
            >
                <Plus
                size={15}
                color={colors.brand.primary}
                />

                <Text style={styles.addItemText}>
                Agregar elemento
                </Text>
            </TouchableOpacity>
            </View>
        );

        case 'date':
        return (
            <View style={styles.twoColumns}>
            <TextInput
                style={[
                styles.textInput,
                styles.compactInput,
                ]}
                placeholder="Etiqueta"
                placeholderTextColor={
                colors.neutral.gray500
                }
                value={block.label || ''}
                onChangeText={(label) =>
                onUpdate(
                    updateDateBlock(
                    block,
                    'label',
                    label,
                    ),
                )
                }
            />

            <TextInput
                style={[
                styles.textInput,
                styles.compactInput,
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={
                colors.neutral.gray500
                }
                value={block.value || ''}
                onChangeText={(value) =>
                onUpdate(
                    updateDateBlock(
                    block,
                    'value',
                    value,
                    ),
                )
                }
            />
            </View>
        );

        case 'date_list':
        return (
            <View style={styles.itemsContainer}>
            {block.items.map((item) => (
                <View
                key={item.id}
                style={styles.dateListRow}
                >
                <TextInput
                    style={[
                    styles.textInput,
                    styles.dateLabelInput,
                    ]}
                    placeholder="Etiqueta"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={item.label}
                    onChangeText={(label) =>
                    onUpdate(
                        updateDateListBlockItem(
                        block,
                        item.id,
                        { label },
                        ),
                    )
                    }
                />

                <TextInput
                    style={[
                    styles.textInput,
                    styles.dateValueInput,
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={item.value || ''}
                    onChangeText={(value) =>
                    onUpdate(
                        updateDateListBlockItem(
                        block,
                        item.id,
                        {
                            value: value || null,
                        },
                        ),
                    )
                    }
                />

                <TouchableOpacity
                    style={styles.itemDeleteButton}
                    onPress={() =>
                    onUpdate({
                        ...block,
                        items: block.items.filter(
                        (currentItem) =>
                            currentItem.id !== item.id,
                        ),
                    })
                    }
                    activeOpacity={0.7}
                >
                    <X
                    size={16}
                    color={colors.neutral.gray500}
                    />
                </TouchableOpacity>
                </View>
            ))}

            <TouchableOpacity
                style={styles.addItemButton}
                onPress={() =>
                onUpdate({
                    ...block,
                    items: [
                    ...block.items,
                    createDateListItem(),
                    ],
                })
                }
                activeOpacity={0.7}
            >
                <Plus
                size={15}
                color={colors.brand.primary}
                />

                <Text style={styles.addItemText}>
                Agregar fecha
                </Text>
            </TouchableOpacity>
            </View>
        );

        case 'number_list':
        return (
            <View style={styles.itemsContainer}>
            {block.items.map((item) => (
                <View
                key={item.id}
                style={styles.dateListRow}
                >
                <TextInput
                    style={[
                    styles.textInput,
                    styles.dateLabelInput,
                    ]}
                    placeholder="Concepto"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={item.label}
                    onChangeText={(label) =>
                    onUpdate(
                        updateNumberListBlockItem(
                        block,
                        item.id,
                        { label },
                        ),
                    )
                    }
                />

                <TextInput
                    style={[
                    styles.textInput,
                    styles.numberValueInput,
                    ]}
                    placeholder="0"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={
                    item.value === null
                        ? ''
                        : String(item.value)
                    }
                    onChangeText={(value) => {
                    const parsedValue =
                        Number(value.replace(',', '.'));

                    onUpdate(
                        updateNumberListBlockItem(
                        block,
                        item.id,
                        {
                            value: value.trim() === ''
                            ? null
                            : Number.isFinite(parsedValue)
                                ? parsedValue
                                : null,
                        },
                        ),
                    );
                    }}
                    keyboardType="decimal-pad"
                />

                <TouchableOpacity
                    style={styles.itemDeleteButton}
                    onPress={() =>
                    onUpdate({
                        ...block,
                        items: block.items.filter(
                        (currentItem) =>
                            currentItem.id !== item.id,
                        ),
                    })
                    }
                    activeOpacity={0.7}
                >
                    <X
                    size={16}
                    color={colors.neutral.gray500}
                    />
                </TouchableOpacity>
                </View>
            ))}

            <TouchableOpacity
                style={styles.addItemButton}
                onPress={() =>
                onUpdate({
                    ...block,
                    items: [
                    ...block.items,
                    createNumberListItem(),
                    ],
                })
                }
                activeOpacity={0.7}
            >
                <Plus
                size={15}
                color={colors.brand.primary}
                />

                <Text style={styles.addItemText}>
                Agregar valor
                </Text>
            </TouchableOpacity>
            </View>
        );

        case 'divider':
        return (
            <View style={styles.dividerPreview}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
                Separador
            </Text>
            <View style={styles.dividerLine} />
            </View>
        );

        case 'image':
        return (
            <View style={styles.attachmentPreview}>
            <Paperclip
                size={18}
                color="#2563EB"
            />

            <Text style={styles.attachmentPreviewText}>
                {block.caption || 'Imagen adjunta'}
            </Text>
            </View>
        );

        case 'file':
        return (
            <View style={styles.attachmentPreview}>
            <Paperclip
                size={18}
                color={colors.neutral.gray700}
            />

            <Text style={styles.attachmentPreviewText}>
                {block.caption || 'Archivo adjunto'}
            </Text>
            </View>
        );

        case 'file_list':
        return (
            <View style={styles.itemsContainer}>
            {block.attachments.map(
                (attachment, index) => (
                <View
                    key={
                    attachment.attachment_id
                    || attachment.file_id
                    || `${block.id}-${index}`
                    }
                    style={styles.attachmentPreview}
                >
                    <Paperclip
                    size={17}
                    color={colors.neutral.gray700}
                    />

                    <Text
                    style={styles.attachmentPreviewText}
                    >
                    {attachment.caption
                        || 'Archivo adjunto'}
                    </Text>
                </View>
                ),
            )}
            </View>
        );

        default:
        return null;
    }
}


interface BlockTypePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (
        type: Parameters<typeof createNoteBlock>[0],
    ) => void;
}


function BlockTypePicker({
    visible,
    onClose,
    onSelect,
    }: BlockTypePickerProps) {
    return (
        <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        >
        <View style={styles.modalBackdrop}>
            <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
            />

            <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                Agregar bloque
                </Text>

                <TouchableOpacity
                onPress={onClose}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
                >
                <X
                    size={19}
                    color={colors.neutral.gray600}
                />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.optionsList}
            >
                {NOTE_BLOCK_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                    key={option.type}
                    style={styles.blockOption}
                    onPress={() => onSelect(option.type)}
                    activeOpacity={0.75}
                >
                    <View style={styles.optionPlus}>
                    <Plus
                        size={17}
                        color={colors.brand.primary}
                    />
                    </View>

                    <View style={styles.optionCopy}>
                    <Text style={styles.optionLabel}>
                        {option.label}
                    </Text>

                    <Text style={styles.optionDescription}>
                        {option.description}
                    </Text>
                    </View>

                    <ChevronDown
                    size={16}
                    color={colors.neutral.gray400}
                    style={{
                        transform: [{ rotate: '-90deg' }],
                    }}
                    />
                </TouchableOpacity>
                ))}
            </ScrollView>
            </View>
        </View>
        </Modal>
    );
}


function getBlockLabel(
    type: NoteBlock['type'],
    ): string {
    return NOTE_BLOCK_TYPE_OPTIONS.find(
        (option) => option.type === type,
    )?.label || type;
}


const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    blockCard: {
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        backgroundColor: colors.neutral.white,
        padding: 12,
    },
    blockToolbar: {
        minHeight: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    blockTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    blockTypeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.neutral.gray600,
        textTransform: 'uppercase',
    },
    blockActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    smallAction: {
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moveArrow: {
        fontSize: 18,
        lineHeight: 20,
        color: colors.neutral.gray600,
    },
    disabledAction: {
        color: colors.neutral.gray300,
    },
    deleteAction: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textInput: {
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.md,
        paddingHorizontal: 10,
        paddingVertical: 9,
        fontSize: 14,
        fontWeight: '400',
        color: colors.neutral.text,
        backgroundColor: colors.neutral.gray50,
    },
    textAreaInput: {
        minHeight: 130,
    },
    compactInput: {
        flex: 1,
    },
    headingEditor: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headingInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: colors.neutral.text,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray200,
        paddingVertical: 7,
    },
    levelButton: {
        minWidth: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.md,
        paddingVertical: 8,
        paddingHorizontal: 7,
        backgroundColor: colors.brand.primary + '12',
    },
    levelButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.brand.primary,
    },
    twoColumns: {
        flexDirection: 'row',
        gap: 8,
    },
    itemsContainer: {
        gap: 8,
    },
    checklistEditorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkBox: {
        width: 21,
        height: 21,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.neutral.gray300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkBoxChecked: {
        borderColor: colors.brand.primary,
        backgroundColor: colors.brand.primary,
    },
    itemInput: {
        flex: 1,
    },
    checkedItemInput: {
        color: colors.neutral.gray500,
        textDecorationLine: 'line-through',
    },
    itemDeleteButton: {
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addItemButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    addItemText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.brand.primary,
    },
    listEditorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    listMarker: {
        width: 23,
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.gray600,
        textAlign: 'right',
    },
    dateListRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateLabelInput: {
        flex: 1,
    },
    dateValueInput: {
        width: 112,
    },
    numberValueInput: {
        width: 84,
    },
    dividerPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.neutral.gray300,
    },
    dividerText: {
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray500,
    },
    attachmentPreview: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: radii.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: colors.neutral.gray100,
    },
    attachmentPreviewText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '400',
        color: colors.neutral.gray700,
    },
    addBlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        minHeight: 46,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.brand.primary,
        backgroundColor: colors.brand.primary + '08',
    },
    addBlockText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.brand.primary,
    },
    attachmentsHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingHorizontal: 4,
    },
    attachmentsHintText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
        lineHeight: 16,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(26, 26, 46, 0.35)',
    },
    modalSheet: {
        maxHeight: '78%',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        backgroundColor: colors.neutral.white,
        paddingBottom: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    modalCloseButton: {
        padding: 4,
    },
    optionsList: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    blockOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    optionPlus: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.brand.primary + '12',
    },
    optionCopy: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    optionDescription: {
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
        marginTop: 2,
    },
});