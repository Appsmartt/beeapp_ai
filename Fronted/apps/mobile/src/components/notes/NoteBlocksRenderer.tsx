import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    } from 'react-native';
import {
    Check,
    FileText,
    ImageIcon,
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
    ensureNoteContent,
    } from '../../services/notesService';


interface NoteBlocksRendererProps {
    content: NoteContent | null | undefined;
    onOpenAttachment?: (
        attachmentId: string,
        download?: boolean,
    ) => void;
}


/**
 * Renderizador de solo lectura del JSON de Notes.
 * Los bloques de adjuntos pueden abrir URL firmada
 * mediante el callback de la pantalla editora.
 */
export default function NoteBlocksRenderer({
    content,
    onOpenAttachment,
    }: NoteBlocksRendererProps) {
    const normalizedContent =
        ensureNoteContent(content);

    if (normalizedContent.blocks.length === 0) {
        return (
        <Text style={styles.emptyText}>
            Esta nota no tiene contenido.
        </Text>
        );
    }

    return (
        <View style={styles.container}>
        {normalizedContent.blocks.map((block) => (
            <BlockRenderer
            key={block.id}
            block={block}
            onOpenAttachment={onOpenAttachment}
            />
        ))}
        </View>
    );
}


function BlockRenderer({
    block,
    onOpenAttachment,
    }: {
    block: NoteBlock;
    onOpenAttachment?: (
        attachmentId: string,
        download?: boolean,
    ) => void;
    }) {
    switch (block.type) {
        case 'heading':
        return (
            <Text
            style={
                block.level === 1
                ? styles.headingOne
                : styles.headingTwo
            }
            >
            {block.text || 'Sin título'}
            </Text>
        );

        case 'text':
        case 'textarea':
        return (
            <Text style={styles.bodyText}>
            {block.text}
            </Text>
        );

        case 'field':
        return (
            <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>
                {block.label || 'Campo'}
            </Text>

            <Text style={styles.fieldValue}>
                {block.value || 'Sin valor'}
            </Text>
            </View>
        );

        case 'checklist':
        return (
            <View style={styles.listContainer}>
            {block.items.map((item) => (
                <View
                key={item.id}
                style={styles.checkRow}
                >
                <View
                    style={[
                    styles.checkBox,
                    item.checked
                        && styles.checkBoxChecked,
                    ]}
                >
                    {item.checked && (
                    <Check
                        size={13}
                        color={colors.neutral.white}
                    />
                    )}
                </View>

                <Text
                    style={[
                    styles.bodyText,
                    item.checked
                        && styles.checkedText,
                    ]}
                >
                    {item.text || 'Tarea'}
                </Text>
                </View>
            ))}
            </View>
        );

        case 'bulleted_list':
        return (
            <View style={styles.listContainer}>
            {block.items.map((item, index) => (
                <View
                key={`${block.id}-${index}`}
                style={styles.listRow}
                >
                <Text style={styles.bullet}>
                    •
                </Text>

                <Text style={styles.bodyText}>
                    {item || 'Elemento'}
                </Text>
                </View>
            ))}
            </View>
        );

        case 'numbered_list':
        return (
            <View style={styles.listContainer}>
            {block.items.map((item, index) => (
                <View
                key={`${block.id}-${index}`}
                style={styles.listRow}
                >
                <Text style={styles.number}>
                    {index + 1}.
                </Text>

                <Text style={styles.bodyText}>
                    {item || 'Elemento'}
                </Text>
                </View>
            ))}
            </View>
        );

        case 'date':
        return (
            <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>
                {block.label || 'Fecha'}
            </Text>

            <Text style={styles.fieldValue}>
                {formatDateValue(block.value)}
            </Text>
            </View>
        );

        case 'date_list':
        return (
            <View style={styles.listContainer}>
            {block.items.map((item) => (
                <View
                key={item.id}
                style={styles.fieldRow}
                >
                <Text style={styles.fieldLabel}>
                    {item.label || 'Fecha'}
                </Text>

                <Text style={styles.fieldValue}>
                    {formatDateValue(item.value)}
                </Text>
                </View>
            ))}
            </View>
        );

        case 'number_list':
        return (
            <View style={styles.listContainer}>
            {block.items.map((item) => (
                <View
                key={item.id}
                style={styles.fieldRow}
                >
                <Text style={styles.fieldLabel}>
                    {item.label || 'Concepto'}
                </Text>

                <Text style={styles.fieldValue}>
                    {item.value ?? '—'}
                </Text>
                </View>
            ))}
            </View>
        );

        case 'divider':
        return <View style={styles.divider} />;

        case 'image':
        return (
            <AttachmentBlock
            isImage
            label={block.caption || 'Imagen adjunta'}
            attachmentId={block.attachment_id}
            onOpenAttachment={onOpenAttachment}
            />
        );

        case 'file':
        return (
            <AttachmentBlock
            label={block.caption || 'Archivo adjunto'}
            attachmentId={block.attachment_id}
            onOpenAttachment={onOpenAttachment}
            />
        );

        case 'file_list':
        return (
            <View style={styles.listContainer}>
            {block.attachments.map(
                (attachment, index) => (
                <AttachmentBlock
                    key={
                    attachment.attachment_id
                    || attachment.file_id
                    || `${block.id}-${index}`
                    }
                    label={
                    attachment.caption
                    || 'Archivo adjunto'
                    }
                    attachmentId={
                    attachment.attachment_id
                    }
                    onOpenAttachment={onOpenAttachment}
                />
                ),
            )}
            </View>
        );

        default:
        return null;
    }
}


function AttachmentBlock({
    attachmentId,
    isImage = false,
    label,
    onOpenAttachment,
    }: {
    attachmentId?: string;
    isImage?: boolean;
    label: string;
    onOpenAttachment?: (
        attachmentId: string,
        download?: boolean,
    ) => void;
    }) {
    const content = (
        <>
        <View
            style={[
            styles.attachmentIcon,
            isImage && styles.imageAttachmentIcon,
            ]}
        >
            {isImage ? (
            <ImageIcon
                size={21}
                color="#2563EB"
            />
            ) : (
            <FileText
                size={21}
                color={colors.neutral.gray700}
            />
            )}
        </View>

        <Text
            style={styles.attachmentText}
            numberOfLines={2}
        >
            {label}
        </Text>
        </>
    );

    if (!attachmentId || !onOpenAttachment) {
        return (
        <View style={styles.attachmentBox}>
            {content}
        </View>
        );
    }

    return (
        <TouchableOpacity
        style={styles.attachmentBox}
        onPress={() =>
            onOpenAttachment(attachmentId, false)
        }
        activeOpacity={0.75}
        >
        {content}
        </TouchableOpacity>
    );
}


function formatDateValue(
    value: string | null,
    ): string {
    if (!value) {
        return 'Sin fecha';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        'es-CO',
        {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        },
    );
}


const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    bodyText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '400',
        color: colors.neutral.text,
        lineHeight: 22,
    },
    headingOne: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.neutral.text,
        marginTop: spacing.sm,
    },
    headingTwo: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.neutral.text,
        marginTop: 6,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: radii.md,
        backgroundColor: colors.neutral.gray50,
    },
    fieldLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral.gray700,
    },
    fieldValue: {
        flex: 1,
        textAlign: 'right',
        fontSize: 12,
        fontWeight: '400',
        color: colors.neutral.text,
    },
    listContainer: {
        gap: 8,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    bullet: {
        width: 14,
        fontSize: 16,
        lineHeight: 22,
        color: colors.neutral.gray600,
        textAlign: 'center',
    },
    number: {
        minWidth: 22,
        fontSize: 14,
        lineHeight: 22,
        color: colors.neutral.gray600,
        textAlign: 'right',
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    checkBox: {
        width: 19,
        height: 19,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: colors.neutral.gray300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkBoxChecked: {
        borderColor: colors.brand.primary,
        backgroundColor: colors.brand.primary,
    },
    checkedText: {
        color: colors.neutral.gray500,
        textDecorationLine: 'line-through',
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral.gray200,
        marginVertical: 4,
    },
    attachmentBox: {
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radii.lg,
        backgroundColor: colors.neutral.gray100,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
    },
    attachmentIcon: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: colors.neutral.gray200,
    },
    imageAttachmentIcon: {
        backgroundColor: '#2563EB14',
    },
    attachmentText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '400',
        color: colors.neutral.gray700,
    },
});