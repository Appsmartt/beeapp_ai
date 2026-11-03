import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    colors,
    radii,
    spacing,
} from '@beeapp/design-system';
import {
    getNoteOutgoingShares,
    getSentNoteShares,
    revokeNoteShare,
} from '@beeapp/api-client';
import type { NoteShare } from '@beeapp/shared-types';
import { Share2, UserRound, XCircle } from 'lucide-react-native';

import { appAlert } from '../feedback/appAlert';
import {
    formatNoteShareProfileName,
} from '../../services/notesService';
import {
    getValidSessionCredentials,
} from '../../services/authSession';

interface NoteOutgoingSharesSectionProps {
    noteId: string;
    refreshToken?: number;
    fallbackSharedWithNames?: string[];
    variant?: 'card' | 'inline';
    onSharesChanged?: () => void;
}

export default function NoteOutgoingSharesSection({
    noteId,
    refreshToken = 0,
    fallbackSharedWithNames = [],
    variant = 'inline',
    onSharesChanged,
}: NoteOutgoingSharesSectionProps) {
    const [shares, setShares] = useState<NoteShare[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingShareId, setRevokingShareId] = useState<
        string | null
    >(null);

    const loadShares = useCallback(async () => {
        setLoading(true);

        try {
            const auth = await getValidSessionCredentials();

            if (!auth) {
                return;
            }

            try {
                const response = await getNoteOutgoingShares(
                    auth,
                    noteId,
                    {
                        limit: 50,
                        offset: 0,
                    },
                );

                setShares(response.shares);
            } catch {
                const sentResponse = await getSentNoteShares(
                    auth,
                    {
                        limit: 100,
                        offset: 0,
                    },
                );

                setShares(
                    sentResponse.shares.filter(
                        (share) => share.note_id === noteId,
                    ),
                );
            }
        } catch {
            setShares([]);
        } finally {
            setLoading(false);
        }
    }, [noteId]);

    useEffect(() => {
        void loadShares();
    }, [loadShares, refreshToken]);

    const handleRevoke = (share: NoteShare) => {
        const recipientName = formatNoteShareProfileName(
            share.shared_with,
        );

        appAlert(
            'Dejar de compartir',
            (
                `¿Quieres revocar el acceso de ${recipientName}? `
                + 'Ya no podrá ver esta nota.'
            ),
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Revocar',
                    style: 'destructive',
                    onPress: () => {
                        void confirmRevoke(share.id);
                    },
                },
            ],
        );
    };

    const confirmRevoke = async (shareId: string) => {
        setRevokingShareId(shareId);

        try {
            const auth = await getValidSessionCredentials();

            if (!auth) {
                throw new Error(
                    'Tu sesión expiró. Inicia sesión nuevamente.',
                );
            }

            await revokeNoteShare(auth, shareId);
            await loadShares();
            onSharesChanged?.();
        } catch (revokeError) {
            appAlert(
                'No fue posible revocar',
                revokeError instanceof Error
                    ? revokeError.message
                    : 'Intenta nuevamente.',
            );
        } finally {
            setRevokingShareId(null);
        }
    };

    const shareEntries = shares
        .map((share) => {
            const name = formatNoteShareProfileName(
                share.shared_with,
            );

            return {
                key: share.id,
                name,
                share,
            };
        })
        .filter((entry) => Boolean(entry.name.trim()));

    const fallbackEntries = fallbackSharedWithNames
        .filter((name) => Boolean(name.trim()))
        .filter(
            (name) => !shareEntries.some(
                (entry) => entry.name === name,
            ),
        )
        .map((name) => ({
            key: `fallback-${name}`,
            name,
            share: null as NoteShare | null,
        }));

    const entries = [...shareEntries, ...fallbackEntries];

    if (loading && entries.length === 0) {
        return null;
    }

    if (entries.length === 0) {
        return null;
    }

    if (variant === 'inline') {
        return (
            <View style={styles.inlineWrap}>
                <Text style={styles.inlineLabel}>
                    Compartida con
                </Text>

                <View style={styles.inlineChips}>
                    {entries.map((entry) => {
                        const isRevoking = entry.share
                            && revokingShareId === entry.share.id;

                        return (
                            <View
                                key={entry.key}
                                style={styles.inlineChip}
                            >
                                <Share2
                                    size={12}
                                    color="#0F766E"
                                />

                                <Text
                                    style={styles.inlineChipText}
                                    numberOfLines={1}
                                >
                                    {entry.name}
                                </Text>

                                {entry.share ? (
                                    <TouchableOpacity
                                        onPress={() => {
                                            handleRevoke(entry.share!);
                                        }}
                                        style={styles.inlineRevoke}
                                        disabled={Boolean(isRevoking)}
                                        hitSlop={8}
                                        accessibilityLabel={
                                            `Dejar de compartir con ${entry.name}`
                                        }
                                    >
                                        {isRevoking ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={
                                                    colors.semantic.error
                                                }
                                            />
                                        ) : (
                                            <XCircle
                                                size={14}
                                                color={
                                                    colors.semantic.error
                                                }
                                            />
                                        )}
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Share2
                    size={15}
                    color={colors.brand.primary}
                />

                <Text style={styles.title}>
                    Compartida con
                </Text>
            </View>

            {shareEntries.map((entry) => {
                const isRevoking = revokingShareId === entry.share!.id;

                return (
                    <View
                        key={entry.key}
                        style={styles.shareRow}
                    >
                        <View style={styles.avatar}>
                            <UserRound
                                size={16}
                                color={colors.neutral.gray600}
                            />
                        </View>

                        <Text
                            style={styles.recipientName}
                            numberOfLines={1}
                        >
                            {entry.name}
                        </Text>

                        <TouchableOpacity
                            onPress={() => handleRevoke(entry.share!)}
                            style={styles.revokeBtn}
                            disabled={isRevoking}
                            accessibilityLabel={
                                `Dejar de compartir con ${entry.name}`
                            }
                            activeOpacity={0.7}
                        >
                            {isRevoking ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.semantic.error}
                                />
                            ) : (
                                <XCircle
                                    size={18}
                                    color={colors.semantic.error}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        padding: spacing.sm,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        backgroundColor: colors.neutral.gray50,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.neutral.text,
    },
    shareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.neutral.white,
    },
    recipientName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: colors.neutral.text,
    },
    revokeBtn: {
        padding: 4,
    },
    inlineWrap: {
        marginBottom: 14,
    },
    inlineLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral.gray600,
        marginBottom: 7,
    },
    inlineChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    inlineChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        maxWidth: '100%',
        borderWidth: 1,
        borderColor: '#99F6E4',
        borderRadius: radii.full,
        paddingVertical: 5,
        paddingHorizontal: 9,
        backgroundColor: '#F0FDFA',
    },
    inlineChipText: {
        flexShrink: 1,
        fontSize: 11,
        fontWeight: '600',
        color: '#0F766E',
    },
    inlineRevoke: {
        marginLeft: 2,
    },
});
