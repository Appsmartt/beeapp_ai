import {
    useEffect,
    useState,
    } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    } from 'react-native';
import {
    CalendarClock,
    Check,
    Search,
    Send,
    UserRound,
    X,
    } from 'lucide-react-native';
import {
    colors,
    radii,
    spacing,
    } from '@beeapp/design-system';
import {
    createNoteShare,
    searchNoteShareRecipients,
    } from '@beeapp/api-client';
import type {
    AuthCredentials,
    NoteShareRecipient,
    } from '@beeapp/shared-types';

import {
    getValidSessionCredentials,
    } from '../../services/authSession';


interface NoteShareModalProps {
    visible: boolean;
    noteId?: string;
    noteTitle?: string;
    onClose: () => void;
    onShared: () => void;
}


export default function NoteShareModal({
    visible,
    noteId,
    noteTitle,
    onClose,
    onShared,
    }: NoteShareModalProps) {
    const [query, setQuery] = useState('');

    const [recipients, setRecipients] = useState<
        NoteShareRecipient[]
    >([]);

    const [selectedRecipient, setSelectedRecipient] =
        useState<NoteShareRecipient | null>(null);

    const [expiration, setExpiration] = useState('');

    const [searching, setSearching] = useState(false);

    const [sharing, setSharing] = useState(false);

    const [searchError, setSearchError] = useState<
        string | null
    >(null);


    useEffect(() => {
        if (!visible) {
        return;
        }

        setQuery('');
        setRecipients([]);
        setSelectedRecipient(null);
        setExpiration('');
        setSearching(false);
        setSharing(false);
        setSearchError(null);
    }, [visible]);


    useEffect(() => {
        if (!visible) {
        return;
        }

        const normalizedQuery = query.trim();

        if (normalizedQuery.length < 2) {
        setRecipients([]);
        setSearchError(null);
        return;
        }

        const timeoutId = setTimeout(() => {
        void searchRecipients(normalizedQuery);
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [query, visible]);


    const searchRecipients = async (
        searchValue: string,
    ) => {
        try {
        setSearching(true);
        setSearchError(null);

        const auth =
            await getValidSessionCredentials();

        if (!auth) {
            throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        const response =
            await searchNoteShareRecipients(
            auth,
            searchValue,
            10,
            );

        setRecipients(response.recipients);
        } catch (error) {
        setRecipients([]);
        setSearchError(
            error instanceof Error
            ? error.message
            : 'No fue posible buscar destinatarios.',
        );
        } finally {
        setSearching(false);
        }
    };


    const handleShare = async () => {
        if (!noteId) {
        Alert.alert(
            'Guarda la nota primero',
            (
            'Primero guarda la nota antes de '
            + 'compartirla.'
            ),
        );
        return;
        }

        if (!selectedRecipient) {
        Alert.alert(
            'Selecciona un destinatario',
            (
            'Busca y selecciona la persona con quien '
            + 'deseas compartir la nota.'
            ),
        );
        return;
        }

        let expiresAt: string | null = null;

        if (expiration.trim()) {
        const parsedDate = new Date(
            expiration.trim(),
        );

        if (Number.isNaN(parsedDate.getTime())) {
            Alert.alert(
            'Fecha no válida',
            (
                'Usa una fecha y hora válida en formato '
                + 'YYYY-MM-DD o YYYY-MM-DDTHH:mm.'
            ),
            );
            return;
        }

        if (parsedDate.getTime() <= Date.now()) {
            Alert.alert(
            'Fecha no válida',
            'La fecha de vencimiento debe estar en el futuro.',
            );
            return;
        }

        expiresAt = parsedDate.toISOString();
        }

        try {
        setSharing(true);

        const auth =
            await getValidSessionCredentials();

        if (!auth) {
            throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
            );
        }

        await createNoteShare(
            auth,
            noteId,
            {
            recipient_id: selectedRecipient.id,
            expires_at: expiresAt,
            },
        );

        Alert.alert(
            'Nota compartida',
            (
            'La nota'
            + (
                noteTitle
                ? ` “${noteTitle}”`
                : ''
            )
            + ' fue compartida con '
            + getRecipientName(selectedRecipient)
            + '.'
            ),
        );

        onShared();
        } catch (error) {
        Alert.alert(
            'No fue posible compartir la nota',
            error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
        } finally {
        setSharing(false);
        }
    };


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
            disabled={sharing}
            />

            <View style={styles.sheet}>
            <View style={styles.header}>
                <View style={styles.headerCopy}>
                <Text style={styles.title}>
                    Compartir nota
                </Text>

                {!!noteTitle && (
                    <Text
                    style={styles.subtitle}
                    numberOfLines={1}
                    >
                    {noteTitle}
                    </Text>
                )}
                </View>

                <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={sharing}
                >
                <X
                    size={19}
                    color={colors.neutral.gray600}
                />
                </TouchableOpacity>
            </View>

            <View style={styles.body}>
                <Text style={styles.label}>
                Destinatario
                </Text>

                <View style={styles.searchBox}>
                <Search
                    size={18}
                    color={colors.neutral.gray500}
                />

                <TextInput
                    style={styles.searchInput}
                    placeholder="Nombre, correo o teléfono"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!sharing}
                />

                {searching && (
                    <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                    />
                )}
                </View>

                {selectedRecipient && (
                <View style={styles.selectedRecipient}>
                    <View style={styles.avatar}>
                    <UserRound
                        size={18}
                        color={colors.brand.primary}
                    />
                    </View>

                    <View style={styles.recipientCopy}>
                    <Text
                        style={styles.recipientName}
                        numberOfLines={1}
                    >
                        {getRecipientName(selectedRecipient)}
                    </Text>

                    <Text
                        style={styles.recipientDetail}
                        numberOfLines={1}
                    >
                        {getRecipientDetail(selectedRecipient)}
                    </Text>
                    </View>

                    <TouchableOpacity
                    onPress={() =>
                        setSelectedRecipient(null)
                    }
                    style={styles.removeRecipient}
                    activeOpacity={0.7}
                    disabled={sharing}
                    >
                    <X
                        size={17}
                        color={colors.neutral.gray600}
                    />
                    </TouchableOpacity>
                </View>
                )}

                {!selectedRecipient && (
                <RecipientResults
                    query={query}
                    recipients={recipients}
                    loading={searching}
                    error={searchError}
                    onSelect={setSelectedRecipient}
                />
                )}

                <Text style={styles.label}>
                Vencimiento opcional
                </Text>

                <View style={styles.expirationBox}>
                <CalendarClock
                    size={18}
                    color={colors.neutral.gray500}
                />

                <TextInput
                    style={styles.expirationInput}
                    placeholder="YYYY-MM-DD o YYYY-MM-DDTHH:mm"
                    placeholderTextColor={
                    colors.neutral.gray500
                    }
                    value={expiration}
                    onChangeText={setExpiration}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!sharing}
                />
                </View>

                <Text style={styles.hint}>
                Si no defines vencimiento, la nota seguirá
                compartida hasta que la revoques.
                </Text>
            </View>

            <TouchableOpacity
                style={[
                styles.submitButton,
                (
                    !selectedRecipient
                    || sharing
                ) && styles.submitButtonDisabled,
                ]}
                onPress={() => {
                void handleShare();
                }}
                disabled={
                !selectedRecipient
                || sharing
                }
                activeOpacity={0.8}
            >
                {sharing ? (
                <ActivityIndicator
                    size="small"
                    color={colors.neutral.white}
                />
                ) : (
                <Send
                    size={18}
                    color={colors.neutral.white}
                />
                )}

                <Text style={styles.submitText}>
                {sharing
                    ? 'Compartiendo...'
                    : 'Compartir nota'}
                </Text>
            </TouchableOpacity>
            </View>
        </View>
        </Modal>
    );
}


function RecipientResults({
    query,
    recipients,
    loading,
    error,
    onSelect,
    }: {
    query: string;
    recipients: NoteShareRecipient[];
    loading: boolean;
    error: string | null;
    onSelect: (recipient: NoteShareRecipient) => void;
    }) {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
        return (
        <View style={styles.searchState}>
            <Text style={styles.searchStateText}>
            Escribe al menos 2 caracteres para buscar.
            </Text>
        </View>
        );
    }

    if (loading) {
        return (
        <View style={styles.searchState}>
            <Text style={styles.searchStateText}>
            Buscando usuarios...
            </Text>
        </View>
        );
    }

    if (error) {
        return (
        <View style={styles.searchState}>
            <Text style={styles.searchErrorText}>
            {error}
            </Text>
        </View>
        );
    }

    if (recipients.length === 0) {
        return (
        <View style={styles.searchState}>
            <Text style={styles.searchStateText}>
            No encontramos destinatarios.
            </Text>
        </View>
        );
    }

    return (
        <ScrollView
        style={styles.resultsList}
        contentContainerStyle={styles.resultsContent}
        nestedScrollEnabled
        >
        {recipients.map((recipient) => (
            <TouchableOpacity
            key={recipient.id}
            style={styles.recipientRow}
            onPress={() => onSelect(recipient)}
            activeOpacity={0.75}
            >
            <View style={styles.avatar}>
                <UserRound
                size={18}
                color={colors.brand.primary}
                />
            </View>

            <View style={styles.recipientCopy}>
                <Text
                style={styles.recipientName}
                numberOfLines={1}
                >
                {getRecipientName(recipient)}
                </Text>

                <Text
                style={styles.recipientDetail}
                numberOfLines={1}
                >
                {getRecipientDetail(recipient)}
                </Text>
            </View>

            <Check
                size={18}
                color={colors.neutral.gray400}
            />
            </TouchableOpacity>
        ))}
        </ScrollView>
    );
}


function getRecipientName(
    recipient: NoteShareRecipient,
    ): string {
    return (
        `${recipient.first_name} `
        + `${recipient.last_name}`
    ).trim() || 'Usuario de BeeApp';
}


function getRecipientDetail(
    recipient: NoteShareRecipient,
    ): string {
    if (recipient.email) {
        return recipient.email;
    }

    const phone = [
        recipient.phone_dial_code,
        recipient.phone_number,
    ]
        .filter(Boolean)
        .join(' ');

    return phone || 'Sin información de contacto';
}


const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(26, 26, 46, 0.35)',
    },
    sheet: {
        maxHeight: '86%',
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
    body: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    label: {
        marginBottom: 7,
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral.gray700,
    },
    searchBox: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        paddingHorizontal: 11,
        backgroundColor: colors.neutral.gray50,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '400',
        color: colors.neutral.text,
    },
    selectedRecipient: {
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.brand.primary,
        borderRadius: radii.lg,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: colors.brand.primary + '10',
    },
    avatar: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 17,
        backgroundColor: colors.brand.primary + '15',
    },
    recipientCopy: {
        flex: 1,
    },
    recipientName: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    recipientDetail: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    removeRecipient: {
        padding: 4,
    },
    resultsList: {
        maxHeight: 190,
        marginTop: 8,
        marginBottom: 16,
    },
    resultsContent: {
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        overflow: 'hidden',
    },
    recipientRow: {
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral.gray100,
    },
    searchState: {
        minHeight: 56,
        justifyContent: 'center',
        marginBottom: 16,
    },
    searchStateText: {
        fontSize: 12,
        fontWeight: '400',
        color: colors.neutral.gray600,
    },
    searchErrorText: {
        fontSize: 12,
        fontWeight: '400',
        color: colors.semantic.error,
    },
    expirationBox: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        paddingHorizontal: 11,
        backgroundColor: colors.neutral.gray50,
    },
    expirationInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '400',
        color: colors.neutral.text,
    },
    hint: {
        marginTop: 7,
        marginBottom: 14,
        fontSize: 11,
        fontWeight: '400',
        color: colors.neutral.gray600,
        lineHeight: 16,
    },
    submitButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: colors.brand.primary,
    },
    submitButtonDisabled: {
        backgroundColor: colors.neutral.gray400,
    },
    submitText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.neutral.white,
    },
});