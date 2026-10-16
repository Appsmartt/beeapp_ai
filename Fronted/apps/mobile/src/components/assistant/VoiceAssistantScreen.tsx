import { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Mic, Pause, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
    getAssistantSettings,
    sendAssistantMessage,
    transcribeAssistantAudio,
} from '@beeapp/api-client';
import type { AssistantCard } from '@beeapp/shared-types';

import VoiceOrb, { OrbState } from './VoiceOrb';
import { voiceStyles as styles } from './voiceAssistantStyles';
import { getValidSessionCredentials } from '../../services/authSession';
import {
    cancelAssistantRecording,
    playAssistantSpeech,
    startAssistantRecording,
    stopAssistantRecording,
} from '../../services/assistantAudio';
import {
    validateVoiceRecordingDuration,
    validateVoiceTranscript,
} from '../../services/voiceTranscriptValidation';

interface VoiceAssistantScreenProps {
    visible: boolean;
    onClose: () => void;
}

interface Line {
    speaker: 'user' | 'assistant';
    text: string;
}

const STATE_LABEL: Record<OrbState, string> = {
    idle: 'Toca el micrófono para hablar',
    listening: 'Escuchando...',
    thinking: 'Pensando...',
    speaking: 'Respondiendo',
};

function providersOf(cards: AssistantCard[]): Array<Record<string, unknown>> {
    return cards.flatMap((card) => (
        card.type === 'providers' && Array.isArray(card.items) ? card.items : []
    ));
}

export default function VoiceAssistantScreen({ visible, onClose }: VoiceAssistantScreenProps) {
    const router = useRouter();
    const [phase, setPhase] = useState<OrbState>('idle');
    const [history, setHistory] = useState<Line[]>([]);
    const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const busy = phase === 'thinking' || phase === 'speaking';

    useEffect(() => {
        if (!visible) {
            void cancelAssistantRecording();
            setPhase('idle');
            return undefined;
        }

        let cancelled = false;
        const open = async () => {
            const auth = await getValidSessionCredentials();
            if (!auth || auth.scheme !== 'Bearer' || cancelled) return;
            try {
                const response = await getAssistantSettings(auth);
                if (cancelled || !response.settings.voice_activation) return;
                await startAssistantRecording();
                if (!cancelled) setPhase('listening');
            } catch (error) {
                if (!cancelled) {
                    setNotice(error instanceof Error ? error.message : 'No pude iniciar el micrófono.');
                }
            }
        };
        void open();
        return () => {
            cancelled = true;
            void cancelAssistantRecording();
        };
    }, [visible]);

    const ask = async (text: string) => {
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;
        setPhase('thinking');
        setHistory((current) => [...current, { speaker: 'user', text }]);
        const response = await sendAssistantMessage(auth, text, true);
        const answer = response.message?.content || 'Listo.';
        setHistory((current) => [...current, { speaker: 'assistant', text: answer }]);
        const cards = response.cards || response.message?.cards || [];
        setProviders(providersOf(cards));
        const request = cards.find((card) => card.type === 'request' && card.conversation_id);
        setConversationId(request?.conversation_id ? String(request.conversation_id) : null);
        if (response.audio_base64) {
            setPhase('speaking');
            await playAssistantSpeech(response.audio_base64);
        }
        setPhase('idle');
    };

    const handleMic = async () => {
        if (busy) return;
        setNotice('');
        try {
            if (phase !== 'listening') {
                await startAssistantRecording();
                setPhase('listening');
                return;
            }
            const { audioBase64, durationMs } = await stopAssistantRecording();
            setPhase('thinking');
            const durationCheck = validateVoiceRecordingDuration(durationMs);
            if (!durationCheck.ok) {
                setNotice(durationCheck.message);
                setPhase('idle');
                return;
            }
            const auth = await getValidSessionCredentials();
            if (!auth || auth.scheme !== 'Bearer') {
                setPhase('idle');
                return;
            }
            const transcript = await transcribeAssistantAudio(
                auth,
                audioBase64,
            );
            const validation = validateVoiceTranscript(transcript.text);
            if (!validation.ok) {
                setNotice(validation.message);
                setPhase('idle');
                return;
            }
            await ask(validation.text);
        } catch (error) {
            setPhase('idle');
            setNotice(error instanceof Error ? error.message : 'No se pudo usar la voz.');
        }
    };

    const chooseProvider = (item: Record<string, unknown>) => {
        const name = String(item.business_name || item.title || 'el proveedor');
        void ask(
            `Elige el proveedor ${item.business_id} (${name}). Envía esta solicitud: Hola, me interesa ${String(item.title || name)}.`,
        ).catch((error) => {
            setPhase('idle');
            setNotice(error instanceof Error ? error.message : 'No se pudo contactar al proveedor.');
        });
    };

    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.screen}>
                <View style={styles.topBar}>
                    <View style={styles.brandRow}>
                        <View style={[styles.statusDot, phase !== 'idle' && styles.statusDotActive]} />
                        <Text style={styles.brandText}>Asistente Buddy AI</Text>
                    </View>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                        <X size={20} color="#EDE9FE" />
                    </TouchableOpacity>
                </View>

                <View style={styles.orbArea}>
                    <VoiceOrb state={phase} />
                    <Text style={styles.stateLabel}>{STATE_LABEL[phase]}</Text>
                </View>

                <ScrollView
                    ref={scrollRef}
                    style={styles.transcript}
                    contentContainerStyle={styles.transcriptContent}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                    {history.map((line, index) => (
                        <View key={`${line.speaker}-${index}`} style={styles.lineBlock}>
                            <Text style={line.speaker === 'user' ? styles.speakerUser : styles.speakerAssistant}>
                                {line.speaker === 'user' ? 'Tú' : 'Buddy AI'}
                            </Text>
                            <Text style={[styles.lineText, styles.linePast]}>{line.text}</Text>
                        </View>
                    ))}
                    {providers.map((item) => (
                        <TouchableOpacity
                            key={String(item.offer_id || item.business_id)}
                            onPress={() => chooseProvider(item)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.lineText}>
                                Elegir {String(item.business_name || item.title)}
                                {item.city ? ` · ${String(item.city)}` : ''}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {conversationId ? (
                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                router.push({
                                    pathname: '/(main)/chat/conversation',
                                    params: { id: conversationId, name: 'Proveedor', isGroup: 'false' },
                                });
                            }}
                        >
                            <Text style={styles.lineText}>Abrir el chat con el proveedor</Text>
                        </TouchableOpacity>
                    ) : null}
                    {notice ? <Text style={styles.lineText}>{notice}</Text> : null}
                </ScrollView>

                <View style={styles.controls}>
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => {
                            setHistory([]);
                            setProviders([]);
                            setNotice('');
                            setPhase('idle');
                        }}
                        activeOpacity={0.7}
                    >
                        <RotateCcw size={20} color="#EDE9FE" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.micBtn, phase === 'listening' && styles.micBtnActive]}
                        onPress={() => void handleMic()}
                        activeOpacity={0.85}
                    >
                        {phase === 'listening'
                            ? <Pause size={28} color="#FFFFFF" />
                            : <Mic size={30} color="#FFFFFF" />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
                        <X size={20} color="#EDE9FE" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.footerHint}>Toca para hablar. La palabra clave permanente no está disponible.</Text>
            </View>
        </Modal>
    );
}
