import {
  useEffect,
  useState,
  } from 'react';
import {
    ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { appAlert } from '../feedback/appAlert';
import * as DocumentPicker from 'expo-document-picker';
import { withExternalActivity } from '../../services/locationPermissionAppLockGuard';
import {
    Download,
    FileText,
    ImageIcon,
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
import {
    deleteNoteAttachment,
    getNoteAttachmentAccess,
    getNoteAttachments,
    uploadNoteAttachments,
    } from '@beeapp/api-client';
import type {
    NoteAttachment,
    NoteAttachmentType,
    } from '@beeapp/shared-types';

import {
    getValidSessionCredentials,
    } from '../../services/authSession';
import NoteAttachmentImagePreview from './NoteAttachmentImagePreview';
import NoteImageViewerModal from './NoteImageViewerModal';
import {
    useNoteAttachmentAccessUrl,
    } from '../../hooks/useNoteAttachmentAccessUrl';
import {
    downloadNoteAttachment,
    } from '../../services/noteAttachmentDownload';
import NoteDownloadSuccessModal from './NoteDownloadSuccessModal';


const MAX_ATTACHMENT_SIZE_BYTES = 52_428_800;


interface NoteAttachmentsSectionProps {
    noteId?: string;
    readOnly?: boolean;
    onAttachmentCreated?: (
        attachment: NoteAttachment,
    ) => void;
    onAttachmentDeleted?: (
        attachmentId: string,
    ) => void;
}


export default function NoteAttachmentsSection({
    noteId,
    readOnly = false,
    onAttachmentCreated,
    onAttachmentDeleted,
    }: NoteAttachmentsSectionProps) {
    const [attachments, setAttachments] = useState<
        NoteAttachment[]
    >([]);

    const [loading, setLoading] = useState(false);

    const [uploading, setUploading] = useState(false);

    const [pickerVisible, setPickerVisible] =
        useState(false);

    const [
        downloadingAttachmentId,
        setDownloadingAttachmentId,
    ] = useState<string | null>(null);

    const [
        downloadSuccessFeedback,
        setDownloadSuccessFeedback,
    ] = useState<{
        title: string;
        message: string;
    } | null>(null);


    const loadAttachments = async () => {
        if (!noteId) {
        setAttachments([]);
        return;
        }

        try {
        setLoading(true);

        const auth =
            await getValidSessionCredentials();

        if (!auth) {
            throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        const response = await getNoteAttachments(
            auth,
            noteId,
        );

        setAttachments(response.attachments);
        } catch (error) {
        appAlert(
            'No fue posible cargar adjuntos',
            error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
        } finally {
        setLoading(false);
        }
    };


    useEffect(() => {
        void loadAttachments();
    }, [noteId]);


    const handlePickAndUpload = async (
        attachmentType: NoteAttachmentType,
    ) => {
        if (!noteId) {
        appAlert(
            'Guarda la nota primero',
            'Primero guarda la nota para poder adjuntar archivos o imágenes.',
        );

        setPickerVisible(false);
        return;
        }

        try {
        setPickerVisible(false);

        const result = await withExternalActivity(() => (
            DocumentPicker.getDocumentAsync({
            type: attachmentType === 'image'
                ? 'image/*'
                : '*/*',
            copyToCacheDirectory: true,
            multiple: true,
            })
        ));

        if (
            result.canceled
            || result.assets.length === 0
        ) {
            return;
        }

        const oversizedAsset = result.assets.find(
            (asset) =>
            asset.size !== undefined
            && asset.size > MAX_ATTACHMENT_SIZE_BYTES,
        );

        if (oversizedAsset) {
            appAlert(
            'Archivo demasiado grande',
            'Cada archivo debe pesar máximo 50 MB. '
                + 'El archivo "'
                + oversizedAsset.name
                + '" supera ese límite.',
            );

            return;
        }

        setUploading(true);

        const auth =
            await getValidSessionCredentials();

        if (!auth) {
            throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        const formData = new FormData();

        result.assets.forEach((asset) => {
            const fileValue = {
            uri: asset.uri,
            name: asset.name || 'archivo',
            type: asset.mimeType
                || 'application/octet-stream',
            };

            formData.append(
            'files',
            fileValue as never,
            );
        });

        formData.append(
            'attachment_type',
            attachmentType,
        );

        const response = await uploadNoteAttachments(
            auth,
            noteId,
            formData,
        );

        const uploadedAttachments =
            response.attachments || [];

        setAttachments((currentAttachments) => [
            ...currentAttachments,
            ...uploadedAttachments,
        ]);

        uploadedAttachments.forEach((attachment) => {
            if (onAttachmentCreated) {
            onAttachmentCreated(attachment);
            }
        });

        if (response.failure_count > 0) {
            appAlert(
            'Carga completada parcialmente',
            String(response.success_count)
                + ' archivo(s) se adjuntaron correctamente. '
                + String(response.failure_count)
                + ' no pudieron subirse.',
            );

            return;
        }

        appAlert(
            'Archivos adjuntados',
            String(response.success_count)
            + ' archivo(s) se adjuntaron correctamente.',
        );
        } catch (error) {
        appAlert(
            'No fue posible adjuntar archivos',
            error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
        } finally {
        setUploading(false);
        }
    };


    const handleOpenAttachment = async (
        attachment: NoteAttachment,
        download: boolean,
    ) => {
        if (!noteId) {
        return;
        }

        try {
        const auth =
            await getValidSessionCredentials();

        if (!auth) {
            throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        const response = await getNoteAttachmentAccess(
            auth,
            noteId,
            attachment.id,
            download,
        );

        const canOpen = await Linking.canOpenURL(
            response.url,
        );

        if (!canOpen) {
            throw new Error(
            'El dispositivo no puede abrir este archivo.',
            );
        }

        await Linking.openURL(response.url);
        } catch (error) {
        appAlert(
            'No fue posible abrir el adjunto',
            error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
        }
    };


    const handleDownloadAttachment = async (
        attachment: NoteAttachment,
    ) => {
        if (!noteId || downloadingAttachmentId) {
        return;
        }

        setDownloadingAttachmentId(attachment.id);

        try {
        const outcome = await downloadNoteAttachment(
            noteId,
            attachment,
        );

        setDownloadSuccessFeedback({
            title: outcome === 'shared'
            ? 'Archivo listo'
            : outcome === 'downloads'
            ? 'Archivo descargado'
            : 'Imagen guardada',
            message: outcome === 'gallery'
            ? (
                'Busca la imagen en la app Fotos o Galería '
                + '(carpeta Buddy o Recientes).'
            )
            : outcome === 'downloads'
            ? 'El archivo quedó en la carpeta Descargas de tu dispositivo.'
            : (
                'Si apareció el menú de compartir, '
                + 'elige guardar en archivos.'
            ),
        });
        } catch (error) {
        appAlert(
            'No se pudo descargar',
            error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
        } finally {
        setDownloadingAttachmentId(null);
        }
    };


    const handleDeleteAttachment = (
        attachment: NoteAttachment,
    ) => {
        if (!noteId) {
        return;
        }

        appAlert(
        'Quitar adjunto',
        '¿Deseas quitar "'
            + attachment.file.display_name
            + '" de esta nota? El archivo seguirá existiendo en Storage.',
        [
            {
            text: 'Cancelar',
            style: 'cancel',
            },
            {
            text: 'Quitar',
            style: 'destructive',
            onPress: () => {
                void confirmDeleteAttachment(attachment);
            },
            },
        ],
        );
    };


    const confirmDeleteAttachment = async (
        attachment: NoteAttachment,
    ) => {
        if (!noteId) {
        return;
        }

        try {
        const auth =
            await getValidSessionCredentials();

        if (!auth) {
            throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        await deleteNoteAttachment(
            auth,
            noteId,
            attachment.id,
        );

        setAttachments((currentAttachments) =>
            currentAttachments.filter(
            (item) => item.id !== attachment.id,
            ),
        );

        if (onAttachmentDeleted) {
            onAttachmentDeleted(attachment.id);
        }
        } catch (error) {
        appAlert(
            'No fue posible quitar el adjunto',
            error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
        }
    };


    return (
        <View style={styles.container}>
        <View style={styles.header}>
            <View style={styles.headerCopy}>
            <Text style={styles.title}>
                Adjuntos
            </Text>

            <Text style={styles.subtitle}>
                Archivos e imágenes vinculados a esta nota.
            </Text>
            </View>

            {!readOnly && (
            <TouchableOpacity
                style={[
                styles.addButton,
                (
                    uploading
                    || !noteId
                ) && styles.addButtonDisabled,
                ]}
                onPress={() => setPickerVisible(true)}
                disabled={uploading}
                activeOpacity={0.8}
            >
                {uploading ? (
                <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                />
                ) : (
                <Plus
                    size={17}
                    color={colors.brand.primary}
                />
                )}

                <Text style={styles.addButtonText}>
                Adjuntar
                </Text>
            </TouchableOpacity>
            )}
        </View>

        {!noteId && !readOnly && (
            <View style={styles.saveFirstBox}>
            <Text style={styles.saveFirstText}>
                Guarda la nota primero para adjuntar archivos.
            </Text>
            </View>
        )}

        {loading ? (
            <View style={styles.loadingBox}>
            <ActivityIndicator
                size="small"
                color={colors.brand.primary}
            />
            </View>
        ) : attachments.length > 0 ? (
            <View style={styles.attachmentsList}>
            {attachments.map((attachment) => (
                <AttachmentRow
                key={attachment.id}
                noteId={noteId}
                attachment={attachment}
                readOnly={readOnly}
                onOpen={() => {
                    void handleOpenAttachment(
                    attachment,
                    false,
                    );
                }}
                downloading={
                    downloadingAttachmentId
                    === attachment.id
                }
                onDownload={() => {
                    void handleDownloadAttachment(
                    attachment,
                    );
                }}
                onDelete={() => {
                    handleDeleteAttachment(attachment);
                }}
                />
            ))}
            </View>
        ) : (
            <View style={styles.emptyBox}>
            <Paperclip
                size={20}
                color={colors.neutral.gray500}
            />

            <Text style={styles.emptyText}>
                No hay adjuntos todavía.
            </Text>
            </View>
        )}

        <AttachmentPickerModal
            visible={pickerVisible}
            onClose={() => setPickerVisible(false)}
            onChooseImage={() => {
            void handlePickAndUpload('image');
            }}
            onChooseFile={() => {
            void handlePickAndUpload('attachment');
            }}
        />

        <NoteDownloadSuccessModal
            visible={downloadSuccessFeedback !== null}
            title={
            downloadSuccessFeedback?.title
            || ''
            }
            message={
            downloadSuccessFeedback?.message
            || ''
            }
            onClose={() => setDownloadSuccessFeedback(null)}
        />
        </View>
    );
}


function AttachmentRow({
    noteId,
    attachment,
    readOnly,
    downloading,
    onOpen,
    onDownload,
    onDelete,
    }: {
    noteId?: string;
    attachment: NoteAttachment;
    readOnly: boolean;
    downloading: boolean;
    onOpen: () => void;
    onDownload: () => void;
    onDelete: () => void;
    }) {
    const isImage =
        attachment.attachment_type === 'image'
        || attachment.file.kind === 'image';

    const {
        url: imageUrl,
    } = useNoteAttachmentAccessUrl(
        isImage ? noteId : undefined,
        isImage ? attachment.id : undefined,
    );

    const [
        imageViewerVisible,
        setImageViewerVisible,
    ] = useState(false);

    const handleMainPress = () => {
        if (isImage && imageUrl) {
            setImageViewerVisible(true);
            return;
        }

        onOpen();
    };

    return (
        <View style={styles.attachmentRow}>
        <TouchableOpacity
            style={styles.attachmentMain}
            onPress={handleMainPress}
            activeOpacity={0.75}
        >
            {isImage && noteId ? (
            <NoteAttachmentImagePreview
                noteId={noteId}
                attachmentId={attachment.id}
                accessUrl={imageUrl}
                variant="thumbnail"
                pressable={false}
            />
            ) : (
            <View
            style={[
                styles.attachmentIcon,
                isImage && styles.imageAttachmentIcon,
            ]}
            >
            {isImage ? (
                <ImageIcon
                size={19}
                color="#2563EB"
                />
            ) : (
                <FileText
                size={19}
                color={colors.neutral.gray700}
                />
            )}
            </View>
            )}

            <View style={styles.attachmentCopy}>
            <Text
                style={styles.attachmentName}
                numberOfLines={1}
            >
                {attachment.file.display_name}
            </Text>

            <Text style={styles.attachmentMeta}>
                {formatFileSize(attachment.file.size_bytes)}
                {' · '}
                {isImage
                ? 'Imagen'
                : 'Archivo'}
            </Text>
            </View>
        </TouchableOpacity>

        <View style={styles.attachmentActions}>
            <TouchableOpacity
            style={styles.rowAction}
            onPress={onDownload}
            activeOpacity={0.7}
            disabled={downloading}
            accessibilityLabel="Descargar adjunto"
            >
            {downloading ? (
            <ActivityIndicator
                size="small"
                color={colors.brand.primary}
            />
            ) : (
            <Download
                size={17}
                color={colors.neutral.gray600}
            />
            )}
            </TouchableOpacity>

            {!readOnly && (
            <TouchableOpacity
                style={styles.rowAction}
                onPress={onDelete}
                activeOpacity={0.7}
                accessibilityLabel="Quitar adjunto"
            >
                <Trash2
                size={17}
                color={colors.semantic.error}
                />
            </TouchableOpacity>
            )}
        </View>

        {isImage ? (
            <NoteImageViewerModal
            visible={imageViewerVisible}
            url={imageUrl}
            caption={attachment.file.display_name}
            onClose={() => setImageViewerVisible(false)}
            />
        ) : null}
        </View>
    );
}


function AttachmentPickerModal({
    visible,
    onClose,
    onChooseImage,
    onChooseFile,
    }: {
    visible: boolean;
    onClose: () => void;
    onChooseImage: () => void;
    onChooseFile: () => void;
    }) {
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
                Adjuntar a la nota
                </Text>

                <TouchableOpacity
                style={styles.modalCloseButton}
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
                style={styles.modalOption}
                onPress={onChooseImage}
                activeOpacity={0.75}
            >
                <View
                style={[
                    styles.modalOptionIcon,
                    styles.modalImageIcon,
                ]}
                >
                <ImageIcon
                    size={20}
                    color="#2563EB"
                />
                </View>

                <View style={styles.modalOptionCopy}>
                <Text style={styles.modalOptionTitle}>
                    Imagen
                </Text>

                <Text
                    style={styles.modalOptionDescription}
                >
                    Selecciona una o varias imágenes.
                </Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.modalOption}
                onPress={onChooseFile}
                activeOpacity={0.75}
            >
                <View style={styles.modalOptionIcon}>
                <FileText
                    size={20}
                    color={colors.neutral.gray700}
                />
                </View>

                <View style={styles.modalOptionCopy}>
                <Text style={styles.modalOptionTitle}>
                    Archivo
                </Text>

                <Text
                    style={styles.modalOptionDescription}
                >
                    Selecciona documentos u otros archivos.
                </Text>
                </View>
            </TouchableOpacity>
            </View>
        </View>
        </Modal>
    );
}


function formatFileSize(
    bytes: number,
    ): string {
    if (
        !Number.isFinite(bytes)
        || bytes <= 0
    ) {
        return '0 B';
    }

    const units = [
        'B',
        'KB',
        'MB',
        'GB',
    ];

    const exponent = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1,
    );

    const value = bytes / 1024 ** exponent;

    const decimals = exponent === 0
        ? 0
        : value >= 10
        ? 1
        : 2;

    return String(
        value.toFixed(decimals),
    ) + ' ' + units[exponent];
}


const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.xl,
        backgroundColor: colors.neutral.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerCopy: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    subtitle: {
        marginTop: 3,
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    addButton: {
        minHeight: 34,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: radii.md,
        paddingHorizontal: 9,
        backgroundColor: colors.brand.primary + '12',
    },
    addButtonDisabled: {
        opacity: 0.55,
    },
    addButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.brand.primary,
    },
    saveFirstBox: {
        marginTop: 12,
        borderRadius: radii.md,
        paddingHorizontal: 10,
        paddingVertical: 9,
        backgroundColor: colors.neutral.gray100,
    },
    saveFirstText: {
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    loadingBox: {
        minHeight: 62,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachmentsList: {
        marginTop: 12,
        gap: 8,
    },
    attachmentRow: {
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        padding: 8,
        backgroundColor: colors.neutral.gray50,
    },
    attachmentMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
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
    attachmentCopy: {
        flex: 1,
    },
    attachmentName: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    attachmentMeta: {
        marginTop: 2,
        fontSize: 10,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    attachmentActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowAction: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBox: {
        minHeight: 76,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        marginTop: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.neutral.gray300,
        borderRadius: radii.lg,
    },
    emptyText: {
        fontSize: 12,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(26, 26, 46, 0.35)',
    },
    modalSheet: {
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        backgroundColor: colors.neutral.white,
        paddingBottom: spacing.lg,
    },
    modalHeader: {
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
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
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    modalOptionIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: colors.neutral.gray100,
    },
    modalImageIcon: {
        backgroundColor: '#2563EB14',
    },
    modalOptionCopy: {
        flex: 1,
    },
    modalOptionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    modalOptionDescription: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
});