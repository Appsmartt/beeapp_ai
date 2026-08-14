import {
    useEffect,
    useMemo,
    useState,
    } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    } from 'react-native';
import {
    Mail,
    Search,
    Share2,
    UserRound,
    X,
    } from 'lucide-react-native';
import { colors, radii, spacing } from '@beeapp/design-system';
import {
    searchStorageShareRecipients,
    } from '@beeapp/api-client';
import type {
    AuthCredentials,
    FileSharePermission,
    StorageShareRecipient,
    } from '@beeapp/shared-types';


interface StorageShareModalProps {
    visible: boolean;
    fileName?: string;
    auth: AuthCredentials | null;
    submitting?: boolean;
    onClose: () => void;
    onShare: (
        recipient: StorageShareRecipient,
        permission: FileSharePermission,
    ) => Promise<void>;
}


function getRecipientName(
    recipient: StorageShareRecipient,
    ): string {
    return [
        recipient.first_name,
        recipient.last_name,
    ]
        .filter(Boolean)
        .join(' ')
        || recipient.email
        || recipient.phone_number
        || 'Usuario';
}


function getRecipientContact(
    recipient: StorageShareRecipient,
    ): string {
    if (recipient.email) {
        return recipient.email;
    }

    return [
        recipient.phone_dial_code
        ? `+${recipient.phone_dial_code}`
        : '',
        recipient.phone_number || '',
    ]
        .join(' ')
        .trim();
}


export default function StorageShareModal({
    visible,
    fileName,
    auth,
    submitting = false,
    onClose,
    onShare,
    }: StorageShareModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<
        StorageShareRecipient[]
    >([]);
    const [selectedRecipient, setSelectedRecipient] =
        useState<StorageShareRecipient | null>(null);

    const [permission, setPermission] =
        useState<FileSharePermission>('viewer');

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null);


    useEffect(() => {
        if (!visible) {
        return;
        }

        setQuery('');
        setResults([]);
        setSelectedRecipient(null);
        setPermission('viewer');
        setErrorMessage(null);
    }, [visible]);


    useEffect(() => {
        if (!visible || !auth) {
        return;
        }

        const normalizedQuery = query.trim();

        if (normalizedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
        }

        let cancelled = false;

        const timer = setTimeout(() => {
        setLoading(true);
        setErrorMessage(null);

        void searchStorageShareRecipients(
            auth,
            normalizedQuery,
        )
            .then((response) => {
            if (!cancelled) {
                setResults(response.recipients);
            }
            })
            .catch((error) => {
            if (!cancelled) {
                setResults([]);
                setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'No fue posible buscar usuarios.',
                );
            }
            })
            .finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
            });
        }, 350);

        return () => {
        cancelled = true;
        clearTimeout(timer);
        };
    }, [auth, query, visible]);


    const canSubmit = useMemo(
        () =>
        Boolean(selectedRecipient)
        && !submitting,
        [selectedRecipient, submitting],
    );


    const handleShare = async () => {
        if (!selectedRecipient || submitting) {
        return;
        }

        try {
        setErrorMessage(null);

        await onShare(
            selectedRecipient,
            permission,
        );
        } catch (error) {
        setErrorMessage(
            error instanceof Error
            ? error.message
            : 'No fue posible compartir el archivo.',
        );
        }
    };


    return (
        <Modal
        transparent
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
        >
        <View style={styles.backdrop}>
            <TouchableOpacity
            style={styles.backdropTouch}
            onPress={onClose}
            activeOpacity={1}
            />

            <View style={styles.sheet}>
            <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                <View style={styles.headerIcon}>
                    <Share2
                    size={18}
                    color={colors.brand.primary}
                    />
                </View>

                <View>
                    <Text style={styles.title}>
                    Compartir archivo
                    </Text>

                    {!!fileName && (
                    <Text
                        style={styles.fileName}
                        numberOfLines={1}
                    >
                        {fileName}
                    </Text>
                    )}
                </View>
                </View>

                <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                >
                <X
                    size={18}
                    color={colors.neutral.gray600}
                />
                </TouchableOpacity>
            </View>

            <Text style={styles.label}>
                Busca por correo, teléfono o nombre
            </Text>

            <View style={styles.searchBox}>
                <Search
                size={18}
                color={colors.neutral.gray500}
                />

                <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Ej. usuario@correo.com"
                placeholderTextColor={colors.neutral.gray500}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
                />

                {loading && (
                <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                />
                )}
            </View>

            {errorMessage && (
                <Text style={styles.errorText}>
                {errorMessage}
                </Text>
            )}

            <ScrollView
                style={styles.resultsList}
                contentContainerStyle={
                styles.resultsContent
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {query.trim().length < 2 ? (
                <Text style={styles.helperText}>
                    Escribe al menos dos caracteres para buscar.
                </Text>
                ) : !loading && results.length === 0 ? (
                <Text style={styles.helperText}>
                    No encontramos usuarios con esa búsqueda.
                </Text>
                ) : (
                results.map((recipient) => {
                    const isSelected =
                    selectedRecipient?.id === recipient.id;

                    return (
                    <TouchableOpacity
                        key={recipient.id}
                        style={[
                        styles.recipientRow,
                        isSelected
                            && styles.recipientRowSelected,
                        ]}
                        onPress={() =>
                        setSelectedRecipient(recipient)
                        }
                        activeOpacity={0.75}
                    >
                        <View style={styles.recipientAvatar}>
                        <UserRound
                            size={18}
                            color={colors.brand.primary}
                        />
                        </View>

                        <View style={styles.recipientInfo}>
                        <Text style={styles.recipientName}>
                            {getRecipientName(recipient)}
                        </Text>

                        <View style={styles.contactRow}>
                            <Mail
                            size={11}
                            color={colors.neutral.gray500}
                            />

                            <Text style={styles.recipientContact}>
                            {getRecipientContact(recipient)}
                            </Text>
                        </View>
                        </View>

                        {isSelected && (
                        <View style={styles.selectedDot} />
                        )}
                    </TouchableOpacity>
                    );
                })
                )}
            </ScrollView>

            <Text style={styles.label}>
                Permiso
            </Text>

            <View style={styles.permissionRow}>
                <TouchableOpacity
                style={[
                    styles.permissionOption,
                    permission === 'viewer'
                    && styles.permissionOptionActive,
                ]}
                onPress={() => setPermission('viewer')}
                activeOpacity={0.75}
                >
                <Text
                    style={[
                    styles.permissionTitle,
                    permission === 'viewer'
                        && styles.permissionTitleActive,
                    ]}
                >
                    Puede ver
                </Text>

                <Text style={styles.permissionDescription}>
                    Puede abrir y descargar el archivo.
                </Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={[
                    styles.permissionOption,
                    permission === 'editor'
                    && styles.permissionOptionActive,
                ]}
                onPress={() => setPermission('editor')}
                activeOpacity={0.75}
                >
                <Text
                    style={[
                    styles.permissionTitle,
                    permission === 'editor'
                        && styles.permissionTitleActive,
                    ]}
                >
                    Puede editar
                </Text>

                <Text style={styles.permissionDescription}>
                    Permiso preparado para futuras acciones.
                </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={submitting}
                >
                <Text style={styles.cancelButtonText}>
                    Cancelar
                </Text>
                </TouchableOpacity>

                <TouchableOpacity
                style={[
                    styles.shareButton,
                    !canSubmit && styles.shareButtonDisabled,
                ]}
                onPress={() => {
                    void handleShare();
                }}
                activeOpacity={0.8}
                disabled={!canSubmit}
                >
                {submitting ? (
                    <ActivityIndicator
                    size="small"
                    color={colors.neutral.white}
                    />
                ) : (
                    <Text style={styles.shareButtonText}>
                    Compartir
                    </Text>
                )}
                </TouchableOpacity>
            </View>
            </View>
        </View>
        </Modal>
    );
}


const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(26, 26, 46, 0.42)',
        justifyContent: 'flex-end',
    },
    backdropTouch: {
        flex: 1,
    },
    sheet: {
        backgroundColor: colors.neutral.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    headerTitleWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingRight: spacing.sm,
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.brand.primary}15`,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    fileName: {
        maxWidth: 245,
        marginTop: 2,
        fontSize: 12,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: radii.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral.gray100,
    },
    label: {
        marginBottom: spacing.sm,
        fontSize: 12,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.neutral.gray50,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.neutral.text,
    },
    errorText: {
        marginTop: spacing.sm,
        fontSize: 12,
        color: colors.semantic.error,
    },
    resultsList: {
        minHeight: 92,
        maxHeight: 220,
        marginTop: spacing.sm,
        marginBottom: spacing.md,
    },
    resultsContent: {
        gap: 6,
    },
    helperText: {
        paddingVertical: spacing.md,
        fontSize: 12,
        color: colors.neutral.gray600,
        textAlign: 'center',
    },
    recipientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.neutral.gray100,
        borderRadius: radii.lg,
        padding: spacing.sm,
    },
    recipientRowSelected: {
        borderColor: colors.brand.primary,
        backgroundColor: `${colors.brand.primary}0D`,
    },
    recipientAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.brand.primary}15`,
    },
    recipientInfo: {
        flex: 1,
    },
    recipientName: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    recipientContact: {
        flex: 1,
        fontSize: 11,
        color: colors.neutral.gray600,
    },
    selectedDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.brand.primary,
    },
    permissionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    permissionOption: {
        flex: 1,
        minHeight: 82,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        padding: spacing.sm,
        backgroundColor: colors.neutral.white,
    },
    permissionOptionActive: {
        borderColor: colors.brand.primary,
        backgroundColor: `${colors.brand.primary}0D`,
    },
    permissionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    permissionTitleActive: {
        color: colors.brand.primary,
    },
    permissionDescription: {
        marginTop: 4,
        fontSize: 10,
        lineHeight: 14,
        color: colors.neutral.gray600,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.neutral.gray300,
        borderRadius: radii.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '400',
        color: colors.neutral.gray700,
    },
    shareButton: {
        flex: 1,
        borderRadius: radii.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        backgroundColor: colors.brand.primary,
    },
    shareButtonDisabled: {
        backgroundColor: colors.neutral.gray400,
    },
    shareButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.white,
    },
});