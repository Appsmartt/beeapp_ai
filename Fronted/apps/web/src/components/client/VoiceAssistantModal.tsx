'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mic, Square, X } from 'lucide-react';
import type { AssistantCard } from '@beeapp/shared-types';
import {
  cancelAssistantAction,
  confirmAssistantAction,
  getAssistantSettings,
  sendAssistantMessage,
  transcribeAssistantAudio,
} from '@beeapp/api-client';
import {
  applyAssistantClientEffects,
  assistantSendContext,
  buildChooseProviderMessage,
  playAssistantAudio,
  providerDisplayName,
} from '@/lib/client/assistantChat';
import { startBrowserRecording, type BrowserRecording } from '@/lib/client/assistantAudio';
import { getWebAuth } from '@/lib/client/liveData';
import {
  validateVoiceRecordingDuration,
  validateVoiceTranscript,
} from '@/lib/client/voiceTranscriptValidation';
import VoiceOrb from './VoiceOrb';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

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

export default function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<OrbState>('idle');
  const [history, setHistory] = useState<Line[]>([]);
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<AssistantCard[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const recordingRef = useRef<BrowserRecording | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const busy = phase === 'thinking' || phase === 'speaking';

  useEffect(() => {
    if (!isOpen) {
      recordingRef.current?.cancel();
      recordingRef.current = null;
      audioRef.current?.pause();
      setPhase('idle');
      return undefined;
    }

    let cancelled = false;
    const open = async () => {
      try {
        const auth = await getWebAuth();
        const response = await getAssistantSettings(auth);
        if (cancelled || !response.settings.voice_activation) return;
        const recording = await startBrowserRecording();
        if (cancelled) {
          recording.cancel();
          return;
        }
        recordingRef.current = recording;
        setPhase('listening');
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'No pude iniciar el micrófono.');
        }
      }
    };
    void open();
    return () => {
      cancelled = true;
      recordingRef.current?.cancel();
      recordingRef.current = null;
    };
  }, [isOpen]);

  const playReply = async (audioBase64: string, mime?: string) => {
    audioRef.current?.pause();
    setPhase('speaking');
    const audio = await playAssistantAudio(audioBase64, mime);
    audioRef.current = audio;
    await new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => resolve(), { once: true });
    });
  };

  const ask = async (text: string) => {
    const auth = await getWebAuth();
    setPhase('thinking');
    setHistory((current) => [...current, { speaker: 'user', text }]);
    const response = await sendAssistantMessage(auth, text, true, assistantSendContext());
    const answer = response.message?.content || 'Listo.';
    setHistory((current) => [...current, { speaker: 'assistant', text: answer }]);
    const cards = response.cards || response.message?.cards || [];
    applyAssistantClientEffects(cards);
    setProviders(providersOf(cards));
    setPendingConfirmations(cards.filter((card) => card.type === 'confirm' && card.action_id));
    const request = cards.find((card) => card.type === 'request' && card.conversation_id);
    setConversationId(request?.conversation_id ? String(request.conversation_id) : null);
    if (response.audio_base64) {
      await playReply(response.audio_base64, response.audio_mime);
    }
    setPhase('idle');
  };

  const handleConfirmCard = async (card: AssistantCard, confirm: boolean) => {
    const actionId = String(card.action_id || '');
    if (!actionId || busy) return;
    const auth = await getWebAuth();
    setPhase('thinking');
    try {
      if (!confirm) {
        const cancelled = await cancelAssistantAction(auth, actionId);
        setPendingConfirmations((current) => current.filter((item) => item.action_id !== actionId));
        setHistory((current) => [...current, {
          speaker: 'assistant',
          text: cancelled.message?.content || 'Entendido, cancelé esa solicitud.',
        }]);
        setPhase('idle');
        return;
      }
      const response = await confirmAssistantAction(auth, actionId);
      setPendingConfirmations((current) => current.filter((item) => item.action_id !== actionId));
      applyAssistantClientEffects(response.cards || response.message?.cards);
      if (response.message?.content) {
        setHistory((current) => [...current, {
          speaker: 'assistant',
          text: response.message.content,
        }]);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo procesar la confirmación.');
    } finally {
      setPhase('idle');
    }
  };

  const handleMic = async () => {
    if (busy) return;
    setNotice('');
    try {
      if (phase !== 'listening') {
        recordingRef.current = await startBrowserRecording();
        setPhase('listening');
        return;
      }
      const clip = await recordingRef.current?.stop();
      recordingRef.current = null;
      setPhase('thinking');
      if (!clip) {
        setPhase('idle');
        return;
      }
      const durationCheck = validateVoiceRecordingDuration(clip.durationMs);
      if (!durationCheck.ok) {
        setNotice(durationCheck.message);
        setPhase('idle');
        return;
      }
      const auth = await getWebAuth();
      const transcript = await transcribeAssistantAudio(auth, clip.audioBase64, clip.mime);
      const validation = validateVoiceTranscript(transcript.text);
      if (!validation.ok) {
        setNotice(validation.message);
        setPhase('idle');
        return;
      }
      await ask(validation.text);
    } catch (error) {
      recordingRef.current?.cancel();
      recordingRef.current = null;
      setPhase('idle');
      setNotice(error instanceof Error ? error.message : 'No se pudo usar la voz.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/20" onClick={onClose} role="presentation">
      <div
        className="fixed inset-y-0 left-0 flex w-[35vw] min-w-[360px] max-w-[620px] flex-col bg-[#1B0B3A] pt-9 pb-7 shadow-[12px_0_35px_rgba(15,5,35,0.45)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Asistente Buddy AI"
      >
        <div className="flex shrink-0 items-center justify-between px-5">
          <span className="text-[13px] font-semibold tracking-[0.3px] text-[#EDE9FE]">Asistente Buddy AI</span>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(237,233,254,0.12)] text-[#EDE9FE]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex shrink-0 flex-col items-center px-8 text-center">
          <VoiceOrb state={phase} />
          <p className="mt-3 text-sm text-[#C4B5FD]">{STATE_LABEL[phase]}</p>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4">
          {history.length === 0 ? (
            <p className="text-center text-sm text-[#C4B5FD]">Toca el micrófono para hablar. La palabra clave permanente no está disponible.</p>
          ) : null}
          {history.map((line, index) => (
            <div key={`${line.speaker}-${index}`}>
              <p className={`text-[11px] font-semibold ${line.speaker === 'user' ? 'text-[#DDD6FE]' : 'text-white'}`}>
                {line.speaker === 'user' ? 'Tú' : 'Buddy AI'}
              </p>
              <p className="text-sm leading-6 text-white/90">{line.text}</p>
            </div>
          ))}
          {pendingConfirmations.map((card) => {
            const details = Array.isArray(card.details) ? card.details : [];
            return (
              <div key={String(card.action_id)} className="rounded-2xl bg-white/10 p-3 text-left">
                <p className="text-sm font-semibold text-white">{String(card.title || 'Confirmar acción a realizar')}</p>
                {card.summary ? <p className="mt-1 text-xs text-[#EDE9FE]">{String(card.summary)}</p> : null}
                {details.map((detail, index) => (
                  <p key={`${detail.label}-${index}`} className="mt-1 text-xs text-[#DDD6FE]">
                    {detail.label}: {detail.value}
                  </p>
                ))}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConfirmCard(card, false)}
                    className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Cancela
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConfirmCard(card, true)}
                    className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Hazlo
                  </button>
                </div>
              </div>
            );
          })}
          {providers.map((item) => (
            <button
              key={String(item.offer_id || item.business_id)}
              type="button"
              onClick={() => {
                void ask(buildChooseProviderMessage(item)).catch((error) => {
                  setPhase('idle');
                  setNotice(error instanceof Error ? error.message : 'No se pudo contactar al proveedor.');
                });
              }}
              className="block w-full rounded-xl bg-white/10 px-3 py-2 text-left text-sm text-white"
            >
              Elegir {providerDisplayName(item)}
              {item.city ? ` · ${String(item.city)}` : ''}
            </button>
          ))}
          {conversationId ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/app?openChat=${encodeURIComponent(conversationId)}`);
              }}
              className="text-sm font-semibold text-[#EDE9FE] underline"
            >
              Abrir el chat con el proveedor
            </button>
          ) : null}
          {notice ? <p className="text-xs text-red-300">{notice}</p> : null}
        </div>

        <div className="flex justify-center px-8 pb-2">
          {phase === 'thinking' ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#C4B5FD]" />
          ) : (
            <button
              type="button"
              onClick={() => void handleMic()}
              disabled={phase === 'speaking'}
              className={`flex h-14 w-14 items-center justify-center rounded-full text-white ${
                phase === 'listening' ? 'bg-red-500' : 'bg-brand-primary'
              } disabled:opacity-40`}
              aria-label={phase === 'listening' ? 'Detener' : 'Hablar'}
            >
              {phase === 'listening' ? <Square className="h-5 w-5" /> : <Mic className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
