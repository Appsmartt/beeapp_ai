
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { X, Mic, Pause, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import VoiceOrb, { OrbState } from './VoiceOrb';
import { VOICE_CONVERSATION } from '../../mocks/voiceAssistant';
import { voiceStyles as styles } from './voiceAssistantStyles';
import { MOCK_CHATS } from '../../mocks/chats';
import AiCatalogModal from '../chat/AiCatalogModal';

interface VoiceAssistantScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface Line {
  speaker: 'user' | 'assistant';
  text: string;
}

const USER_WORD_MS = 130;
const ASSISTANT_WORD_MS = 90;
const THINKING_MS = 900;

const STATE_LABEL: Record<OrbState, string> = {
  idle: 'Toca el micrófono para hablar',
  listening: 'Escuchando...',
  thinking: 'Pensando...',
  speaking: 'Respondiendo',
};

/**
 * Immersive voice-only assistant. Simulates a spoken conversation: the user's
 * voice is transcribed word by word, the assistant answers transcribed too.
 * No keyboard, no chat bubbles — everything is mock.
 */
export default function VoiceAssistantScreen({ visible, onClose }: VoiceAssistantScreenProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<OrbState>('idle');
  const [turnIndex, setTurnIndex] = useState(0);
  const [history, setHistory] = useState<Line[]>([]);
  const [current, setCurrent] = useState<Line | null>(null);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-start listening when the experience opens
  useEffect(() => {
    if (visible) {
      setPhase('listening');
      setTurnIndex(0);
      setHistory([]);
      setCurrent(null);
    } else {
      setPhase('idle');
    }
  }, [visible]);

  // Word-by-word transcription of whichever side is "talking"
  useEffect(() => {
    if (!visible) return;
    if (phase !== 'listening' && phase !== 'speaking') return;

    const turn = VOICE_CONVERSATION[turnIndex % VOICE_CONVERSATION.length];
    const speaker: Line['speaker'] = phase === 'listening' ? 'user' : 'assistant';
    const words = (speaker === 'user' ? turn.user : turn.assistant).split(' ');
    let i = 0;

    setCurrent({ speaker, text: '' });
    const id = setInterval(
      () => {
        i += 1;
        setCurrent({ speaker, text: words.slice(0, i).join(' ') });
        if (i >= words.length) {
          clearInterval(id);
          const finished: Line = { speaker, text: words.join(' ') };
          setTimeout(() => {
            setHistory((h) => [...h, finished]);
            setCurrent(null);
            if (speaker === 'user') {
              setPhase('thinking');
            } else {
              setPhase('idle');
              if (turn.showCatalog) {
                setTimeout(() => {
                  setCatalogVisible(true);
                }, 500);
              }
              setTurnIndex((t) => t + 1);
            }
          }, 350);
        }
      },
      speaker === 'user' ? USER_WORD_MS : ASSISTANT_WORD_MS
    );

    return () => clearInterval(id);
  }, [phase, turnIndex, visible]);

  // Short "thinking" pause between hearing and answering
  useEffect(() => {
    if (phase !== 'thinking') return;
    const id = setTimeout(() => setPhase('speaking'), THINKING_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const handleMic = () => {
    if (phase === 'idle') {
      setPhase('listening');
    } else {
      // Pause: keep what has been transcribed so far
      if (current && current.text) setHistory((h) => [...h, current]);
      setCurrent(null);
      setPhase('idle');
    }
  };

  const handleRestart = () => {
    setHistory([]);
    setCurrent(null);
    setTurnIndex(0);
    setPhase('listening');
  };

  const handleContactSeller = (result: any) => {
    setCatalogVisible(false);
    onClose(); // Close the voice screen

    // Check if chat already exists
    let existingChat = MOCK_CHATS.find((c) => c.name === result.sellerName);
    const initialText = `Hola, me interesa tu servicio de ${result.productName} que encontré en BeeApp.`;
    
    if (!existingChat) {
      // Create new chat
      const newChatId = 'seller_' + Date.now().toString(36);
      existingChat = {
        id: newChatId,
        name: result.sellerName,
        lastMessage: initialText,
        time: 'Ahora',
        unreadCount: 0,
        isGroup: false,
        status: 'sent',
        online: true,
        verified: result.sellerVerified,
      };
      MOCK_CHATS.push(existingChat);
    } else {
      existingChat.lastMessage = initialText;
    }

    // Now navigate to conversation screen with the new/existing chat
    router.replace({
      pathname: '/(main)/chat/conversation',
      params: {
        id: existingChat.id,
        name: existingChat.name,
        isGroup: 'false',
        online: 'true',
        initialMessage: initialText,
      },
    });
  };

  const isTalking = phase === 'listening' || phase === 'speaking';

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={[styles.statusDot, isTalking && styles.statusDotActive]} />
            <Text style={styles.brandText}>Asistente BeeAI</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color="#EDE9FE" />
          </TouchableOpacity>
        </View>

        {/* Animated organic visual */}
        <View style={styles.orbArea}>
          <VoiceOrb state={phase} />
          <Text style={styles.stateLabel}>{STATE_LABEL[phase]}</Text>
        </View>

        {/* Spoken conversation, transcribed (no bubbles) */}
        <ScrollView
          ref={scrollRef}
          style={styles.transcript}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {history.map((line, idx) => (
            <View key={idx} style={styles.lineBlock}>
              <Text style={line.speaker === 'user' ? styles.speakerUser : styles.speakerAssistant}>
                {line.speaker === 'user' ? 'Tú' : 'BeeAI'}
              </Text>
              <Text style={[styles.lineText, styles.linePast]}>{line.text}</Text>
            </View>
          ))}

          {current && (
            <View style={styles.lineBlock}>
              <Text style={current.speaker === 'user' ? styles.speakerUser : styles.speakerAssistant}>
                {current.speaker === 'user' ? 'Tú' : 'BeeAI'}
              </Text>
              <Text style={[styles.lineText, styles.lineActive]}>
                {current.text}
                <Text style={styles.caret}> |</Text>
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Minimal voice controls: restart / mic / close */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleRestart} activeOpacity={0.7}>
            <RotateCcw size={20} color="#EDE9FE" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.micBtn, isTalking && styles.micBtnActive]}
            onPress={handleMic}
            activeOpacity={0.85}
          >
            {isTalking ? <Pause size={28} color="#FFFFFF" /> : <Mic size={30} color="#FFFFFF" />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color="#EDE9FE" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerHint}>
          {Platform.OS === 'web' ? 'Experiencia de voz simulada' : 'Habla con naturalidad, te escucho'}
        </Text>

        <AiCatalogModal
          visible={catalogVisible}
          onClose={() => setCatalogVisible(false)}
          onContact={handleContactSeller}
        />
      </View>
    </Modal>
  );
}
