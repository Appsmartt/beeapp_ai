import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
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

function providerName(item: Record<string, unknown>): string {
    return String(item.business_name || item.title || 'Proveedor');
}

export default function AssistantChatScreen() {
    const router = useModuleNav();
    const scrollRef = useRef<ScrollView>(null);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [recording, setRecording] = useState(false);

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
            Alert.alert('Asistente', errorText(error));
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
            const response = await sendAssistantMessage(auth, message);
            setMessages((current) => [...current, response.message]);
        } catch (error) {
            Alert.alert('Asistente', errorText(error));
        } finally {
            setSending(false);
        }
    }, [sending]);

    const toggleMic = useCallback(async () => {
        if (sending) return;
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
                Alert.alert('Voz', durationCheck.message);
                return;
            }
            const transcript = await transcribeAssistantAudio(
                auth,
                audioBase64,
            );
            const validation = validateVoiceTranscript(transcript.text);
            setSending(false);
            if (!validation.ok) {
                Alert.alert('Voz', validation.message);
                return;
            }
            await send(validation.text);
        } catch (error) {
            setRecording(false);
            setSending(false);
            Alert.alert('Voz', errorText(error));
        }
    }, [recording, send, sending]);

    const speak = useCallback(async (text: string) => {
        try {
            const auth = await getValidSessionCredentials();
            if (!auth || auth.scheme !== 'Bearer') return;
            const audio = await speakAssistantText(auth, text);
            await playAssistantSpeech(audio.audio_base64);
        } catch (error) {
            Alert.alert('Voz', errorText(error));
        }
    }, []);

    const resolveAction = useCallback(async (card: AssistantCard, confirm: boolean) => {
        const actionId = String(card.action_id || '');
        if (!actionId) return;
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;
        setSending(true);
        try {
            if (!confirm) {
                await cancelAssistantAction(auth, actionId);
                setMessages((current) => [...current, {
                    id: `local-${Date.now()}`,
                    role: 'assistant',
                    content: 'Cancelé esa acción.',
                    cards: [],
                    created_at: new Date().toISOString(),
                }]);
                return;
            }
            const response = await confirmAssistantAction(auth, actionId);
            if (response.message) setMessages((current) => [...current, response.message]);
        } catch (error) {
            Alert.alert('Asistente', errorText(error));
        } finally {
            setSending(false);
        }
    }, []);

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

                {loading ? (
                    <ActivityIndicator style={styles.loader} color={colors.brand.primary} />
                ) : (
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={styles.thread}
                        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    >
                        {messages.length === 0 ? (
                            <Text style={styles.empty}>
                                Puedo crear reuniones, anotar, buscar en la app y sugerirte proveedores.
                            </Text>
                        ) : null}
                        {messages.map((message) => (
                            <View key={message.id}>
                                <View style={[
                                    styles.bubble,
                                    message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                                ]}>
                                    <Text style={[
                                        styles.bubbleText,
                                        message.role === 'user' && styles.bubbleTextUser,
                                    ]}>
                                        {message.content}
                                    </Text>
                                    {message.role === 'assistant' ? (
                                        <TouchableOpacity onPress={() => void speak(message.content)}>
                                            <Volume2 size={16} color={colors.brand.primary} />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                {(message.cards || []).map((card, index) => (
                                    <CardView
                                        key={`${message.id}-${index}`}
                                        card={card}
                                        busy={sending}
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
                        {sending ? <Text style={styles.typing}>Escribiendo...</Text> : null}
                    </ScrollView>
                )}

                <View style={styles.composer}>
                    <TouchableOpacity style={styles.mic} onPress={() => void toggleMic()}>
                        <Mic size={20} color={recording ? colors.semantic.error : colors.brand.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={recording ? 'Escuchando...' : 'Pídele algo al asistente'}
                        placeholderTextColor={colors.neutral.gray500}
                        editable={!sending && !recording}
                    />
                    <TouchableOpacity
                        style={styles.send}
                        onPress={() => void send(draft)}
                        disabled={sending || recording}
                    >
                        <Send size={18} color={colors.neutral.white} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ScreenSafeArea>
    );
}

function CardView({
    card,
    busy,
    onConfirm,
    onChoose,
    onOpenChat,
}: {
    card: AssistantCard;
    busy: boolean;
    onConfirm: (confirm: boolean) => void;
    onChoose: (item: Record<string, unknown>) => void;
    onOpenChat: (id: string) => void;
}) {
    if (card.type === 'confirm') {
        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Confirmar</Text>
                <Text style={styles.cardText}>{String(card.summary || '')}</Text>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => onConfirm(false)}>
                        <Text style={styles.secondaryText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primary} disabled={busy} onPress={() => onConfirm(true)}>
                        <Text style={styles.primaryText}>Confirmar</Text>
                    </TouchableOpacity>
                </View>
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
    loader: { marginTop: 40 },
    thread: { padding: spacing.md, paddingBottom: 24 },
    empty: { color: colors.neutral.gray600, textAlign: 'center', marginTop: 32, lineHeight: 20 },
    bubble: { maxWidth: '86%', borderRadius: radii.xl, padding: 12, marginBottom: 8 },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.brand.primary },
    bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: colors.neutral.white, gap: 8 },
    bubbleText: { color: colors.neutral.text, fontSize: 14, lineHeight: 20 },
    bubbleTextUser: { color: colors.neutral.white },
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
    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.brand.primary },
    cardText: { fontSize: 13, color: colors.neutral.text },
    cardMuted: { fontSize: 12, color: colors.neutral.gray600 },
    cardActions: { flexDirection: 'row', gap: 8 },
    provider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    primary: { backgroundColor: colors.brand.primary, borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 8 },
    primaryText: { color: colors.neutral.white, fontWeight: '600', fontSize: 12 },
    secondary: { borderRadius: radii.lg, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.neutral.gray100 },
    secondaryText: { color: colors.neutral.text, fontSize: 12 },
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
