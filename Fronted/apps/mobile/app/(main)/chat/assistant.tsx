import {
  useCallback,
  useEffect,
  useRef,
  useState } from 'react';
import {
    ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { appAlert } from '../../../src/components/feedback/appAlert';
import { Bot, ChevronLeft, Mic, Send, Volume2 } from 'lucide-react-native';
import { colors, radii, spacing } from '@beeapp/design-system';
import {
    cancelAssistantAction,
    confirmAssistantAction,
    listAssistantMessages,
    sendAssistantMessage,
    speakAssistantText,
    transcribeAssistantAudio,
} from '@beeapp/api-client';
import type { AssistantCard, AssistantMessage } from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { getValidSessionCredentials } from '../../../src/services/authSession';
import { getBusinessCart } from '../../../src/features/buddyservices/cart/businessCartStore';
import { setChatConversationArchived } from '../../../src/stores/chatStore';
import {
    cancelAssistantRecording,
    playAssistantSpeech,
    startAssistantRecording,
    stopAssistantRecording,
} from '../../../src/services/assistantAudio';
import {
    validateVoiceRecordingDuration,
    validateVoiceTranscript,
} from '../../../src/services/voiceTranscriptValidation';

function errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'No se pudo completar la acción.';
}

function rememberedResolution(
    card: AssistantCard,
    localStatus?: 'confirmed' | 'cancelled',
): 'confirmed' | 'cancelled' | undefined {
    if (localStatus) return localStatus;
    const stored = String(card.resolved_status || '');
    if (stored === 'confirmed' || stored === 'cancelled') return stored;
    return undefined;
}

function providerName(item: Record<string, unknown>): string {
    return String(item.business_name || item.title || 'Proveedor');
}

const INLINE_MARK = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

function plainSpeech(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2')
        .replace(/`([^`]+)`/g, '$1');
}

function renderInline(line: string, light: boolean) {
    const color = light ? colors.neutral.white : colors.neutral.text;
    return line.split(INLINE_MARK).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <Text key={index} style={{ fontWeight: '700', color }}>
                    {part.slice(2, -2)}
                </Text>
            );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return (
                <Text key={index} style={{ fontStyle: 'italic', color }}>
                    {part.slice(1, -1)}
                </Text>
            );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <Text key={index} style={{ fontWeight: '600', color }}>
                    {part.slice(1, -1)}
                </Text>
            );
        }
        return (
            <Text key={index} style={{ color }}>
                {part}
            </Text>
        );
    });
}

function AssistantMessageText({ content, light }: { content: string; light?: boolean }) {
    const textStyle = [styles.bubbleText, light ? styles.bubbleTextUser : null];
    return (
        <View style={styles.messageBody}>
            {content.split('\n').map((line, index) => {
                const bullet = /^[-*]\s+/.test(line);
                const text = bullet ? line.replace(/^[-*]\s+/, '') : line;
                if (!bullet) {
                    return (
                        <Text key={index} style={textStyle}>
                            {line.length ? renderInline(text, Boolean(light)) : ' '}
                        </Text>
                    );
                }
                return (
                    <View key={index} style={styles.messageBulletRow}>
                        <Text style={textStyle}>•</Text>
                        <Text style={[textStyle, styles.messageBulletText]}>
                            {renderInline(text, Boolean(light))}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

function applyClientEffects(cards: AssistantCard[] | undefined): void {
    if (!Array.isArray(cards)) return;
    for (const card of cards) {
        if (card.type === 'client_effect' && card.effect === 'archive_chat' && card.conversation_id) {
            setChatConversationArchived(String(card.conversation_id), card.archived !== false);
        }
    }
}

export default function AssistantChatScreen() {
    const router = useModuleNav();
    const scrollRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [planBlock, setPlanBlock] = useState('');
    const [recording, setRecording] = useState(false);
    const [resolvedActions, setResolvedActions] = useState<Record<string, 'confirmed' | 'cancelled'>>({});
    const micBusyRef = useRef(false);

    const load = useCallback(async () => {
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') {
            setLoading(false);
            return;
        }
        const response = await listAssistantMessages(auth);
        setMessages(response.messages);
        setLoading(false);
    }, []);

    useEffect(() => {
        load().catch((error) => {
            setLoading(false);
            appAlert('Asistente', errorText(error));
        });
        return () => {
            void cancelAssistantRecording();
        };
    }, [load]);

    const send = useCallback(async (text: string) => {
        const message = text.trim();
        if (!message || sending) return;
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;

        const optimistic: AssistantMessage = {
            id: `local-${Date.now()}`,
            role: 'user',
            content: message,
            cards: [],
            created_at: new Date().toISOString(),
        };
        setMessages((current) => [...current, optimistic]);
        setDraft('');
        setSending(true);
        try {
            const response = await sendAssistantMessage(auth, message, false, {
                cart: getBusinessCart(),
            });
            applyClientEffects(response.cards);
            setMessages((current) => [...current, response.message]);
        } catch (error) {
            const message = errorText(error);
            if (/Límite:|Necesitas el plan/.test(message)) setPlanBlock(message);
            appAlert('Asistente', message);
        } finally {
            setSending(false);
        }
    }, [sending]);

    const toggleMic = useCallback(async () => {
        if (sending || micBusyRef.current || planBlock) return;
        micBusyRef.current = true;
        try {
            if (!recording) {
                await startAssistantRecording();
                setRecording(true);
                return;
            }
            setRecording(false);
            const { audioBase64, durationMs } = await stopAssistantRecording();
            const auth = await getValidSessionCredentials();
            if (!auth || auth.scheme !== 'Bearer') return;
            setSending(true);
            const durationCheck = validateVoiceRecordingDuration(durationMs);
            if (!durationCheck.ok) {
                setSending(false);
                appAlert('Voz', durationCheck.message);
                return;
            }
            const transcript = await transcribeAssistantAudio(
                auth,
                audioBase64,
            );
            const validation = validateVoiceTranscript(transcript.text);
            setSending(false);
            if (!validation.ok) {
                appAlert('Voz', validation.message);
                return;
            }
            await send(validation.text);
        } catch (error) {
            setRecording(false);
            setSending(false);
            const message = errorText(error);
            if (/Límite:|Necesitas el plan/.test(message)) setPlanBlock(message);
            appAlert('Voz', message);
        } finally {
            micBusyRef.current = false;
        }
    }, [recording, send, sending, planBlock]);

    const speak = useCallback(async (text: string) => {
        try {
            const auth = await getValidSessionCredentials();
            if (!auth || auth.scheme !== 'Bearer') return;
            const audio = await speakAssistantText(auth, text);
            await playAssistantSpeech(audio.audio_base64);
        } catch (error) {
            appAlert('Voz', errorText(error));
        }
    }, []);

    const resolveAction = useCallback(async (card: AssistantCard, confirm: boolean) => {
        const actionId = String(card.action_id || '');
        if (!actionId || resolvedActions[actionId]) return;
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;
        setSending(true);
        try {
            if (!confirm) {
                const cancelledRes = await cancelAssistantAction(auth, actionId);
                setResolvedActions((prev) => ({ ...prev, [actionId]: 'cancelled' }));
                if (cancelledRes.message) {
                    setMessages((current) => [...current, cancelledRes.message!]);
                } else {
                    setMessages((current) => [...current, {
                        id: `local-${Date.now()}`,
                        role: 'assistant',
                        content: 'Entendido, cancelé esa solicitud y no realicé ningún cambio.',
                        cards: [],
                        created_at: new Date().toISOString(),
                    }]);
                }
                return;
            }
            const response = await confirmAssistantAction(auth, actionId);
            setResolvedActions((prev) => ({ ...prev, [actionId]: 'confirmed' }));
            applyClientEffects(response.cards || response.message?.cards);
            if (response.message) setMessages((current) => [...current, response.message]);
        } catch (error) {
            const message = errorText(error);
            if (/Límite:|Necesitas el plan/.test(message)) setPlanBlock(message);
            appAlert('Asistente', message);
        } finally {
            setSending(false);
        }
    }, [resolvedActions]);

    const chooseProvider = useCallback((item: Record<string, unknown>) => {
        const name = providerName(item);
        const title = String(item.title || name);
        void send(
            `Elige el proveedor ${item.business_id} (${name}). Envía esta solicitud: Hola, me interesa ${title}.`,
        );
    }, [send]);

    return (
        <ScreenSafeArea style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <ChevronLeft size={24} color={colors.neutral.text} />
                    </TouchableOpacity>
                    <View style={styles.headerTitle}>
                        <Bot size={18} color={colors.brand.primary} />
                        <Text style={styles.title}>Asistente</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(main)/chat/ai-settings')}
                        style={styles.iconBtn}
                    >
                        <Text style={styles.settings}>Ajustes</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.threadWrap}>
                    {loading ? (
                        <View style={styles.loaderWrap}>
                            <ActivityIndicator
                                color={colors.brand.primary}
                                size="large"
                            />
                        </View>
                    ) : (
                        <ScrollView
                            ref={scrollRef}
                            contentContainerStyle={styles.thread}
                            keyboardShouldPersistTaps="handled"
                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        >
                            {messages.length === 0 ? (
                                <Text style={styles.empty}>
                                    Puedo consultar toda tu información en Buddy, leer y agendar en tus calendarios sincronizados, leer y enviar correos, crear notas, responder o gestionar tus chats y negocios, revisar tu carrito o reservas y buscar en Buddy Services.
                                </Text>
                            ) : null}
                            {messages.map((message) => (
                                <View key={message.id}>
                                    <View style={[
                                        styles.bubble,
                                        message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                                    ]}>
                                        <AssistantMessageText
                                            content={message.content}
                                            light={message.role === 'user'}
                                        />
                                        {message.role === 'assistant' ? (
                                            <TouchableOpacity onPress={() => void speak(plainSpeech(message.content))}>
                                                <Volume2 size={16} color={colors.brand.primary} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                    {(message.cards || []).map((card, index) => (
                                        <CardView
                                            key={`${message.id}-${index}`}
                                            card={card}
                                            busy={sending}
                                            resolvedStatus={rememberedResolution(
                                                card,
                                                card.action_id
                                                    ? resolvedActions[String(card.action_id)]
                                                    : undefined,
                                            )}
                                            onConfirm={(confirm) => void resolveAction(card, confirm)}
                                            onChoose={chooseProvider}
                                            onOpenChat={(id) => router.push({
                                                pathname: '/(main)/chat/conversation',
                                                params: { id, name: 'Proveedor', isGroup: 'false' },
                                            })}
                                        />
                                    ))}
                                </View>
                            ))}
                            {sending ? <Text style={styles.typing}>Pensando...</Text> : null}
                        </ScrollView>
                    )}
                </View>

                <View>
                    {planBlock ? (
                        <Text style={[styles.typing, { paddingHorizontal: 16, paddingTop: 8 }]}>{planBlock}</Text>
                    ) : null}
                    <View style={styles.composer}>
                    <TouchableOpacity style={styles.mic} onPress={() => void toggleMic()} disabled={Boolean(planBlock)}>
                        <Mic size={20} color={recording ? colors.semantic.error : colors.brand.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={recording ? 'Escuchando...' : 'Pídele algo al asistente'}
                        placeholderTextColor={colors.neutral.gray500}
                        editable={!sending && !recording && !planBlock}
                    />
                    <TouchableOpacity
                        style={styles.send}
                        onPress={() => void send(draft)}
                        disabled={sending || recording || Boolean(planBlock)}
                    >
                        <Send size={18} color={colors.neutral.white} />
                    </TouchableOpacity>
                </View>
                </View>
            </KeyboardAvoidingView>
        </ScreenSafeArea>
    );
}

function CardView({
    card,
    busy,
    resolvedStatus,
    onConfirm,
    onChoose,
    onOpenChat,
}: {
    card: AssistantCard;
    busy: boolean;
    resolvedStatus?: 'confirmed' | 'cancelled';
    onConfirm: (confirm: boolean) => void;
    onChoose: (item: Record<string, unknown>) => void;
    onOpenChat: (id: string) => void;
}) {
    if (card.type === 'confirm') {
        const details = Array.isArray(card.details) ? card.details : [];
        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    {String(card.title || 'Confirmar acción a realizar')}
                </Text>
                <Text style={styles.cardText}>{String(card.summary || '')}</Text>
                {details.length > 0 ? (
                    <View style={styles.detailsBox}>
                        {details.map((detail, idx) => (
                            <View key={`${detail.label}-${idx}`} style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{detail.label}:</Text>
                                <Text style={styles.detailValue}>{detail.value}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}
                {resolvedStatus ? (
                    <View style={[
                        styles.resolvedBadge,
                        resolvedStatus === 'confirmed' ? styles.resolvedConfirmed : styles.resolvedCancelled,
                    ]}>
                        <Text style={[
                            styles.resolvedBadgeText,
                            resolvedStatus === 'confirmed' ? styles.resolvedConfirmedText : styles.resolvedCancelledText,
                        ]}>
                            {resolvedStatus === 'confirmed' ? 'Acción ejecutada («Hazlo»)' : 'Acción cancelada («Cancela»)'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => onConfirm(false)}>
                            <Text style={styles.secondaryText}>Cancela</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primary} disabled={busy} onPress={() => onConfirm(true)}>
                            <Text style={styles.primaryText}>Hazlo</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    if (card.type === 'providers') {
        const items = Array.isArray(card.items) ? card.items : [];
        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Proveedores</Text>
                {items.map((item) => (
                    <View key={String(item.offer_id || item.business_id)} style={styles.provider}>
                        <View style={styles.flex}>
                            <Text style={styles.cardText}>{providerName(item)}</Text>
                            <Text style={styles.cardMuted}>
                                {String(item.title || '')}{item.city ? ` · ${String(item.city)}` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.primary} disabled={busy} onPress={() => onChoose(item)}>
                            <Text style={styles.primaryText}>Elegir</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    }

    if (card.type === 'event' || card.type === 'note') {
        const label = card.type === 'event' ? 'Agenda' : 'Nota';
        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.cardText}>
                    {String(card.title || card.summary || 'Listo')} · {String(card.action || '')}
                </Text>
            </View>
        );
    }

    if (card.type === 'request' && card.conversation_id) {
        return (
            <TouchableOpacity style={styles.card} onPress={() => onOpenChat(String(card.conversation_id))}>
                <Text style={styles.cardTitle}>Solicitud enviada</Text>
                <Text style={styles.cardText}>Abrir el chat con el proveedor</Text>
            </TouchableOpacity>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.neutral.gray50 },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        backgroundColor: colors.neutral.white,
        borderBottomWidth: 1,
        borderColor: colors.neutral.gray100,
    },
    headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
    settings: { color: colors.brand.primary, fontSize: 13, fontWeight: '600' },
    iconBtn: { padding: 8, minWidth: 64 },
    threadWrap: { flex: 1 },
    loaderWrap: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    thread: { padding: spacing.md, paddingBottom: 24, flexGrow: 1 },
    empty: { color: colors.neutral.gray600, textAlign: 'center', marginTop: 32, lineHeight: 20 },
    bubble: { maxWidth: '86%', borderRadius: radii.xl, padding: 12, marginBottom: 8 },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.brand.primary },
    bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: colors.neutral.white, gap: 8 },
    bubbleText: { color: colors.neutral.text, fontSize: 14, lineHeight: 20 },
    bubbleTextUser: { color: colors.neutral.white },
    messageBody: { gap: 2 },
    messageBulletRow: { flexDirection: 'row', gap: 6 },
    messageBulletText: { flex: 1 },
    typing: { color: colors.neutral.gray500, marginTop: 4 },
    card: {
        alignSelf: 'flex-start',
        backgroundColor: colors.neutral.white,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        padding: 12,
        marginBottom: 8,
        maxWidth: '92%',
        gap: 8,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: colors.brand.primary },
    cardText: { fontSize: 13, color: colors.neutral.text, lineHeight: 18 },
    cardMuted: { fontSize: 12, color: colors.neutral.gray600 },
    detailsBox: {
        backgroundColor: colors.neutral.gray50,
        borderRadius: radii.md,
        padding: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.neutral.gray100,
    },
    detailRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.neutral.gray700,
    },
    detailValue: {
        fontSize: 12,
        color: colors.neutral.text,
        flexShrink: 1,
    },
    resolvedBadge: {
        borderRadius: radii.md,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    resolvedConfirmed: {
        backgroundColor: '#ECFDF5',
    },
    resolvedCancelled: {
        backgroundColor: colors.neutral.gray100,
    },
    resolvedBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    resolvedConfirmedText: {
        color: '#047857',
    },
    resolvedCancelledText: {
        color: colors.neutral.gray600,
    },
    cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    provider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    primary: { backgroundColor: colors.brand.primary, borderRadius: radii.lg, paddingHorizontal: 16, paddingVertical: 9 },
    primaryText: { color: colors.neutral.white, fontWeight: '700', fontSize: 13 },
    secondary: { borderRadius: radii.lg, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.neutral.gray100 },
    secondaryText: { color: colors.neutral.text, fontWeight: '600', fontSize: 13 },
    composer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: colors.neutral.white,
        borderTopWidth: 1,
        borderColor: colors.neutral.gray100,
    },
    input: {
        flex: 1,
        backgroundColor: colors.neutral.gray50,
        borderRadius: radii.xl,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: colors.neutral.text,
    },
    mic: { padding: 8 },
    send: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
