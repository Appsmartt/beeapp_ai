import {
  useEffect,
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
import { appAlert } from '../feedback/appAlert';
import {
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
    listNoteShareRecipientSuggestions,
    searchNoteShareRecipients,
    } from '@beeapp/api-client';
import type {
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
    onShared: (recipientName: string) => void;
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

    const [searching, setSearching] = useState(false);

    const [sharing, setSharing] = useState(false);

    const [searchError, setSearchError] = useState<
        string | null
    >(null);

    const [
        suggestedRecipients,
        setSuggestedRecipients,
    ] = useState<NoteShareRecipient[]>([]);

    const [
        loadingSuggestions,
        setLoadingSuggestions,
    ] = useState(false);


    useEffect(() => {
        if (!visible) {
        return;
        }

        setQuery('');
        setRecipients([]);
        setSelectedRecipient(null);
        setSearching(false);
        setSharing(false);
        setSearchError(null);
        setSuggestedRecipients([]);
    }, [visible]);


    useEffect(() => {
        if (!visible) {
        return;
        }

        let cancelled = false;

        void (async () => {
        try {
            setLoadingSuggestions(true);

            const auth =
            await getValidSessionCredentials();

            if (!auth) {
            throw new Error(
                'Tu sesión expiró. Inicia sesión nuevamente.',
            );
            }

            const response =
            await listNoteShareRecipientSuggestions(
                auth,
                12,
            );

            if (!cancelled) {
            setSuggestedRecipients(
                response.recipients.slice(0, 8),
            );
            }
        } catch {
            if (!cancelled) {
            setSuggestedRecipients([]);
            }
        } finally {
            if (!cancelled) {
            setLoadingSuggestions(false);
            }
        }
        })();

        return () => {
        cancelled = true;
        };
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
        appAlert(
            'Guarda la nota primero',
            (
            'Primero guarda la nota antes de '
            + 'compartirla.'
            ),
        );
        return;
        }

        if (!selectedRecipient) {
        appAlert(
            'Selecciona un destinatario',
            (
            'Busca y selecciona la persona con quien '
            + 'deseas compartir la nota.'
            ),
        );
        return;
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
            expires_at: null,
            },
        );

        appAlert(
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

        onShared(
            getRecipientName(selectedRecipient),
        );
        } catch (error) {
        appAlert(
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

                {!selectedRecipient ? (
                <SuggestedRecipientsRow
                    recipients={suggestedRecipients}
                    loading={loadingSuggestions}
                    onSelect={setSelectedRecipient}
                />
                ) : null}

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
                    suggestedCount={
                    suggestedRecipients.length
                    }
                    onSelect={setSelectedRecipient}
                />
                )}
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


function SuggestedRecipientsRow({
    recipients,
    loading,
    onSelect,
    }: {
    recipients: NoteShareRecipient[];
    loading: boolean;
    onSelect: (recipient: NoteShareRecipient) => void;
    }) {
    if (loading) {
        return (
        <View style={styles.suggestionsState}>
            <ActivityIndicator
            size="small"
            color={colors.brand.primary}
            />
        </View>
        );
    }

    if (recipients.length === 0) {
        return null;
    }

    return (
        <View style={styles.suggestionsWrap}>
        <Text style={styles.suggestionsLabel}>
            Contactos con seguimiento mutuo
        </Text>

        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
        >
            {recipients.map((recipient) => (
            <TouchableOpacity
                key={recipient.id}
                style={styles.suggestionChip}
                onPress={() => onSelect(recipient)}
                activeOpacity={0.8}
            >
                <View style={styles.suggestionAvatar}>
                <Text style={styles.suggestionAvatarText}>
                    {getRecipientInitials(recipient)}
                </Text>
                </View>

                <Text
                style={styles.suggestionName}
                numberOfLines={2}
                >
                {getRecipientShortName(recipient)}
                </Text>
            </TouchableOpacity>
            ))}
        </ScrollView>
        </View>
    );
}


function RecipientResults({
    query,
    recipients,
    loading,
    error,
    onSelect,
    suggestedCount,
    }: {
    query: string;
    recipients: NoteShareRecipient[];
    loading: boolean;
    error: string | null;
    onSelect: (recipient: NoteShareRecipient) => void;
    suggestedCount: number;
    }) {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
        return (
        <View style={styles.searchState}>
            <Text style={styles.searchStateText}>
            {suggestedCount > 0
                ? (
                'Toca una sugerencia arriba '
                + 'o escribe al menos 2 caracteres para buscar.'
                )
                : (
                'Escribe al menos 2 caracteres para buscar.'
                )}
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
    ).trim() || 'Usuario de Buddy';
}


function getRecipientShortName(
    recipient: NoteShareRecipient,
    ): string {
    const first = recipient.first_name?.trim();

    if (first) {
        return first;
    }

    return getRecipientName(recipient);
}


function getRecipientInitials(
    recipient: NoteShareRecipient,
    ): string {
    const first = recipient.first_name?.trim()?.[0] || '';
    const last = recipient.last_name?.trim()?.[0] || '';
    const initials = `${first}${last}`.toUpperCase();

    if (initials) {
        return initials;
    }

    return '?';
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
    suggestionsWrap: {
        marginBottom: 10,
    },
    suggestionsLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.neutral.gray600,
        marginBottom: 8,
    },
    suggestionsScroll: {
        gap: 10,
        paddingRight: 4,
    },
    suggestionsState: {
        alignItems: 'flex-start',
        marginBottom: 10,
        minHeight: 28,
    },
    suggestionChip: {
        alignItems: 'center',
        maxWidth: 78,
        width: 78,
    },
    suggestionAvatar: {
        alignItems: 'center',
        backgroundColor: colors.brand.primary + '15',
        borderColor: colors.brand.primary + '25',
        borderRadius: 24,
        borderWidth: 1,
        height: 48,
        justifyContent: 'center',
        marginBottom: 6,
        width: 48,
    },
    suggestionAvatarText: {
        color: colors.brand.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    suggestionName: {
        color: colors.neutral.text,
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
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