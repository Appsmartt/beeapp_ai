import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    } from 'react-native';
import {
    Edit3,
    FolderInput,
    Trash2,
    X,
    } from 'lucide-react-native';
import {
    colors,
    radii,
    spacing,
    } from '@beeapp/design-system';

import type {
    NotesHomeItem,
    } from '../../services/notesService';


interface NoteEntityActionModalProps {
    visible: boolean;
    entity: NotesHomeItem | null;
    onClose: () => void;
    onRename: () => void;
    onMove?: () => void;
    onDelete: () => void;
}


export default function NoteEntityActionModal({
    visible,
    entity,
    onClose,
    onRename,
    onMove,
    onDelete,
    }: NoteEntityActionModalProps) {
    const isFolder = entity?.kind === 'folder';

    return (
        <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        >
        <View style={styles.backdrop}>
            <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
            />

            <View style={styles.sheet}>
            <View style={styles.header}>
                <View style={styles.headerCopy}>
                <Text
                    style={styles.title}
                    numberOfLines={1}
                >
                    {entity?.name || 'Opciones'}
                </Text>

                <Text style={styles.subtitle}>
                    {isFolder
                    ? 'Carpeta'
                    : 'Etiqueta'}
                </Text>
                </View>

                <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                >
                <X
                    size={19}
                    color={colors.neutral.gray600}
                />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.actionRow}
                onPress={onRename}
                activeOpacity={0.75}
            >
                <View style={styles.iconWrap}>
                <Edit3
                    size={18}
                    color={colors.neutral.gray700}
                />
                </View>

                <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>
                    Renombrar
                </Text>

                <Text style={styles.actionDescription}>
                    Cambiar el nombre de esta {
                    isFolder
                        ? 'carpeta'
                        : 'etiqueta'
                    }.
                </Text>
                </View>
            </TouchableOpacity>

            {isFolder && onMove && (
                <TouchableOpacity
                style={styles.actionRow}
                onPress={onMove}
                activeOpacity={0.75}
                >
                <View style={styles.iconWrap}>
                    <FolderInput
                    size={18}
                    color={colors.neutral.gray700}
                    />
                </View>

                <View style={styles.actionCopy}>
                    <Text style={styles.actionTitle}>
                    Mover carpeta
                    </Text>

                    <Text style={styles.actionDescription}>
                    Cambiar su carpeta superior.
                    </Text>
                </View>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={styles.actionRow}
                onPress={onDelete}
                activeOpacity={0.75}
            >
                <View
                style={[
                    styles.iconWrap,
                    styles.deleteIconWrap,
                ]}
                >
                <Trash2
                    size={18}
                    color={colors.semantic.error}
                />
                </View>

                <View style={styles.actionCopy}>
                <Text
                    style={[
                    styles.actionTitle,
                    styles.deleteText,
                    ]}
                >
                    Eliminar
                </Text>

                <Text style={styles.actionDescription}>
                    Esta acción no se puede deshacer.
                </Text>
                </View>
            </TouchableOpacity>
            </View>
        </View>
        </Modal>
    );
}


const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(26, 26, 46, 0.35)',
    },
    sheet: {
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        backgroundColor: colors.neutral.white,
        paddingBottom: spacing.lg,
    },
    header: {
        minHeight: 66,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    headerCopy: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    closeButton: {
        padding: 4,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral.gray100,
    },
    deleteIconWrap: {
        backgroundColor: colors.semantic.error + '12',
    },
    actionCopy: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    actionDescription: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    deleteText: {
        color: colors.semantic.error,
    },
});